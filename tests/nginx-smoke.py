"""Run real nginx HTTP/TLS tests with isolated paths and a local stub upstream.
Usage: NGINX_BIN=/path/to/nginx python tests/nginx-smoke.py
Requires Python 3, openssl and nginx with SSL/HTTP2; no production certificates.
"""
import http.client
import http.server
import json
import os
from pathlib import Path
import socket
import ssl
import subprocess
import tempfile
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
NGINX = os.environ.get('NGINX_BIN', 'nginx')

def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

class Upstream(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'public, max-age=31536000, immutable' if self.path.startswith('/_next/static/') else 'no-store')
        self.end_headers()
        self.wfile.write(json.dumps(dict(self.headers)).encode())
    def log_message(self, *args):
        pass

with tempfile.TemporaryDirectory(prefix='jackexe-nginx-') as temp:
    temp = Path(temp)
    (temp / 'conf.d').mkdir()
    (temp / 'logs').mkdir()
    webroot = temp / 'webroot/.well-known/acme-challenge'
    webroot.mkdir(parents=True)
    (webroot / 'probe').write_text('acme-ok')
    cert = temp / 'fullchain.pem'
    key = temp / 'privkey.pem'
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=portfolio.test', '-keyout', str(key), '-out', str(cert)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    upstream = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Upstream)
    threading.Thread(target=upstream.serve_forever, daemon=True).start()
    http_port, tls_port = free_port(), free_port()
    mime_candidates = [Path('/etc/nginx/mime.types'), Path(NGINX).resolve().parent.parent / 'conf/mime.types']
    mime = next((p for p in mime_candidates if p.exists()), None)
    assert mime, 'nginx mime.types not found'
    def render(text):
        return (text.replace('/etc/nginx/mime.types', str(mime))
            .replace('/etc/nginx/conf.d', str(temp / 'conf.d'))
            .replace('/etc/nginx/snippets', str(temp / 'snippets'))
            .replace('/etc/letsencrypt/live/portfolio/fullchain.pem', str(cert))
            .replace('/etc/letsencrypt/live/portfolio/privkey.pem', str(key))
            .replace('/var/www/certbot', str(temp / 'webroot'))
            .replace('/tmp/nginx.pid', str(temp / 'nginx.pid'))
            .replace('/tmp/client_temp', str(temp / 'client_temp'))
            .replace('/tmp/proxy_temp', str(temp / 'proxy_temp'))
            .replace('/tmp/fastcgi_temp', str(temp / 'fastcgi_temp'))
            .replace('/tmp/uwsgi_temp', str(temp / 'uwsgi_temp'))
            .replace('/tmp/scgi_temp', str(temp / 'scgi_temp'))
            .replace('nextjs:3000', f'127.0.0.1:{upstream.server_port}')
            .replace('listen 8080', f'listen {http_port}')
            .replace('listen 8443', f'listen {tls_port}')
            .replace('${SITE_DOMAIN}', 'portfolio.test')
            .replace('access_log /dev/stdout;', f'access_log {temp}/access.log;'))
    (temp / 'snippets').mkdir()
    for p in (ROOT / 'nginx/snippets').glob('*.conf'):
        (temp / 'snippets' / p.name).write_text(render(p.read_text()))
    config = temp / 'nginx.conf'
    # Container execution is unprivileged; single-process mode avoids UID changes
    # when this smoke test runs as root in a restricted test environment.
    test_prefix = 'master_process off;\n' + ('user root root;\n' if os.geteuid() == 0 else '')
    config.write_text(test_prefix + render((ROOT / 'nginx/nginx.conf').read_text()))
    def request(path='/', tls=False, method='GET', headers=None):
        context = ssl._create_unverified_context()  # Test-only self-signed cert.
        conn = http.client.HTTPSConnection('127.0.0.1', tls_port, context=context, timeout=3) if tls else http.client.HTTPConnection('127.0.0.1', http_port, timeout=3)
        conn.request(method, path, headers=headers or {})
        response = conn.getresponse()
        result = response.status, dict((k.lower(), v) for k, v in response.getheaders()), response.read()
        conn.close()
        return result
    def run_template(name, verify):
        (temp / 'conf.d/default.conf').write_text(render((ROOT / f'nginx/templates/{name}.conf.template').read_text()))
        subprocess.run([NGINX, '-p', str(temp), '-c', str(config), '-t'], check=True, stdout=subprocess.DEVNULL, stderr=None)
        with open(temp / 'stderr.log', 'w') as err:
            proc = subprocess.Popen([NGINX, '-p', str(temp), '-c', str(config), '-g', 'daemon off;'], stderr=err, stdout=subprocess.DEVNULL)
            try:
                for _ in range(100):
                    try:
                        request('/healthz')
                        break
                    except OSError:
                        if proc.poll() is not None:
                            raise AssertionError((temp / 'stderr.log').read_text())
                        time.sleep(0.02)
                verify()
            finally:
                proc.terminate()
                proc.wait(timeout=5)
    def verify_http():
        status, headers, body = request(headers={'Upgrade': 'websocket', 'Connection': 'upgrade', 'X-Forwarded-For': '203.0.113.99'})
        assert status == 200
        echoed = {k.lower(): v for k, v in json.loads(body).items()}
        assert not echoed.get('upgrade')
        assert echoed['x-forwarded-for'] == '127.0.0.1'
        assert headers['x-frame-options'] == 'DENY'
        assert headers['server'] == 'nginx'
        assert request('/.env')[0] == 404
        assert request(method='POST')[0] == 405
        assert request('/.well-known/acme-challenge/probe')[2] == b'acme-ok'
        _, headers, _ = request('/_next/static/probe.js')
        assert headers['x-content-type-options'] == 'nosniff'
        assert 'immutable' in headers['cache-control']
        assert any(request()[0] == 429 for _ in range(80)), 'Expected request rate limit'
        print('HTTP: proxy, headers, ACME, method/dotfile rejection, rate limit passed')
    def verify_https():
        status, headers, _ = request('/path?q=1', headers={'Host': 'attacker.invalid'})
        assert status == 308 and headers['location'] == 'https://portfolio.test/path?q=1'
        assert request('/.well-known/acme-challenge/probe')[2] == b'acme-ok'
        status, headers, _ = request(tls=True)
        assert status == 200
        assert headers['strict-transport-security'] == 'max-age=15552000'
        assert request('/.env', tls=True)[1]['strict-transport-security'] == 'max-age=15552000'
        print('TLS: handshake, canonical HTTPS redirect, ACME exception and HSTS passed')
    try:
        run_template('http', verify_http)
        run_template('https', verify_https)
    finally:
        upstream.shutdown()
