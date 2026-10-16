# Deployment

The current hosted site uses Vercel. Vercel manages its HTTPS edge; it does not
run this repository's Dockerfile or nginx. Application security headers apply
on Vercel too. The configuration below is an alternative for a server you own.
Do not point DNS away from Vercel until you intend to switch hosting.

## Local container check

Requirements: Docker Engine, Compose plugin 2.24+ and available host ports.
No API key is needed. AI summaries are off by default; blog excerpts remain.

```sh
HTTP_PORT=8080 docker compose up -d --build --wait nextjs nginx
curl -I http://localhost:8080/
HTTP_PORT=8080 docker compose logs --tail=100
HTTP_PORT=8080 docker compose down
```

Only nginx has published ports. Both long-running containers use non-root
users, read-only root filesystems, dropped Linux capabilities, no-new-privileges,
resource limits and rotated logs. Next.js gets a writable named cache volume;
nginx gets temporary writable directories. Named volumes survive `down`.

## HTTPS on a public server

Use a Linux server with Docker and the repository at `/opt/jackexe`. Own the
hostname, point its A record (and AAAA only if IPv6 is working) at the server,
and permit inbound TCP 80 and 443. Use one hostname per deployment; the shared
certificate name is `portfolio`. Do not use `vectorsophie.github.io` as the
self-hosted name: that is a GitHub-managed hostname.

```sh
cd /opt/jackexe
cp deploy/environment.example .env
# Edit .env with your real domain and email, then:
set -a
. ./.env
set +a
sh scripts/enable-https.sh
curl -I "https://$SITE_DOMAIN/"
```

The bootstrap starts HTTP, obtains a Let's Encrypt certificate by webroot,
then enables the HTTPS overlay. The HTTP challenge stays reachable during
renewal; other HTTP paths redirect to the configured hostname. TLS 1.2/1.3 are
allowed. HSTS applies only to HTTPS, without subdomain/preload flags. Private
keys are readable by nginx's group 101, not by everyone. No Docker socket is
mounted in any container. Certificates and ACME account material live in the
`letsencrypt` volume: back it up securely and never commit it.

After bootstrap, use **both** Compose files for all normal updates:

```sh
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build --wait
```

Using only the base file switches nginx back to HTTP. The bootstrap script
refuses to replace an already running TLS configuration. Review port ownership
before starting; an existing server bound to 80/443 must be handled separately.

## Renewal timer

After HTTPS works, test renewal without consuming production issuance limits:

```sh
sh scripts/renew-certificates.sh --dry-run
sudo install -m 644 deploy/jackexe-renew.service /etc/systemd/system/
sudo install -m 644 deploy/jackexe-renew.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jackexe-renew.timer
systemctl list-timers jackexe-renew.timer
```

The units assume `/opt/jackexe` and read `.env` there. If you install elsewhere,
edit `WorkingDirectory`, `EnvironmentFile` and `ExecStart` first. The timer checks
twice daily with jitter; successful checks validate nginx configuration and
reload it. Monitor failures with `journalctl -u jackexe-renew.service`; a shipped
unit is not an installed or monitored timer.

## Optional AI summaries

To opt in, put `ENABLE_AI_SUMMARIES=true` and `GOOGLE_GENAI_API_KEY=...` in
`.env.local` on the server (or in Vercel's environment settings). Neither belongs
in the image or git. Summaries run only on the server, use bounded input/output,
and cache each content result for a day. This limits repeated work; it is not a
provider spending cap. Set a provider quota before enabling public traffic.
The Genkit development console is for local use only; do not expose it publicly.

## Verification

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:security
NGINX_BIN=/path/to/nginx python3 tests/nginx-smoke.py
```

The nginx smoke test generates a temporary self-signed certificate and exercises
HTTP/TLS, ACME, redirects, headers, rate limiting and proxy-header handling. It
does not issue a real certificate or modify a running deployment. A native
nginx test does not replace a Docker build and container-level smoke test.
