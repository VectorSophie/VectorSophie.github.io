/**
 * jack.exe runtime: imperative canvas rendering + DOM sync for the landing page.
 * `mountJackExe(root)` wires everything up and returns a cleanup function (React effect friendly).
 *
 * Canvases:
 *  - router  : tagline tokens, routing arcs, expert × layer grid (Bayer-dithered density), load bars
 *  - conv    : token letters → alphabet → experts, with fading history lines
 *  - art     : the portrait, re-quantised every few frames to an 18-colour palette with ordered dither
 *  - fx      : full-window glyph burst on click / type
 */
import { CONTACT, EXPERTS, START_TOKEN, TOKENS, type Expert } from "./data";
import { LAYERS, N_EXPERTS, hash, route, type Route } from "./router";

const ART_URL = "/jackexe/operator.png";
const ART_W = 128;
const ART_H = 147;

const C = {
  well: "#FFFCF3", ink: "#1B1C33", mute: "#6A604B", rule: "#D9CDB0",
  blue: "#2448C8", deep: "#162A82", mid: "#5B86E0", pale: "#C9D8F6", hi: "#FFFDF6",
  amber: "#F2B33D", amberInk: "#7A4E00",
};
const UI = '"Pixelify Sans", "Lucida Console", sans-serif';
const TAG = '"Silkscreen", "Lucida Console", monospace';

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/** Portrait palette: navy/blue shadows, grey-blues, cream, skin, crown browns, amber + rose accents. */
const ART_PAL = [
  "#12162F", "#1F2A63", "#2E4BB0", "#5B86E0", "#A9C0EE", "#3A3F5C", "#6B6F8A", "#A3A7BD", "#D6DBEA",
  "#FFFCF3", "#FBE9DA", "#F1D3C0", "#DDB09A", "#B98670", "#7D5646", "#B48A62", "#E3A13E", "#C24E5E",
].map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const ART_PAL_F = ART_PAL.map((c) => c.map((v) => v / 255));
const ART_BG = 9;

/** Feature points on the portrait for the x/y readouts (fractions of the image; bx/by are source px). */
const READOUTS = [
  { x: 0.43, y: 0.5, bx: 141, by: 170, rev: true },
  { x: 0.62, y: 0.5, bx: 186, by: 171, rev: false },
  { x: 0.55, y: 0.66, bx: 165, by: 226, rev: false },
  { x: 0.36, y: 0.2, bx: 108, by: 69, rev: true },
];

const ALPHA = "abcdefghijklmnopqrstuvwxyz#";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3));
const easeIO = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const argmax = (a: number[]) => a.reduce((b, v, i) => (v > a[b] ? i : b), 0);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

interface Chip { t: string; x: number; y: number; w: number; h: number }
interface RouterGeom {
  W: number; H: number; chips: Chip[]; rowH: number; font: number; vx: number; vy: number;
  gx0: number; colW: number; headTop: number; headH: number; gridTop: number; cellH: number;
  barsTop: number; barsH: number; compact: boolean;
}
interface Particle { ch: string; e: number; t0: number; dur: number; main: boolean }
interface Glyph { x: number; y: number; ox: number; oy: number; vx: number; vy: number; ch: string; t0: number; life: number; size: number; tag: boolean; line: boolean }
interface Hist { tok: string; top1: number; top2: number; at: number }

export function mountJackExe(root: HTMLElement): () => void {
  const el = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-el="${name}"]`)!;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(t: HTMLElement | Document | Window, ev: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
    t.addEventListener(ev, fn as EventListener, opts);
    cleanups.push(() => t.removeEventListener(ev, fn as EventListener, opts));
  };
  const now = () => performance.now();
  let disposed = false;
  let copyTimer: number | undefined;

  /* ---------------- state ---------------- */
  const S = {
    idx: -1,
    custom: null as string | null,
    tok: TOKENS[START_TOKEN],
    r: route(TOKENS[START_TOKEN]) as Route,
    usage: new Array<number>(N_EXPERTS).fill(0),
    ema: new Array<number>(N_EXPERTS).fill(1 / N_EXPERTS),
    overlap: 0,
    step: 0,
    pinned: null as number | null,
    burstUntil: 0,
    stepAt: 0,
    lastPlay: 0,
    log: [] as string[],
    hist: [] as Hist[],
    hoverExpert: -1,
    hoverTok: -1,
    lock: { i: START_TOKEN, w: null as string | null },
    play: -1,
  };
  const TOKEN_ROUTES = TOKENS.map(route);
  const disp = Array.from({ length: LAYERS }, () => new Array<number>(N_EXPERTS).fill(0));
  const dispUse = new Array<number>(N_EXPERTS).fill(0);
  let particles: Particle[] = [];
  let flood: Glyph[] = [];

  const bursting = (t: number) => t < S.burstUntil;
  const burst = (ms: number) => { S.burstUntil = Math.max(S.burstUntil, now() + ms); };
  const focus = () => (S.pinned != null ? S.pinned : S.hoverExpert >= 0 ? S.hoverExpert : S.r.top1);

  function doStep(tok: string, custom: boolean, t: number) {
    const prev = S.r;
    const r = route(tok);
    let ov = 0;
    for (let l = 0; l < LAYERS; l++) {
      const [a0, a1] = r.tops[l];
      const b = prev.tops[l];
      ov += ((b.includes(a0) ? 1 : 0) + (b.includes(a1) ? 1 : 0)) / 2;
    }
    S.overlap = S.overlap * 0.8 + (ov / LAYERS) * 0.2;
    for (let e = 0; e < N_EXPERTS; e++) {
      S.usage[e] += r.load[e];
      S.ema[e] = S.ema[e] * 0.8 + r.load[e] * 0.2;
    }
    S.r = r; S.tok = tok; S.custom = custom ? tok : null; S.step++; S.stepAt = t;
    S.log.unshift(`${pad(S.step, 4)}  "${tok}"  →  ${EXPERTS[r.top1].name} ${r.load[r.top1].toFixed(2)}  ·  ${EXPERTS[r.top2].name} ${r.load[r.top2].toFixed(2)}`);
    S.log.length = Math.min(S.log.length, 9);
    S.hist.unshift({ tok, top1: r.top1, top2: r.top2, at: t });
    S.hist.length = Math.min(S.hist.length, 7);
    spawnRouteParticles(t);
    flashTitle("router-title");
    syncHTML();
  }
  function showTok(i: number, t: number) {
    if (i === S.idx && !S.custom) return;
    S.idx = i;
    doStep(TOKENS[i], false, t);
  }
  function showLock(t: number) {
    if (S.lock.w) { if (S.custom !== S.lock.w) doStep(S.lock.w, true, t); }
    else showTok(S.lock.i, t);
  }
  function lockTok(i: number, t: number) {
    S.lock = { i, w: null };
    S.play = -1;
    showTok(i, t);
    syncHTML();
    burst(1200);
  }
  function togglePin(i: number) {
    S.pinned = S.pinned === i ? null : i;
    burst(2500);
    syncHTML();
  }

  /* ---------------- DOM ---------------- */
  const segs = el("c-segs");
  for (let i = 0; i < 20; i++) segs.appendChild(document.createElement("i"));

  const stars = (host: HTMLElement, n: number) => {
    host.replaceChildren(...Array.from({ length: 5 }, (_, q) => {
      const i = document.createElement("i");
      if (q < n) i.className = "on";
      return i;
    }));
  };

  const list = el("list");
  EXPERTS.forEach((x, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "li";
    const n = document.createElement("span"); n.className = "n"; n.textContent = pad(i + 1);
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = x.name;
    const k = document.createElement("span"); k.className = "k"; k.textContent = x.role;
    const st = document.createElement("span"); st.className = "st"; stars(st, x.stars);
    const bar = document.createElement("span"); bar.className = "bar"; bar.appendChild(document.createElement("span"));
    b.append(n, nm, k, st, bar);
    on(b, "click", () => togglePin(i));
    list.appendChild(b);
  });

  on(el("c-pin"), "click", () => togglePin(focus()));
  on(el("b-play"), "click", () => {
    S.play = 0; S.lastPlay = 0; S.lock = { i: 0, w: null };
    burst(TOKENS.length * 190 + 600);
  });
  on(el("b-reset"), "click", () => { S.usage.fill(0); S.ema.fill(1 / N_EXPERTS); syncHTML(); });

  on(el("copy-mail"), "click", () => {
    const flag = el("copied");
    const shown = () => {
      if (disposed) return;
      flag.hidden = false;
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => { flag.hidden = true; }, 1500);
    };
    const select = () => {
      if (disposed) return;
      const r = document.createRange(); r.selectNodeContents(el("mail-text"));
      const s = getSelection(); s?.removeAllRanges(); s?.addRange(r);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(CONTACT.email).then(shown, select);
    else select();
  });

  const titleTimers = new Map<string, number>();
  function flashTitle(name: string) {
    if (reduce) return;
    const t = el(name);
    t.classList.add("flash");
    window.clearTimeout(titleTimers.get(name));
    titleTimers.set(name, window.setTimeout(() => t.classList.remove("flash"), 70));
  }

  let lastFocus = -1;
  function renderCard(x: Expert, f: number) {
    el("c-num").textContent = `expert ${pad(f + 1)} / ${pad(N_EXPERTS)}`;
    el("c-name").textContent = x.name;
    el("c-role").textContent = x.role;
    el("c-status").textContent = x.status;
    el("c-lang").textContent = x.lang;
    el("c-line").textContent = x.line;
    el("c-body").textContent = x.body;
    el("c-stack").textContent = x.stack;
    const st = el("c-stars"); stars(st, x.stars); st.setAttribute("aria-label", `${x.stars} of 5`);

    const keys = Object.keys(x.stats) as (keyof Expert["stats"])[];
    const best = keys.reduce((a, b) => (x.stats[b] > x.stats[a] ? b : a));
    el("c-stats").replaceChildren(...keys.map((k) => {
      const row = document.createElement("div");
      row.className = k === best ? "srow best" : "srow";
      const lab = document.createElement("span"); lab.textContent = k;
      const bar = document.createElement("span"); bar.className = "sb";
      for (let q = 0; q < 10; q++) { const i = document.createElement("i"); if (q < x.stats[k]) i.className = "on"; bar.appendChild(i); }
      const v = document.createElement("span"); v.className = "v"; v.textContent = String(x.stats[k]);
      row.append(lab, bar, v);
      return row;
    }));
    el("c-traits").replaceChildren(...x.traits.map((tr) => {
      const c = document.createElement("span"); c.className = "trait"; c.textContent = tr; return c;
    }));
    const u = el<HTMLAnchorElement>("c-url");
    if (x.url) { u.href = x.url; u.textContent = "Open repository"; u.removeAttribute("aria-disabled"); }
    else { u.removeAttribute("href"); u.textContent = "Repo private"; u.setAttribute("aria-disabled", "true"); }

    const card = el("card");
    card.classList.remove("swap");
    void card.offsetWidth;
    if (!reduce) card.classList.add("swap");
    flashTitle("out-title");
  }

  function syncHTML() {
    const f = focus();
    const x = EXPERTS[f];
    const total = sum(S.ema);
    const mx = Math.max(...S.ema);
    if (f !== lastFocus) { lastFocus = f; renderCard(x, f); }
    el("c-mode").textContent = S.pinned != null ? "pinned by you" : S.hoverExpert >= 0 ? "preview · click to pin" : `top expert for "${S.tok}"`;
    el("c-pin").textContent = S.pinned != null ? "Release pin" : "Pin";
    el("c-share").textContent = `${((S.ema[f] / total) * 100).toFixed(1)}%`;
    const lit = Math.round((S.ema[f] / mx) * 20);
    Array.from(segs.children).forEach((s, i) => { s.className = i < lit ? "on" : ""; });
    Array.from(list.children).forEach((b, i) => {
      b.setAttribute("aria-current", String(i === f));
      b.setAttribute("aria-pressed", String(S.pinned === i));
      (b.querySelector(".bar span") as HTMLElement).style.width = `${Math.round((S.ema[i] / mx) * 100)}%`;
    });
    el("log").replaceChildren(...S.log.map((s) => { const li = document.createElement("li"); li.textContent = s; return li; }));
    el("s-tok").textContent = `"${S.tok}" → ${EXPERTS[S.r.top1].name}`;
    el("s-lock").textContent = `locked "${S.lock.w ?? TOKENS[S.lock.i]}"`;
    el("conv-status").textContent = `token ${S.tok} · id ${Math.floor(hash(S.tok) * 50257)}`;
    el("live").textContent = `"${S.tok}" routes to ${EXPERTS[S.r.top1].name}, then ${EXPERTS[S.r.top2].name}.`;
  }

  const word = el<HTMLInputElement>("word");
  on(word, "input", () => {
    const w = (word.value.trim().split(/\s+/).pop() ?? "").slice(0, 18);
    burst(3000);
    if (w && w !== S.custom) {
      S.lock = { i: S.lock.i, w };
      S.play = -1;
      doStep(w, true, now());
      spawnFlood(anchorScreen(), 18);
    }
    if (!w && S.lock.w) { S.lock.w = null; showLock(now()); }
  });

  on(root, "pointerdown", (ev: PointerEvent) => {
    burst(2500);
    const target = ev.target as HTMLElement;
    if (target.closest("input, a, button")) return;
    spawnFlood({ x: ev.clientX, y: ev.clientY }, ev.pointerType === "touch" ? 12 : 26);
  });

  /* ---------------- canvas helpers ---------------- */
  function fit(cv: HTMLCanvasElement, h?: number) {
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    if (h != null) cv.style.height = `${h}px`;
    const w = cv.clientWidth;
    const hh = cv.clientHeight;
    if (cv.width !== w * dpr || cv.height !== hh * dpr) { cv.width = w * dpr; cv.height = hh * dpr; }
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return { ctx, w, h: hh };
  }

  /** 17 Bayer density levels as repeating 8×8 (2px dots) patterns. */
  let patterns: CanvasPattern[] = [];
  function buildPatterns(ctx: CanvasRenderingContext2D) {
    patterns = [];
    for (let lv = 0; lv <= 16; lv++) {
      const pc = document.createElement("canvas");
      pc.width = 8; pc.height = 8;
      const px = pc.getContext("2d")!;
      px.fillStyle = C.deep;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (BAYER[y][x] < lv) px.fillRect(x * 2, y * 2, 2, 2);
      patterns.push(ctx.createPattern(pc, "repeat")!);
    }
  }

  /* ---------------- router canvas ---------------- */
  const rcv = el<HTMLCanvasElement>("router");
  let RG: RouterGeom | null = null;
  let rctx: CanvasRenderingContext2D | null = null;

  function layoutRouter() {
    const W = rcv.clientWidth;
    if (!W) return;
    const compact = W < 560;
    const font = compact ? 13 : 15;
    const pd = compact ? 10 : 16;
    const rowH = compact ? 22 : 24;
    const gap = compact ? 4 : 6;
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = `${font}px ${UI}`;
    const chips: Chip[] = [];
    let x = pd, y = compact ? 10 : 14;
    for (const t of TOKENS) {
      const w = Math.ceil(measure.measureText(t).width) + (compact ? 10 : 14);
      if (x + w > W - pd) { x = pd; y += rowH + gap; }
      chips.push({ t, x, y, w, h: rowH });
      x += w + gap;
    }
    const tokEnd = y + rowH;
    const gx0 = pd + (compact ? 20 : 28);
    const colW = (W - gx0 - pd) / N_EXPERTS;
    const headTop = tokEnd + (compact ? 52 : 64);
    const headH = compact ? 26 : 34;
    const gridTop = headTop + headH + 4;
    const cellH = Math.max(22, Math.min(46, W * 0.05));
    const barsH = compact ? 48 : 62;
    const barsTop = gridTop + cellH * LAYERS + 10;
    const H = Math.round(barsTop + barsH + (compact ? 24 : 30));
    rctx = fit(rcv, H).ctx;
    if (!patterns.length) buildPatterns(rctx);
    RG = { W, H, chips, rowH, font, vx: x, vy: y, gx0, colW, headTop, headH, gridTop, cellH, barsTop, barsH, compact };
  }

  function customChip(G: RouterGeom) {
    const m = rctx!;
    m.font = `${G.font}px ${UI}`;
    const w = Math.ceil(m.measureText(S.custom!).width) + 14;
    let vx = G.vx + 34;
    let vy = G.vy;
    if (vx + w > G.W - 10) { vx = Math.max(44, G.W - 10 - w); vy = G.vy; }
    return { x: vx, y: vy, w };
  }
  function anchorLocal() {
    const G = RG!;
    if (S.custom) { const c = customChip(G); return { x: c.x + c.w / 2, y: c.y + G.rowH }; }
    const c = G.chips[S.idx];
    return { x: c.x + c.w / 2, y: c.y + c.h };
  }
  function anchorScreen() {
    if (!RG) return { x: innerWidth / 2, y: innerHeight / 2 };
    const a = anchorLocal();
    const b = rcv.getBoundingClientRect();
    return { x: b.left + a.x, y: b.top + a.y };
  }
  const colX = (e: number) => RG!.gx0 + (e + 0.5) * RG!.colW;
  function bez(a: { x: number; y: number }, e: number, u: number) {
    const x0 = a.x, y0 = a.y, x3 = colX(e), y3 = RG!.headTop;
    const x1 = x0, y1 = y0 + 40, x2 = x3, y2 = y3 - 40, v = 1 - u;
    return {
      x: v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
      y: v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3,
    };
  }
  function strokeBez(ctx: CanvasRenderingContext2D, a: { x: number; y: number }, e: number, prog: number) {
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const p = bez(a, e, (i / 28) * prog);
      if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
  }
  function spawnRouteParticles(t: number) {
    if (!RG || reduce) return;
    const chars = Array.from(S.tok);
    const r = S.r;
    const targets = [r.top1, r.top2];
    if (bursting(t)) for (let e = 0; e < N_EXPERTS; e++) if (!targets.includes(e) && r.load[e] > 0.12) targets.push(e);
    targets.forEach((e, k) => chars.forEach((ch, i) => {
      particles.push({ ch, e, t0: t + i * 22 + k * 30, dur: reduce ? 1 : 260 + k * 40, main: k === 0 });
    }));
    if (particles.length > 260) particles.splice(0, particles.length - 260);
  }

  function drawRouter(t: number, dt: number) {
    if (!RG || !rctx) return;
    const ctx = rctx, G = RG, r = S.r, k = reduce ? 1 : 1 - Math.exp(-dt / 55);
    const a = anchorLocal();
    const prog = reduce ? 1 : ease((t - S.stepAt) / 170);
    const fcs = focus();
    ctx.clearRect(0, 0, G.W, G.H);
    ctx.fillStyle = C.well;
    ctx.fillRect(0, 0, G.W, G.H);

    if (S.hoverExpert >= 0) {
      ctx.fillStyle = "rgba(201,216,246,.45)";
      ctx.fillRect(G.gx0 + S.hoverExpert * G.colW, G.headTop, G.colW, G.barsTop + G.barsH - G.headTop);
    }

    /* tokens */
    ctx.font = `${G.font}px ${UI}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    G.chips.forEach((c, i) => {
      const active = !S.custom && i === S.idx;
      const locked = !S.lock.w && i === S.lock.i;
      const tint = S.hoverExpert >= 0 ? TOKEN_ROUTES[i].load[S.hoverExpert] : 0;
      ctx.fillStyle = active ? C.blue : C.well;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      if (!active && tint > 0) {
        ctx.globalAlpha = Math.min(0.9, tint * 2.4);
        ctx.fillStyle = C.amber;
        ctx.fillRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
        ctx.globalAlpha = 1;
      }
      if (i === S.hoverTok && !active) { ctx.fillStyle = C.pale; ctx.fillRect(c.x, c.y, c.w, c.h); }
      if (locked && !active) { ctx.fillStyle = C.blue; ctx.fillRect(c.x + 3, c.y + c.h - 4, c.w - 6, 2); }
      ctx.strokeStyle = active ? C.deep : C.rule;
      ctx.lineWidth = 1;
      ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
      ctx.fillStyle = active ? C.hi : C.ink;
      ctx.fillText(c.t, c.x + c.w / 2, c.y + c.h / 2 + 1);
    });
    if (S.custom) {
      const cc = customChip(G);
      ctx.font = `9px ${TAG}`; ctx.fillStyle = C.amberInk; ctx.textAlign = "right";
      ctx.fillText("YOU ›", cc.x - 6, cc.y + G.rowH / 2 + 1);
      ctx.font = `${G.font}px ${UI}`; ctx.textAlign = "center";
      ctx.fillStyle = C.amber; ctx.fillRect(cc.x, cc.y, cc.w, G.rowH);
      ctx.fillStyle = C.ink; ctx.fillText(S.custom, cc.x + cc.w / 2, cc.y + G.rowH / 2 + 1);
    }

    /* arcs: faint to every expert, amber to second, dashed blue to first */
    ctx.lineCap = "square";
    for (let e = 0; e < N_EXPERTS; e++) {
      if (e === r.top1 || e === r.top2) continue;
      ctx.strokeStyle = `rgba(27,28,51,${Math.min(0.45, r.load[e] * 1.5).toFixed(3)})`;
      ctx.lineWidth = 1;
      strokeBez(ctx, a, e, prog);
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; strokeBez(ctx, a, r.top2, prog);
    ctx.strokeStyle = C.amber; ctx.lineWidth = 3; strokeBez(ctx, a, r.top2, prog);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.setLineDash([7, 4]);
    ctx.lineDashOffset = reduce ? 0 : -t / 28;
    strokeBez(ctx, a, r.top1, prog);
    ctx.setLineDash([]);
    if (prog > 0.85) {
      ctx.font = `10px ${TAG}`; ctx.textAlign = "center";
      ([[r.top1, C.blue], [r.top2, C.amberInk]] as const).forEach(([e, col]) => {
        const x = colX(e);
        ctx.fillStyle = C.well; ctx.fillRect(x - 17, G.headTop - 17, 34, 13);
        ctx.fillStyle = col; ctx.fillText(r.load[e].toFixed(2), x, G.headTop - 10);
      });
    }

    /* letters riding the arcs */
    ctx.font = `14px ${UI}`; ctx.textAlign = "center";
    particles = particles.filter((p) => {
      const u = (t - p.t0) / p.dur;
      if (u > 1.25) return false;
      if (u < 0) return true;
      const q = bez(a, p.e, easeIO(Math.min(1, u)));
      ctx.fillStyle = p.main ? C.blue : C.ink;
      ctx.globalAlpha = u > 1 ? Math.max(0, 1 - (u - 1) * 4) : 1;
      ctx.fillText(p.ch, Math.round(q.x), Math.round(q.y));
      ctx.globalAlpha = 1;
      return true;
    });

    /* expert headers */
    for (let h = 0; h < N_EXPERTS; h++) {
      const x = G.gx0 + h * G.colW, cx = x + G.colW / 2, hot = h === r.top1 && prog >= 1;
      if (hot) { ctx.fillStyle = C.blue; ctx.fillRect(x + 2, G.headTop, G.colW - 4, G.headH); }
      ctx.textAlign = "center";
      ctx.font = `9px ${TAG}`;
      ctx.fillStyle = hot ? C.pale : C.mute;
      ctx.fillText(pad(h + 1) + (S.pinned === h ? " ◆" : ""), cx, G.headTop + 9);
      if (G.colW >= 48) {
        ctx.font = `${G.colW < 80 ? 11 : 13}px ${UI}`;
        ctx.fillStyle = hot ? C.hi : C.ink;
        let nm = EXPERTS[h].name;
        while (ctx.measureText(nm).width > G.colW - 8 && nm.length > 3) nm = nm.slice(0, -2) + "…";
        ctx.fillText(nm, cx, G.headTop + (G.compact ? 19 : 24));
      } else {
        ctx.font = `11px ${UI}`;
        ctx.fillStyle = hot ? C.hi : C.ink;
        ctx.fillText(EXPERTS[h].name.slice(0, 3), cx, G.headTop + 19);
      }
      if (h === fcs) { ctx.fillStyle = C.blue; ctx.fillRect(x + 6, G.headTop + G.headH - 2, G.colW - 12, 3); }
    }

    /* layer labels + cells */
    ctx.font = `9px ${TAG}`; ctx.textAlign = "left"; ctx.fillStyle = C.mute;
    const lx = G.compact ? 8 : 16;
    for (let l = 0; l < LAYERS; l++) ctx.fillText(`L${l}`, lx, G.gridTop + l * G.cellH + G.cellH / 2);
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    for (let l = 0; l < LAYERS; l++) for (let e = 0; e < N_EXPERTS; e++) {
      const target = Math.min(1, r.probs[l][e] * 1.7);
      disp[l][e] += (target - disp[l][e]) * k;
      const cx = Math.round(G.gx0 + e * G.colW), cy = Math.round(G.gridTop + l * G.cellH);
      const cw = Math.round(G.colW), ch = Math.round(G.cellH);
      ctx.strokeRect(cx + 0.5, cy + 0.5, cw, ch);
      const lv = Math.round(disp[l][e] * 16);
      if (lv > 0) { ctx.fillStyle = patterns[lv]; ctx.fillRect(cx + 3, cy + 3, cw - 5, ch - 5); }
      const isTop = r.tops[l][0] === e, isSec = r.tops[l][1] === e;
      if (isTop || isSec) {
        ctx.strokeStyle = isTop ? C.blue : C.amber;
        ctx.lineWidth = isTop ? 2 : 3;
        ctx.strokeRect(cx + 2, cy + 2, cw - 3, ch - 3);
        ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
        if (ch > 22 && cw > 40) {
          ctx.font = `9px ${TAG}`; ctx.textAlign = "right";
          const s = r.probs[l][e].toFixed(2), tw = ctx.measureText(s).width;
          ctx.fillStyle = C.well; ctx.fillRect(cx + cw - tw - 8, cy + ch - 14, tw + 5, 11);
          ctx.fillStyle = isTop ? C.blue : C.amberInk; ctx.fillText(s, cx + cw - 5, cy + ch - 8);
        }
      }
    }

    /* load bars: segmented, Win95-progress style */
    const tot = sum(S.usage) || 1, umax = Math.max(...S.usage) || 1;
    const segH = 5, sg = 2, nseg = Math.floor((G.barsH - 14) / (segH + sg));
    ctx.font = `9px ${TAG}`; ctx.fillStyle = C.mute; ctx.textAlign = "left";
    if (!G.compact) ctx.fillText("LOAD", lx, G.barsTop + G.barsH - 6);
    for (let b = 0; b < N_EXPERTS; b++) {
      dispUse[b] += (S.usage[b] / umax - dispUse[b]) * k;
      const bx = G.gx0 + b * G.colW + G.colW * 0.28, bw = G.colW * 0.44, n = Math.round(dispUse[b] * nseg);
      ctx.fillStyle = b === fcs ? C.blue : C.mid;
      for (let s = 0; s < n; s++) ctx.fillRect(Math.round(bx), Math.round(G.barsTop + G.barsH - (s + 1) * (segH + sg)), Math.round(bw), segH);
      if (G.colW >= 40) {
        ctx.fillStyle = C.mute; ctx.textAlign = "center";
        ctx.fillText(`${((S.usage[b] / tot) * 100).toFixed(1)}%`, G.gx0 + (b + 0.5) * G.colW, G.barsTop + G.barsH - n * (segH + sg) - 6);
      }
    }
    ctx.strokeStyle = C.ink;
    ctx.beginPath(); ctx.moveTo(G.gx0, G.barsTop + G.barsH + 0.5); ctx.lineTo(G.W - (G.compact ? 10 : 16), G.barsTop + G.barsH + 0.5); ctx.stroke();

    /* metrics */
    const srt = [...S.usage].sort((p, q) => p - q);
    let gn = 0;
    for (let g = 0; g < N_EXPERTS; g++) gn += (2 * (g + 1) - N_EXPERTS - 1) * srt[g];
    ctx.font = `9px ${TAG}`; ctx.textAlign = "left"; ctx.fillStyle = C.mute;
    const base = `STEP ${pad(S.step, 4)}    GINI ${(gn / (N_EXPERTS * tot)).toFixed(2)}    OVERLAP ${S.overlap.toFixed(2)}`;
    ctx.fillText(G.W > 760 ? `${base}    HOVER A WORD · CLICK TO LOCK · HOVER AN EXPERT TO SEE WHAT FEEDS IT` : base, G.gx0, G.H - 10);
  }

  function hitRouter(ev: PointerEvent | MouseEvent) {
    if (!RG) return { expert: -1, tok: -1 };
    const b = rcv.getBoundingClientRect();
    const x = ev.clientX - b.left, y = ev.clientY - b.top;
    const c = Math.floor((x - RG.gx0) / RG.colW);
    const expert = y >= RG.headTop && c >= 0 && c < N_EXPERTS ? c : -1;
    const tok = RG.chips.findIndex((ch) => x >= ch.x - 2 && x <= ch.x + ch.w + 2 && y >= ch.y - 2 && y <= ch.y + ch.h + 2);
    return { expert, tok };
  }
  on(rcv, "pointermove", (ev: PointerEvent) => {
    if (ev.pointerType === "touch") return;
    const { expert, tok } = hitRouter(ev);
    if (expert !== S.hoverExpert) { S.hoverExpert = expert; syncHTML(); }
    if (tok !== S.hoverTok) {
      S.hoverTok = tok;
      if (S.play < 0) { if (tok >= 0) showTok(tok, now()); else showLock(now()); }
    }
    rcv.style.cursor = expert >= 0 || tok >= 0 ? "pointer" : "default";
  });
  on(rcv, "pointerleave", () => {
    const hadExpert = S.hoverExpert >= 0;
    S.hoverExpert = -1; S.hoverTok = -1;
    if (S.play < 0) showLock(now());
    if (hadExpert) syncHTML();
  });
  on(rcv, "click", (ev: MouseEvent) => {
    const { expert, tok } = hitRouter(ev);
    if (tok >= 0) lockTok(tok, now());
    else if (expert >= 0) togglePin(expert);
  });
  on(rcv, "keydown", (ev: KeyboardEvent) => {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    ev.preventDefault();
    const i = S.lock.w ? 0 : S.lock.i + (ev.key === "ArrowRight" ? 1 : -1);
    lockTok((i + TOKENS.length) % TOKENS.length, now());
    spawnFlood(anchorScreen(), 14);
  });

  /* ---------------- conversion canvas ---------------- */
  const ccv = el<HTMLCanvasElement>("conv");
  let cctx: CanvasRenderingContext2D | null = null, CW = 0, CH = 0;
  function layoutConv() {
    if (!ccv.clientWidth) return;
    const f = fit(ccv);
    cctx = f.ctx; CW = f.w; CH = f.h;
  }
  const slotOf = (ch: string) => { const i = ALPHA.indexOf(ch.toLowerCase()); return i < 0 ? 26 : i; };
  function drawConv(t: number) {
    if (!cctx) return;
    const ctx = cctx, pd = 12, aw = (CW - pd * 2) / 27, yIn = 26, yA = 98, yE = 166, ew = (CW - pd * 2) / N_EXPERTS;
    const ax = (i: number) => pd + (i + 0.5) * aw;
    const ex = (e: number) => pd + (e + 0.5) * ew;
    const inX = (i: number, n: number, iw: number) => CW / 2 + (i - (n - 1) / 2) * iw;
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = C.well; ctx.fillRect(0, 0, CW, CH);
    ctx.font = `9px ${TAG}`; ctx.fillStyle = C.mute; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("INPUT", pd, 10); ctx.fillText("ALPHABET", pd, yA - 18); ctx.fillText("EXPERT", pd, yE - 18);

    /* history wires, oldest faintest */
    S.hist.forEach((hst, hi) => {
      const chars = Array.from(hst.tok).slice(0, 14);
      const u = hi === 0 && !reduce ? ease((t - hst.at) / 220) : 1;
      const alpha = hi === 0 ? 1 : Math.max(0.06, 0.35 - hi * 0.05);
      const n = chars.length, iw = Math.min(18, (CW - pd * 2) / Math.max(n, 1));
      chars.forEach((ch, i) => {
        const x0 = inX(i, n, iw), x1 = ax(slotOf(ch)), u1 = Math.min(1, u * 1.6);
        ctx.strokeStyle = hi === 0 ? C.ink : `rgba(27,28,51,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, yIn + 9); ctx.lineTo(x0 + (x1 - x0) * u1, yIn + 9 + (yA - 8 - (yIn + 9)) * u1); ctx.stroke();
        const u2 = Math.max(0, (u - 0.4) / 0.6);
        if (u2 > 0) {
          ([[hst.top1, hi === 0 ? C.blue : `rgba(36,72,200,${alpha})`], [hst.top2, hi === 0 ? C.amber : `rgba(242,179,61,${alpha})`]] as const)
            .forEach(([e, col]) => {
              const x2 = ex(e);
              ctx.strokeStyle = col; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(x1, yA + 8); ctx.lineTo(x1 + (x2 - x1) * u2, yA + 8 + (yE - 9 - (yA + 8)) * u2); ctx.stroke();
            });
        }
      });
    });

    const cur = Array.from(S.tok).slice(0, 14), n = cur.length, iw = Math.min(18, (CW - pd * 2) / Math.max(n, 1));
    ctx.font = `14px ${UI}`; ctx.textAlign = "center";
    cur.forEach((ch, i) => {
      const x = inX(i, n, iw);
      ctx.fillStyle = C.blue; ctx.fillRect(Math.round(x - iw / 2 + 1), yIn - 9, Math.round(iw - 2), 18);
      ctx.fillStyle = C.hi; ctx.fillText(ch, x, yIn + 1);
    });
    const used = new Set(cur.map(slotOf));
    ctx.font = `${aw < 10 ? 10 : 12}px ${UI}`;
    for (let i = 0; i < 27; i++) {
      const x = ax(i);
      if (used.has(i)) { ctx.fillStyle = C.pale; ctx.fillRect(Math.round(x - aw / 2) + 1, yA - 8, Math.round(aw) - 1, 16); }
      ctx.fillStyle = used.has(i) ? C.deep : C.mute;
      ctx.fillText(ALPHA[i], x, yA + 1);
    }
    ctx.font = `10px ${TAG}`;
    for (let e = 0; e < N_EXPERTS; e++) {
      const x = ex(e), hot = e === S.r.top1, sec = e === S.r.top2;
      ctx.fillStyle = hot ? C.blue : sec ? C.amber : C.well;
      ctx.fillRect(Math.round(x - ew / 2) + 2, yE - 8, Math.round(ew) - 4, 17);
      ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(x - ew / 2) + 2.5, yE - 7.5, Math.round(ew) - 5, 16);
      ctx.fillStyle = hot ? C.hi : C.ink;
      ctx.fillText(pad(e + 1), x, yE + 1);
    }
    ctx.font = `9px ${TAG}`; ctx.fillStyle = C.mute; ctx.textAlign = "left";
    ctx.fillText(`→ ${EXPERTS[S.r.top1].name.toUpperCase()}`, pd, CH - 10);
  }

  /* ---------------- portrait ---------------- */
  const art = el<HTMLCanvasElement>("art");
  const actx = art.getContext("2d")!;
  const artImg = actx.createImageData(ART_W, ART_H);
  let SRC: Float32Array | null = null;
  let BG: Uint8Array | null = null;
  let glitch = { until: 0, rows: [] as { y: number; h: number; dx: number }[] };
  let nextGlitch = 2500;

  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = ART_W; c.height = ART_H;
    const x = c.getContext("2d")!;
    x.drawImage(img, 0, 0, ART_W, ART_H);
    const d = x.getImageData(0, 0, ART_W, ART_H).data;
    SRC = new Float32Array(ART_W * ART_H * 3);
    BG = new Uint8Array(ART_W * ART_H);
    const sat = (v: number, l: number) => Math.min(1, Math.max(0, l + (v - l) * 1.35));
    for (let i = 0; i < ART_W * ART_H; i++) {
      let r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = sat(r, l); g = sat(g, l); b = sat(b, l);
      const l2 = 0.299 * r + 0.587 * g + 0.114 * b;
      const t = Math.min(1, Math.max(0, (0.62 - l2) / 0.62)) * 0.55; // push shadows toward blue
      SRC[i * 3] = r * (1 - t) + 0.12 * t;
      SRC[i * 3 + 1] = g * (1 - t) + 0.18 * t;
      SRC[i * 3 + 2] = b * (1 - t) + 0.52 * t;
      BG[i] = l > 0.93 ? 1 : 0;
    }
    drawArt(0);
  };
  img.src = ART_URL;

  function nearest(r: number, g: number, b: number) {
    let best = 0, bd = Infinity;
    for (let k = 0; k < ART_PAL_F.length; k++) {
      const p = ART_PAL_F[k], dr = r - p[0], dg = g - p[1], db = b - p[2];
      const dd = 0.9 * dr * dr + 1.77 * dg * dg + 0.33 * db * db;
      if (dd < bd) { bd = dd; best = k; }
    }
    return best;
  }
  function drawArt(t: number) {
    if (!SRC || !BG) return;
    const g = t < glitch.until, out = artImg.data;
    const spread = 0.1 + (reduce ? 0 : Math.sin(t / 900) * 0.03);
    for (let y = 0; y < ART_H; y++) {
      let off = 0, inSlice = false;
      if (g) for (const gr of glitch.rows) if (y >= gr.y && y < gr.y + gr.h) { off = gr.dx; inSlice = true; break; }
      for (let x = 0; x < ART_W; x++) {
        const sx = Math.min(ART_W - 1, Math.max(0, x - off)), i = y * ART_W + sx, o = (y * ART_W + x) * 4;
        let cc: number[];
        if (BG[i] && !inSlice) cc = ART_PAL[ART_BG];
        else {
          const dz = (BAYER[y & 3][x & 3] / 16 - 0.5) * spread;
          let r = SRC[i * 3] + dz, gg = SRC[i * 3 + 1] + dz, b = SRC[i * 3 + 2] + dz;
          if (inSlice) { r -= 0.12; gg -= 0.04; b += 0.22; } // blue chromatic slip
          cc = ART_PAL[nearest(r, gg, b)];
        }
        out[o] = cc[0]; out[o + 1] = cc[1]; out[o + 2] = cc[2]; out[o + 3] = 255;
      }
    }
    actx.putImageData(artImg, 0, 0);
  }
  function triggerGlitch(t: number, strength: number) {
    const n = strength > 1 ? 6 : 2;
    glitch = {
      until: t + (strength > 1 ? 140 : 90),
      rows: Array.from({ length: n }, () => ({
        y: Math.floor(Math.random() * ART_H),
        h: 2 + Math.floor(Math.random() * 8 * strength),
        dx: Math.round((Math.random() - 0.5) * 10 * strength),
      })),
    };
  }

  const artwrap = el("artwrap");
  const roEls = READOUTS.map((p) => {
    const s = document.createElement("span");
    s.className = p.rev ? "ro rev" : "ro";
    const ring = document.createElement("span"); ring.className = "ring";
    const b = document.createElement("b");
    s.append(ring, b);
    artwrap.appendChild(s);
    return { s, b };
  });
  function placeReadouts(t: number, hot: boolean) {
    const wrap = artwrap.getBoundingClientRect(), a = art.getBoundingClientRect();
    READOUTS.forEach((p, i) => {
      const amp = reduce ? 0 : hot ? 5 : 1.2;
      const dx = Math.sin(t / (hot ? 90 : 700) + i * 1.7) * amp, dy = Math.cos(t / (hot ? 110 : 900) + i) * amp;
      roEls[i].s.style.left = `${a.left - wrap.left + p.x * a.width + dx}px`;
      roEls[i].s.style.top = `${a.top - wrap.top + p.y * a.height + dy}px`;
      roEls[i].b.textContent = `x:${Math.round(p.bx + dx * 3)} y:${Math.round(p.by + dy * 3)}`;
    });
  }

  /* ---------------- glyph burst ---------------- */
  const fx = el<HTMLCanvasElement>("fx");
  const fctx = fx.getContext("2d")!;
  let FW = 0, FH = 0, fxDirty = false;
  function layoutFx() {
    const d = Math.max(1, Math.round(window.devicePixelRatio || 1));
    FW = innerWidth; FH = innerHeight;
    fx.width = FW * d; fx.height = FH * d;
    fctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function spawnFlood(o: { x: number; y: number }, n: number) {
    if (reduce) return;
    let chars = Array.from(S.tok).filter((c) => c.trim());
    if (!chars.length) chars = ["·"];
    const t = now();
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, sp = 380 + Math.random() * 900;
      flood.push({
        x: o.x, y: o.y, ox: o.x, oy: o.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * 0.7,
        ch: chars[i % chars.length], t0: t + i * 6, life: 700 + Math.random() * 600,
        size: [14, 18, 22, 30][i % 4], tag: i % 3 === 0, line: i % 4 === 0,
      });
    }
    if (flood.length > 320) flood.splice(0, flood.length - 320);
  }
  function drawFx(t: number, dt: number) {
    if (!flood.length) { if (fxDirty) { fctx.clearRect(0, 0, FW, FH); fxDirty = false; } return; }
    fxDirty = true;
    fctx.clearRect(0, 0, FW, FH);
    const s = dt / 1000, damp = Math.exp(-s * 4.2);
    flood = flood.filter((p) => {
      const u = (t - p.t0) / p.life;
      if (u > 1) return false;
      if (u < 0) return true;
      p.x += p.vx * s; p.y += p.vy * s; p.vx *= damp; p.vy *= damp;
      const a = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
      if (p.line) {
        fctx.strokeStyle = `rgba(27,28,51,${(0.35 * a).toFixed(3)})`; fctx.lineWidth = 1;
        fctx.beginPath(); fctx.moveTo(p.ox, p.oy); fctx.lineTo(p.x, p.y); fctx.stroke();
      }
      fctx.globalAlpha = a; fctx.textAlign = "center"; fctx.textBaseline = "middle";
      fctx.font = `${p.size}px ${UI}`;
      fctx.fillStyle = p.size > 20 ? C.blue : p.size === 18 ? C.amberInk : C.ink;
      fctx.fillText(p.ch, Math.round(p.x), Math.round(p.y));
      if (p.tag) {
        fctx.font = `8px ${TAG}`; fctx.fillStyle = C.deep;
        fctx.fillText(`${p.ch.toLowerCase()}.glyph`, Math.round(p.x), Math.round(p.y + p.size * 0.7));
      }
      fctx.globalAlpha = 1;
      return true;
    });
  }

  /* ---------------- loop ---------------- */
  let raf = 0, last = 0, lastArt = 0, lastRO = 0, lastSec = -1;
  const sMode = el("s-mode"), tMode = el("t-mode"), lamp = el("lamp"), clock = el("clock");
  const clockFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  function frame(t: number) {
    if (disposed) return;
    // Keep idle rendering inexpensive, especially portrait palette searches.
    const interval = reduce ? 250 : bursting(t) || S.play >= 0 ? 1000 / 30 : 100;
    if (document.hidden || t - last < interval) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(64, t - (last || t));
    last = t;
    const hot = bursting(t);
    if (S.play >= 0 && t - S.lastPlay >= (reduce ? 900 : 180)) {
      if (S.play < TOKENS.length) { S.idx = -1; S.lock.i = S.play; showTok(S.play, t); S.play++; S.lastPlay = t; }
      else S.play = -1;
    }
    drawRouter(t, dt);
    drawConv(t);
    drawFx(t, dt);
    if (!reduce && t > nextGlitch) {
      triggerGlitch(t, hot ? 2 : 1);
      nextGlitch = t + (hot ? 220 + Math.random() * 300 : 3000 + Math.random() * 3000);
    }
    if (!reduce && t - lastArt > (hot ? 50 : 110)) { drawArt(t); lastArt = t; }
    if (t - lastRO > (hot ? 60 : 200)) { placeReadouts(t, hot); lastRO = t; }
    const mode = S.play >= 0 ? "playing" : S.hoverTok >= 0 || S.hoverExpert >= 0 ? "hover" : hot ? "routing" : "idle";
    if (sMode.textContent !== mode) { sMode.textContent = mode; tMode.textContent = mode; }
    lamp.classList.toggle("on", reduce || hot || S.hoverTok >= 0 || Math.floor(t / 600) % 2 === 0);
    const sec = Math.floor(Date.now() / 1000);
    if (sec !== lastSec) { lastSec = sec; clock.textContent = `KST ${clockFmt.format(new Date())}`; }
    raf = requestAnimationFrame(frame);
  }

  function layoutAll() { layoutRouter(); layoutConv(); layoutFx(); }
  const ro = new ResizeObserver(() => { layoutRouter(); layoutConv(); });
  ro.observe(rcv.parentElement!);
  ro.observe(ccv.parentElement!);
  on(window, "resize", layoutFx);

  let started = false;
  function start() {
    if (started || disposed) return;
    started = true;
    layoutAll();
    showTok(START_TOKEN, now());
    S.usage = S.r.load.slice();
    raf = requestAnimationFrame(frame);
  }
  const fontsReady = document.fonts
    ? Promise.all([document.fonts.load(`15px "Pixelify Sans"`), document.fonts.load(`9px "Silkscreen"`)])
    : Promise.resolve();
  // Input must work even while external fonts are slow or unavailable.
  start();
  const refreshFonts = () => { if (!disposed) layoutAll(); };
  fontsReady.then(refreshFonts, refreshFonts);

  return () => {
    disposed = true;
    window.clearTimeout(copyTimer);
    cancelAnimationFrame(raf);
    ro.disconnect();
    titleTimers.forEach((id) => window.clearTimeout(id));
    cleanups.forEach((fn) => fn());
    roEls.forEach(({ s }) => s.remove());
    list.replaceChildren();
    segs.replaceChildren();
    img.onload = null;
  };
}
