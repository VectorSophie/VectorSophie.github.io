/**
 * Placeholder mixture-of-experts router.
 * Deterministic: keyword affinity plus seeded noise, softmaxed per layer, top-2 kept.
 * Swap `route()` for real router traces later; the renderer only needs a `Route`.
 */
import { EXPERTS } from "./data";

export const LAYERS = 6;
export const N_EXPERTS = EXPERTS.length;

export interface Route {
  /** probs[layer][expert], each layer sums to 1 */
  probs: number[][];
  /** mean probability per expert across layers */
  load: number[];
  /** [best, second] expert per layer */
  tops: [number, number][];
  top1: number;
  top2: number;
}

/** FNV-1a, mapped to [0, 1). */
export function hash(s: string): number {
  let x = 2166136261;
  for (const ch of s) {
    x ^= ch.codePointAt(0)!;
    x = Math.imul(x, 16777619);
  }
  return ((x >>> 0) % 100000) / 100000;
}

function affinity(tok: string, e: number): number {
  const t = tok.toLowerCase();
  const kw = EXPERTS[e].keywords;
  if (kw.includes(t)) return 1;
  for (const k of kw) {
    if (k.length > 2 && t.length > 2 && (t.includes(k) || k.includes(t))) return 0.6;
  }
  return 0;
}

function rank(v: number[]): number[] {
  return v.map((_, i) => i).sort((a, b) => v[b] - v[a]);
}

export function route(tok: string): Route {
  const probs: number[][] = [];
  const load = new Array<number>(N_EXPERTS).fill(0);
  const tops: [number, number][] = [];
  for (let l = 0; l < LAYERS; l++) {
    const logits = EXPERTS.map((_, e) => affinity(tok, e) * 2.4 + (hash(`${tok}|${l}|${e}`) - 0.5) * 2.8);
    const m = Math.max(...logits);
    const ex = logits.map((v) => Math.exp((v - m) / 0.8));
    const sum = ex.reduce((a, b) => a + b, 0);
    const p = ex.map((v) => v / sum);
    const o = rank(p);
    tops.push([o[0], o[1]]);
    p.forEach((v, i) => (load[i] += v / LAYERS));
    probs.push(p);
  }
  const o = rank(load);
  return { probs, load, tops, top1: o[0], top2: o[1] };
}
