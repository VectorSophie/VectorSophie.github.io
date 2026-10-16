const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');

(async () => {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const server = spawn(process.execPath, ['.next/standalone/server.js'], {
    env: { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', ENABLE_AI_SUMMARIES: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  server.stdout.on('data', data => logs.push(String(data)));
  server.stderr.on('data', data => logs.push(String(data)));
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`);
        if (response.ok) { ready = true; break; }
      } catch {}
      if (server.exitCode !== null) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, `Standalone server failed to start: ${logs.join('')}`);
    for (const [path, status] of [['/', 200], ['/missing-security-probe', 404]]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('x-powered-by'), null);
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.match(response.headers.get('permissions-policy'), /camera=\(\)/);
      const csp = response.headers.get('content-security-policy');
      assert.match(csp, /object-src 'none'/);
      assert.match(csp, /frame-ancestors 'none'/);
      assert.ok(!csp.includes('unsafe-eval'));
    }
    const manifest = JSON.parse(fs.readFileSync('.next/server/server-reference-manifest.json'));
    assert.equal(Object.keys(manifest.node).length, 0, 'No public Server Actions expected');
    assert.equal(Object.keys(manifest.edge).length, 0);
    console.log('Production smoke: home/404 headers and empty public Server Actions manifest passed');
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null) await once(server, 'exit');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
