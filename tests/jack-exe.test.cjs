const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Exercise the real component and runtime without a browser or external fonts.
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (module, filename) => {
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
    });
    module._compile(result.outputText, filename);
  };
}
require.extensions['.css'] = () => {};
const JackExe = require('../src/components/jackexe/jack-exe.tsx').default;
const { mountJackExe } = require('../src/components/jackexe/engine.ts');
const { route } = require('../src/components/jackexe/router.ts');

test('routing is deterministic and each layer is a probability distribution', () => {
  for (const token of ['open', 'security', '한글', '<script>', '😀']) {
    const r = route(token);
    assert.deepEqual(r, route(token));
    for (const [layer, probs] of r.probs.entries()) {
      assert.ok(Math.abs(probs.reduce((a, b) => a + b, 0) - 1) < 1e-12);
      assert.notEqual(...r.tops[layer]);
    }
  }
});

test('input, playback, locks and cleanup work while font loading is pending', async () => {
  const { Window } = await import('happy-dom');
  const window = new Window();
  const document = window.document;
  const context = new Proxy({}, { get: (_, key) => {
    if (key === 'measureText') return text => ({ width: text.length * 8 });
    if (key === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    return () => ({});
  }, set: () => true });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  Object.defineProperties(window.HTMLElement.prototype, {
    clientWidth: { get: () => 600 }, clientHeight: { get: () => 200 },
  });
  let finishFonts;
  const fontPromise = new Promise(resolve => { finishFonts = resolve; });
  Object.defineProperty(document, 'fonts', { value: { load: () => fontPromise } });
  let nextId = 0;
  const frames = new Map();
  const requestAnimationFrame = fn => { frames.set(++nextId, fn); return nextId; };
  const cancelAnimationFrame = id => frames.delete(id);
  const tick = t => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(t)); };
  Object.assign(globalThis, { window, document, Image: window.Image, ResizeObserver: window.ResizeObserver,
    requestAnimationFrame, cancelAnimationFrame, innerWidth: 1440, innerHeight: 900 });
  document.body.innerHTML = renderToStaticMarkup(React.createElement(JackExe));
  const root = document.querySelector('.jx');
  const el = name => root.querySelector(`[data-el="${name}"]`);
  const cleanup = mountJackExe(root);
  assert.notEqual(el('c-name').textContent, '—');
  assert.equal(el('list').children.length, 8);
  el('word').value = 'security';
  el('word').dispatchEvent(new window.Event('input'));
  assert.match(el('s-tok').textContent, /^"security"/);
  tick(1000); // Used to throw when input arrived before font initialization.
  el('word').value = '';
  el('word').dispatchEvent(new window.Event('input'));
  assert.match(el('s-tok').textContent, /^"open"/);
  el('b-play').click();
  tick(2000);
  assert.equal(el('s-lock').textContent, 'locked "End"');
  tick(2300);
  assert.equal(el('s-lock').textContent, 'locked "-to"');
  // Locking an already displayed token must still refresh the status text.
  el('router').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft' }));
  assert.equal(el('s-lock').textContent, 'locked "End"');
  el('list').children[2].click();
  assert.equal(el('c-name').textContent, 'pommit');
  assert.equal(el('c-url').hasAttribute('href'), false);
  assert.equal(el('c-url').getAttribute('aria-disabled'), 'true');
  el('c-pin').click();
  assert.equal(el('list').children[2].getAttribute('aria-pressed'), 'false');
  cleanup();
  assert.equal(frames.size, 0);
  assert.equal(el('list').children.length, 0);
  finishFonts();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(frames.size, 0);
  const cleanupAgain = mountJackExe(root);
  assert.equal(el('list').children.length, 8);
  assert.equal(el('c-segs').children.length, 20);
  cleanupAgain();
  await window.happyDOM.abort();
});
