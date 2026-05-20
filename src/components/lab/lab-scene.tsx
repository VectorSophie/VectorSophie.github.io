"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

const STATIONS = [
  { id: "optical", label: "OPTICAL ANALYSIS",   sublabel: "Writing · Philosophy · Observation", href: "/blogs"    },
  { id: "compute", label: "COMPUTATIONAL NODE",  sublabel: "Open Source · Systems · Code",       href: "/projects" },
  { id: "signal",  label: "SIGNAL PROCESSING",   sublabel: "Contact · Outbound Channels",        href: null        },
  { id: "archive", label: "ARCHIVE UNIT",         sublabel: "Operator Profile · Identity",        href: null        },
  { id: "chamber", label: "EXPERIMENT CHAMBER",   sublabel: "AI · Research · Active Systems",    href: null        },
] as const;
type StationId = (typeof STATIONS)[number]["id"];

export type BlogMeta = { title: string; url: string; publishedAt: string; source: "Naver" | "Velog" };
export type RepoMeta  = { name: string; url: string; language: string; stars: number };

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:         0x0E1820,
  bench:      0xDEF0F5,
  benchSide:  0xB8D5DE,
  benchEdge:  0x96BEC9,
  floor:      0x090F18,
  equip:      0x3B8098,
  equipDark:  0x1C4858,
  alum:       0x7ABAC8,
  alumDark:   0x2A5868,
  glass:      0x9ED8E8,
  screenDark: 0x061018,
  screenGlow: 0x00C8FF,
  indCyan:    0x00E5FF,
  indGreen:   0x00FFB0,
  indAmber:   0xD9B36A,
  shelf:      0xC8E8F0,
  boardDark:  0x091820,
  boardLine:  0x1AB8E0,
  fluid1:     0x00E5FF,
  fluid2:     0xD9B36A,
  fluid3:     0x39FF9A,
  fluid4:     0xFF6060,
  wall:       0x0C1A24,
  waveGreen:  0x00FF60,
} as const;

// ── Materials ────────────────────────────────────────────────────────────────
function makeMats() {
  const s = (c: number, r: number, mt: number, extra?: object) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt, ...(extra ?? {}) });
  return {
    bench:     s(C.bench,     0.55, 0.05),
    benchSide: s(C.benchSide, 0.60, 0.05),
    benchEdge: s(C.benchEdge, 0.50, 0.10),
    floor:     s(C.floor,     0.95, 0.00),
    equip:     s(C.equip,     0.45, 0.30),
    equipDark: s(C.equipDark, 0.50, 0.35),
    alum:      s(C.alum,      0.30, 0.65),
    alumDark:  s(C.alumDark,  0.35, 0.60),
    shelf:     s(C.shelf,     0.50, 0.05),
    wall:      s(C.wall,      0.98, 0.00, { emissive: 0x030810, emissiveIntensity: 0.20 }),
    glass: new THREE.MeshStandardMaterial({
      color: C.glass, roughness: 0.04, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
    }),
    screen: new THREE.MeshStandardMaterial({
      color: C.screenDark, roughness: 0.4, metalness: 0.1,
      emissive: C.screenGlow, emissiveIntensity: 0.55,
    }),
    boardSurf: new THREE.MeshStandardMaterial({
      color: C.boardDark, roughness: 0.85, emissive: 0x040C14, emissiveIntensity: 0.3,
    }),
    fill: (color: number, opacity = 0.65) =>
      new THREE.MeshStandardMaterial({
        color, roughness: 0.05, transparent: true, opacity,
        side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.22,
      }),
    emit: (color: number, intensity = 1.4) =>
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3 }),
  };
}
type Mats = ReturnType<typeof makeMats>;

// ── Glow sprite helpers ───────────────────────────────────────────────────────
function makeGlowTexture(): THREE.Texture {
  const sz = 128;
  const canvas = document.createElement("canvas");
  canvas.width = sz; canvas.height = sz;
  const ctx = canvas.getContext("2d")!;
  const gr = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
  gr.addColorStop(0,    "rgba(255,255,255,1.0)");
  gr.addColorStop(0.12, "rgba(255,255,255,0.75)");
  gr.addColorStop(0.40, "rgba(255,255,255,0.18)");
  gr.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, sz, sz);
  return new THREE.CanvasTexture(canvas);
}

function makeGlowSprite(
  tex: THREE.Texture, color: number, size: number,
  baseOpacity = 0.55, pulseSpeed = 2.0
): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: tex, color: new THREE.Color(color),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    opacity: baseOpacity,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.setScalar(size);
  spr.userData.baseScale   = size;
  spr.userData.baseOpacity = baseOpacity;
  spr.userData.pulseSpeed  = pulseSpeed;
  return spr;
}

// ── Lathe helpers ─────────────────────────────────────────────────────────────
const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

function beakerGeo(r = 0.09, h = 0.28) {
  return new THREE.LatheGeometry([v2(r * 0.9, 0), v2(r, 0.01), v2(r, h - 0.02), v2(r * 1.06, h)], 24);
}
function erlenmeyerGeo(s = 1.0) {
  return new THREE.LatheGeometry([
    v2(0.01, 0), v2(0.13 * s, 0.02 * s), v2(0.16 * s, 0.10 * s), v2(0.165 * s, 0.18 * s),
    v2(0.07 * s, 0.28 * s), v2(0.042 * s, 0.34 * s), v2(0.042 * s, 0.44 * s), v2(0.052 * s, 0.46 * s),
  ], 24);
}
function roundFlaskGeo(s = 1.0) {
  return new THREE.LatheGeometry([
    v2(0.01, 0), v2(0.11 * s, 0.03 * s), v2(0.17 * s, 0.12 * s), v2(0.185 * s, 0.20 * s),
    v2(0.17 * s, 0.28 * s), v2(0.09 * s, 0.33 * s), v2(0.038 * s, 0.36 * s),
    v2(0.036 * s, 0.50 * s), v2(0.048 * s, 0.52 * s),
  ], 24);
}

// ── Walls, ceiling & trim ─────────────────────────────────────────────────────
function buildEnvironment(scene: THREE.Scene, m: Mats) {
  // Back wall
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), m.wall);
  bw.position.set(-0.5, 4.5, -6.2);
  bw.receiveShadow = true;
  scene.add(bw);

  // Left side wall
  const lw = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), m.wall);
  lw.rotation.y = Math.PI / 2;
  lw.position.set(-5.8, 4.5, 0.5);
  lw.receiveShadow = true;
  scene.add(lw);

  // Ceiling
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x080E16, roughness: 0.99, emissive: 0x020608, emissiveIntensity: 0.15,
  });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(-0.5, 6.0, 0.5);
  scene.add(ceil);

  // Glowing teal accent strip along top of back wall
  const accentMat = new THREE.MeshStandardMaterial({
    color: C.boardLine, emissive: C.boardLine, emissiveIntensity: 0.65,
    transparent: true, opacity: 0.55,
  });
  const accentStrip = new THREE.Mesh(new THREE.BoxGeometry(24, 0.03, 0.05), accentMat);
  accentStrip.position.set(-0.5, 6.12, -6.17);
  scene.add(accentStrip);

  // Baseboard
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x162230, roughness: 0.92 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(24, 0.18, 0.05), baseMat);
  base.position.set(-0.5, 0.09, -6.17);
  scene.add(base);

  // Wall cabinet (upper-left)
  const cabG = new THREE.Group();
  cabG.position.set(-4.6, 3.8, -5.8);
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 0.45), m.equipDark);
  cabG.add(cabBody);
  const doorMat = new THREE.MeshStandardMaterial({
    color: C.alumDark, roughness: 0.35, metalness: 0.55,
    transparent: true, opacity: 0.85,
  });
  [[-0.52, 0], [0.52, 0]].forEach(([dx]) => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.28, 0.04), doorMat);
    door.position.set(dx, 0, 0.245);
    cabG.add(door);
    // door handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), m.alum);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(dx > 0 ? -0.25 : 0.25, 0, 0.275);
    cabG.add(handle);
  });
  // Glassware silhouettes inside cabinet
  [[-0.55, -0.22], [0, -0.22], [0.55, -0.22], [-0.28, 0.12], [0.28, 0.12]].forEach(([cx, cy]) => {
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, 0.55, 10),
      new THREE.MeshStandardMaterial({ color: 0x1E5060, roughness: 0.2, transparent: true, opacity: 0.7 })
    );
    bottle.position.set(cx, cy, 0.08);
    cabG.add(bottle);
  });
  scene.add(cabG);

  return { accentMat };
}

// ── Overhead fluorescent lamp ─────────────────────────────────────────────────
function buildOverheadLamp(scene: THREE.Scene, m: Mats) {
  const g = new THREE.Group();
  g.position.set(0.5, 5.85, -0.6);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.10, 0.24), m.alumDark);
  g.add(housing);

  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xF0F8FF, emissive: 0xD8EEFF, emissiveIntensity: 3.2,
    transparent: true, opacity: 0.90,
  });
  const tube1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.2, 8), lampMat);
  tube1.rotation.z = Math.PI / 2;
  tube1.position.set(0, -0.018, -0.06);
  g.add(tube1);
  const tube2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.2, 8), lampMat);
  tube2.rotation.z = Math.PI / 2;
  tube2.position.set(0, -0.018, 0.06);
  g.add(tube2);

  [-1.5, 1.5].forEach(x => {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.30, 0.046), m.alumDark);
    br.position.set(x, 0.20, 0);
    g.add(br);
  });

  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.016, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xEEF6FF, transparent: true, opacity: 0.18, roughness: 0.9 })
  );
  diffuser.position.y = -0.058;
  g.add(diffuser);

  scene.add(g);

  const lampLight = new THREE.PointLight(0xCCE8FF, 2.8, 9.5);
  lampLight.position.set(0.5, 5.55, -0.6);
  scene.add(lampLight);

  return { lampMat, lampLight };
}

// ── L-shaped bench ────────────────────────────────────────────────────────────
function buildBench(scene: THREE.Scene, m: Mats, interactable: THREE.Object3D[]) {
  const g  = new THREE.Group();
  const TH = 0.12;
  const BY = 1.20;
  const PH = BY - TH;

  const mainTop = new THREE.Mesh(new THREE.BoxGeometry(8.0, TH, 2.8), m.bench);
  mainTop.position.set(0, BY, -0.5); mainTop.castShadow = true; mainTop.receiveShadow = true;
  g.add(mainTop);

  const sideTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, TH, 4.0), m.bench);
  sideTop.position.set(3.9, BY, 2.3); sideTop.castShadow = true; sideTop.receiveShadow = true;
  g.add(sideTop);

  const fp1 = new THREE.Mesh(new THREE.BoxGeometry(8.0, PH, 0.05), m.benchSide);
  fp1.position.set(0, PH / 2, 0.925); g.add(fp1);
  const fp2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, PH, 0.05), m.benchSide);
  fp2.position.set(3.9, PH / 2, 4.325); g.add(fp2);
  const rp = new THREE.Mesh(new THREE.BoxGeometry(0.05, PH, 4.0), m.benchSide);
  rp.position.set(5.325, PH / 2, 2.3); g.add(rp);
  const lp = new THREE.Mesh(new THREE.BoxGeometry(0.05, PH, 2.8), m.benchSide);
  lp.position.set(-4.025, PH / 2, -0.5); g.add(lp);
  const bp = new THREE.Mesh(new THREE.BoxGeometry(6.5, PH, 0.05), m.benchSide);
  bp.position.set(-0.75, PH / 2, -1.925); g.add(bp);

  const es1 = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.02, 0.05), m.benchEdge);
  es1.position.set(0, BY + 0.01, 0.94); g.add(es1);
  const es2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.02, 0.05), m.benchEdge);
  es2.position.set(3.9, BY + 0.01, 4.34); g.add(es2);

  [-3.2, 2.5].forEach(x => {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, PH - 0.04, 2.7), m.benchSide);
    sp.position.set(x, (PH - 0.04) / 2, -0.5); g.add(sp);
  });

  const bs = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.05, 2.7), m.benchSide);
  bs.position.set(0, 0.08, -0.5); g.add(bs);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, PH - 0.04, 3.8), m.equipDark);
  cab.position.set(3.9, (PH - 0.04) / 2, 2.3); g.add(cab);

  for (let i = 0; i < 3; i++) {
    const df = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.32, 0.05), m.alum);
    df.position.set(3.9, 0.22 + i * 0.36, 4.22);
    df.userData.stationId = "archive"; df.castShadow = true;
    g.add(df); interactable.push(df);
    const dh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.024, 0.024), m.alumDark);
    dh.position.set(3.9, 0.22 + i * 0.36, 4.258); g.add(dh);
  }

  scene.add(g);
  return g;
}

// ── Floating shelf with glassware ─────────────────────────────────────────────
function buildShelf(scene: THREE.Scene, m: Mats) {
  const g = new THREE.Group();
  g.position.set(-2.2, 3.30, -3.5);

  const board = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.07, 0.50), m.shelf);
  board.castShadow = true; g.add(board);

  [-1.1, 1.1].forEach(x => {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.46), m.alumDark);
    br.position.set(x, -0.245, 0); g.add(br);
  });

  const SY = 0.038;
  const rbf = new THREE.Mesh(roundFlaskGeo(0.72), m.glass);
  rbf.position.set(-0.85, SY, 0); g.add(rbf);
  const rbfF = new THREE.Mesh(roundFlaskGeo(0.66), m.fill(C.fluid2, 0.60));
  rbfF.position.set(-0.85, SY, 0); rbfF.scale.set(0.84, 0.46, 0.84); g.add(rbfF);

  const erl = new THREE.Mesh(erlenmeyerGeo(0.82), m.glass);
  erl.position.set(0.10, SY, 0); g.add(erl);
  const erlF = new THREE.Mesh(erlenmeyerGeo(0.76), m.fill(C.fluid1, 0.55));
  erlF.position.set(0.10, SY, 0); erlF.scale.set(0.88, 0.44, 0.88); g.add(erlF);

  const bkr = new THREE.Mesh(beakerGeo(0.10, 0.30), m.glass);
  bkr.position.set(1.0, SY, 0); g.add(bkr);
  const bkrF = new THREE.Mesh(beakerGeo(0.092, 0.155), m.fill(C.fluid3, 0.62));
  bkrF.position.set(1.0, SY, 0); g.add(bkrF);

  // Second shelf
  const g2 = new THREE.Group();
  g2.position.set(-2.2, 2.62, -3.5);
  const board2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 0.44), m.shelf);
  board2.castShadow = true; g2.add(board2);
  [-1.1, 1.1].forEach(x => {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.40), m.alumDark);
    br.position.set(x, -0.19, 0); g2.add(br);
  });
  [[-0.75, C.fluid4], [0, C.fluid3], [0.75, C.fluid1]].forEach(([cx, fl]) => {
    const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.28, 14), m.glass);
    bt.position.set(cx as number, 0.07, 0); g2.add(bt);
    const bf = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.14, 14), m.fill(fl as number, 0.65));
    bf.position.set(cx as number, 0.07, 0); g2.add(bf);
  });
  scene.add(g2);

  scene.add(g);
}

// ── Blackboard / display panel ────────────────────────────────────────────────
function buildBlackboard(scene: THREE.Scene, m: Mats) {
  const g = new THREE.Group();
  g.position.set(4.2, 2.9, -3.4);
  g.rotation.y = -Math.PI / 4;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 0.10), m.alumDark);
  g.add(frame);

  const surf = new THREE.Mesh(new THREE.BoxGeometry(3.16, 1.96, 0.018), m.boardSurf);
  surf.position.z = 0.062; g.add(surf);

  const lineMat = new THREE.MeshStandardMaterial({
    color: C.boardLine, emissive: C.boardLine, emissiveIntensity: 0.75,
    transparent: true, opacity: 0.65,
  });
  [-0.55, 0, 0.55].forEach(y => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.006, 0.008), lineMat);
    l.position.set(0, y, 0.075); g.add(l);
  });
  [-0.75, 0, 0.75].forEach(x => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.006, 1.5, 0.008), lineMat);
    l.position.set(x, 0, 0.075); g.add(l);
  });
  [[-0.75, 0.55], [0, 0.55], [0.75, 0.55], [0.75, -0.55], [-0.75, -0.55], [0, -0.55]].forEach(([x, y]) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), m.emit(C.indCyan, 1.8));
    d.position.set(x, y, 0.079); g.add(d);
  });

  const scr = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.012), m.screen);
  scr.position.set(-0.1, 0.05, 0.079); g.add(scr);

  [-1.3, 1.3].forEach(x => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.80, 0.05), m.alumDark);
    leg.position.set(x, -1.50, 0); g.add(leg);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.14), m.alumDark);
    ft.position.set(x, -1.88, 0); g.add(ft);
  });

  scene.add(g);
  return { lineMat };
}

// ── Muffle furnace ────────────────────────────────────────────────────────────
function buildOven(scene: THREE.Scene, m: Mats, interactable: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.position.set(-3.1, 1.26, -1.2);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.50, 1.35), m.equipDark);
  body.position.y = 0.75; body.castShadow = true;
  body.userData.stationId = "chamber"; interactable.push(body); g.add(body);

  const door = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.20, 0.044), m.equip);
  door.position.set(0, 0.75, 0.700);
  door.userData.stationId = "chamber"; interactable.push(door); g.add(door);

  const winMat = new THREE.MeshStandardMaterial({
    color: 0x1A0A00, roughness: 0.1, emissive: 0x5C2000, emissiveIntensity: 1.2,
    transparent: true, opacity: 0.80,
  });
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.78, 0.012), winMat);
  win.position.set(0, 0.80, 0.730); g.add(win);

  const hndl = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.55, 0.036), m.alum);
  hndl.position.set(-0.55, 0.75, 0.742); g.add(hndl);

  for (let i = 0; i < 5; i++) {
    const sl = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.015, 0.016), m.alumDark);
    sl.position.set(0.50, 0.44 + i * 0.20, 0.710); g.add(sl);
  }

  [{ c: C.indAmber, x: 0.48, intensity: 2.5 }, { c: C.indGreen, x: 0.36, intensity: 1.8 }].forEach(({ c, x, intensity }) => {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), m.emit(c, intensity));
    led.position.set(x, 1.35, 0.712); g.add(led);
  });

  [0.25, 0.50].forEach(x => {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.045, 16), m.alum);
    k.rotation.x = Math.PI / 2; k.position.set(x, 0.28, 0.728); g.add(k);
  });

  const tv = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.025, 1.1), m.alumDark);
  tv.position.set(0, 1.513, 0.06); g.add(tv);

  scene.add(g);
  return { winMat };
}

// ── Server tower ──────────────────────────────────────────────────────────────
function buildServer(scene: THREE.Scene, m: Mats, interactable: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.position.set(-1.3, 1.26, -1.7);

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.75, 0.90), m.equipDark);
  chassis.position.y = 0.875; chassis.castShadow = true;
  chassis.userData.stationId = "compute"; interactable.push(chassis); g.add(chassis);

  const leds: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.30, 0.70), m.equip);
    bay.position.set(0, 0.22 + i * 0.36, 0.04);
    bay.userData.stationId = "compute"; interactable.push(bay); g.add(bay);

    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.036, 0.036, 0.009),
      m.emit(i % 2 ? C.indCyan : C.indGreen, 2.4)
    );
    led.position.set(-0.36, 0.22 + i * 0.36, 0.460);
    g.add(led); leds.push(led);
  }

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.22, 0.010), m.screen);
  panel.position.set(0.12, 1.64, 0.462); g.add(panel);

  const pwr = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 8, 24), m.emit(C.indCyan, 1.5));
  pwr.position.set(-0.34, 1.64, 0.464); g.add(pwr);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.014, 0.008), m.emit(C.indCyan, 0.6));
  strip.position.set(0, 1.82, 0.456); g.add(strip);

  const cables = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.40, 0.12), m.alumDark);
  cables.position.set(0, 0.28, -0.510); g.add(cables);

  scene.add(g);
  return { leds };
}

// ── Compound microscope ───────────────────────────────────────────────────────
function buildMicroscope(scene: THREE.Scene, m: Mats, interactable: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.position.set(0.9, 1.26, -1.2);

  const tag = (o: THREE.Mesh) => { o.userData.stationId = "optical"; interactable.push(o); return o; };

  const base = tag(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.58), m.alumDark));
  base.castShadow = true; g.add(base);

  const col = tag(new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.60, 0.13), m.alum));
  col.position.set(-0.19, 0.845, 0.05); g.add(col);

  const head = tag(new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.13), m.alum));
  head.position.set(-0.04, 1.60, 0.05); g.add(head);

  const stage = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.036, 32), m.alum));
  stage.position.set(0, 0.68, 0); g.add(stage);

  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.038, 16), m.equipDark);
  hole.position.set(0, 0.680, 0); g.add(hole);

  [-0.20, 0.20].forEach(x => {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.013, 0.062), m.alumDark);
    clip.position.set(x, 0.700, 0.12); g.add(clip);
  });

  const tube = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.68, 16), m.alum));
  tube.position.set(0.02, 1.28, 0); g.add(tube);

  const nose = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.098, 0.038, 24), m.alumDark));
  nose.position.set(0.02, 0.90, 0); g.add(nose);

  [0, 2.094, 4.189].forEach((angle, i) => {
    const len = 0.075 + i * 0.040;
    const obj = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.016, len, 12), m.alum);
    obj.position.set(0.02 + Math.sin(angle) * 0.088, 0.900 - len / 2 - 0.020, Math.cos(angle) * 0.088);
    g.add(obj);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.009, 8),
      new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.02, transparent: true, opacity: 0.6 }));
    tip.position.set(0.02 + Math.sin(angle) * 0.088, 0.900 - len - 0.029, Math.cos(angle) * 0.088);
    g.add(tip);
  });

  const eye = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.046, 0.24, 16), m.alumDark));
  eye.position.set(0.02, 1.72, 0); g.add(eye);

  const eyeRim = new THREE.Mesh(new THREE.CylinderGeometry(0.060, 0.053, 0.055, 16), m.equip);
  eyeRim.position.set(0.02, 1.868, 0); g.add(eyeRim);

  const eyeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.008, 16),
    new THREE.MeshStandardMaterial({
      color: C.glass, roughness: 0.02, transparent: true, opacity: 0.55,
      emissive: C.indCyan, emissiveIntensity: 0.3,
    }));
  eyeLens.position.set(0.02, 1.900, 0); g.add(eyeLens);

  [[0.052, 0.090], [0.038, 0.065]].forEach(([r, len], i) => {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 18), m.alum);
    k.rotation.z = Math.PI / 2; k.position.set(-0.28, 0.82 - i * 0.08, 0.05); g.add(k);
  });

  const illBase = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.14, 16), m.equip);
  illBase.position.set(0, 0.37, 0); g.add(illBase);

  const illLed = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.009, 16), m.emit(C.indCyan, 3.5));
  illLed.position.set(0, 0.446, 0); g.add(illLed);

  const illLight = new THREE.PointLight(C.indCyan, 0.7, 1.6);
  illLight.position.set(0, 0.75, 0); g.add(illLight);

  scene.add(g);
  return { illLed, illLight };
}

// ── Bunsen burner + tripod + flask ────────────────────────────────────────────
function buildBunsenSetup(scene: THREE.Scene, m: Mats, interactable: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.position.set(2.1, 1.26, -0.8);

  const tag = (o: THREE.Mesh) => { o.userData.stationId = "signal"; interactable.push(o); return o; };
  const RING_H = 0.66;
  const TRIP_R  = 0.34;

  [0, 2.094, 4.189].forEach(angle => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.72, 8), m.alumDark);
    leg.position.set(Math.sin(angle) * TRIP_R * 0.45, 0.33, Math.cos(angle) * TRIP_R * 0.45);
    leg.rotation.z = Math.sin(angle + 0.52) * 0.40;
    leg.rotation.x = Math.cos(angle + 0.52) * 0.40;
    g.add(leg);
  });

  const ring = tag(new THREE.Mesh(new THREE.TorusGeometry(TRIP_R * 0.78, 0.010, 8, 32), m.alum));
  ring.rotation.x = Math.PI / 2; ring.position.y = RING_H; g.add(ring);

  const bBase = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.080, 16), m.alumDark));
  bBase.position.y = 0.040; g.add(bBase);

  const bTube = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.48, 12), m.alumDark));
  bTube.position.y = 0.280; g.add(bTube);

  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 16), m.alum);
  valve.position.y = 0.22; g.add(valve);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.030, 0.072, 12), m.emit(C.indCyan, 4.5));
  flame.position.y = 0.56; g.add(flame);

  const flamePt = new THREE.PointLight(C.indCyan, 1.0, 1.6);
  flamePt.position.y = 0.60; g.add(flamePt);

  const flask = new THREE.Mesh(erlenmeyerGeo(0.92), m.glass);
  flask.position.y = RING_H - 0.02; g.add(flask);

  const fluidMesh = new THREE.Mesh(erlenmeyerGeo(0.86), m.fill(C.fluid1, 0.65));
  fluidMesh.position.y = RING_H - 0.02; fluidMesh.scale.set(0.86, 0.45, 0.86); g.add(fluidMesh);

  const fluidPt = new THREE.PointLight(C.fluid1, 0.45, 1.3);
  fluidPt.position.set(0, RING_H + 0.18, 0); g.add(fluidPt);

  scene.add(g);
  return { flame, flamePt, fluidPt, fluidMesh };
}

// ── Oscilloscope with animated waveform ───────────────────────────────────────
const WAVE_N = 96;
function buildOscilloscope(scene: THREE.Scene, m: Mats, interactable: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.position.set(2.7, 1.26, -1.65);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.82, 0.62), m.equipDark);
  body.position.y = 0.41; body.castShadow = true;
  body.userData.stationId = "compute"; interactable.push(body); g.add(body);

  // Screen bezel
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.56, 0.026), m.alumDark);
  bezel.position.set(-0.04, 0.50, 0.324); g.add(bezel);

  // Screen surface
  const scopeScreenMat = new THREE.MeshStandardMaterial({
    color: 0x020E06, roughness: 0.25, metalness: 0.05,
    emissive: 0x001803, emissiveIntensity: 1.0,
  });
  const scopeScreen = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.010), scopeScreenMat);
  scopeScreen.position.set(-0.04, 0.50, 0.338); g.add(scopeScreen);

  // Grid lines on screen (subtle)
  const gridMat = new THREE.MeshStandardMaterial({
    color: C.waveGreen, emissive: C.waveGreen, emissiveIntensity: 0.12,
    transparent: true, opacity: 0.18,
  });
  for (let i = -2; i <= 2; i++) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.004, 0.006), gridMat);
    hl.position.set(-0.04, 0.50 + i * 0.096, 0.345); g.add(hl);
    const vl = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.46, 0.006), gridMat);
    vl.position.set(-0.04 + i * 0.12, 0.50, 0.345); g.add(vl);
  }

  // Channel 1 waveform (green)
  const wavePositions = new Float32Array(WAVE_N * 3);
  const waveGeo = new THREE.BufferGeometry();
  waveGeo.setAttribute("position", new THREE.BufferAttribute(wavePositions, 3));
  const waveMat = new THREE.LineBasicMaterial({ color: C.waveGreen, transparent: true, opacity: 0.92 });
  const waveLine = new THREE.Line(waveGeo, waveMat);
  waveLine.position.set(-0.04, 0.50, 0.348);
  g.add(waveLine);

  // Channel 2 (amber, flat reference)
  const refPositions = new Float32Array(WAVE_N * 3);
  const refGeo = new THREE.BufferGeometry();
  refGeo.setAttribute("position", new THREE.BufferAttribute(refPositions, 3));
  const refMat = new THREE.LineBasicMaterial({ color: C.indAmber, transparent: true, opacity: 0.45 });
  const refLine = new THREE.Line(refGeo, refMat);
  refLine.position.set(-0.04, 0.50, 0.349);
  g.add(refLine);

  // Knobs (right panel)
  [[0.36, 0.68], [0.36, 0.50], [0.36, 0.32], [0.36, 0.14]].forEach(([x, y]) => {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.028, 12), m.alum);
    k.rotation.x = Math.PI / 2; k.position.set(x, y, 0.336); g.add(k);
    // Knob indicator line
    const ind = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.030, 0.006), m.alumDark);
    ind.position.set(x, y + 0.033, 0.337); g.add(ind);
  });

  // BNC connectors
  [[-0.24, 0.06], [0.10, 0.06]].forEach(([cx, cy]) => {
    const bnc = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.034, 10), m.alum);
    bnc.rotation.x = Math.PI / 2; bnc.position.set(cx, cy, 0.336); g.add(bnc);
    const bncHole = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.036, 8), m.equipDark);
    bncHole.rotation.x = Math.PI / 2; bncHole.position.set(cx, cy, 0.340); g.add(bncHole);
  });

  // Power LED
  const pwrLed = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), m.emit(C.indGreen, 2.2));
  pwrLed.position.set(0.36, 0.76, 0.336); g.add(pwrLed);

  // Power label
  const brandStrip = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.038, 0.008), m.alumDark);
  brandStrip.position.set(-0.04, 0.78, 0.334); g.add(brandStrip);

  scene.add(g);
  return { wavePositions, waveGeo, refPositions, refGeo };
}

// ── Centrifuge ────────────────────────────────────────────────────────────────
function buildCentrifuge(scene: THREE.Scene, m: Mats, interactable: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.position.set(-0.55, 1.26, 0.45);

  // Base housing
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 0.15, 32), m.equip);
  base.position.y = 0.075; base.castShadow = true;
  base.userData.stationId = "chamber"; interactable.push(base); g.add(base);

  // Main cylinder body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.32, 32), m.equip);
  body.position.y = 0.31; body.castShadow = true;
  body.userData.stationId = "chamber"; interactable.push(body); g.add(body);

  // Lid dome
  const lidMat = new THREE.MeshStandardMaterial({
    color: C.alumDark, roughness: 0.20, metalness: 0.55,
    transparent: true, opacity: 0.82,
  });
  const lidGeo = new THREE.LatheGeometry([
    v2(0.01, 0), v2(0.34, 0.01), v2(0.35, 0.02), v2(0.30, 0.12), v2(0.15, 0.22), v2(0.02, 0.28),
  ], 32);
  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.y = 0.47;
  lid.userData.stationId = "chamber"; interactable.push(lid); g.add(lid);

  // Rotor (spins)
  const rotor = new THREE.Group();
  rotor.position.y = 0.50;
  const rotorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.055, 16), m.alumDark);
  rotor.add(rotorHub);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const slot = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.16, 8), m.alumDark);
    slot.position.set(Math.sin(angle) * 0.21, -0.05, Math.cos(angle) * 0.21);
    slot.rotation.x = 0.32;
    rotor.add(slot);
    // Tube caps
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.012, 8),
      m.fill(i % 3 === 0 ? C.fluid1 : i % 3 === 1 ? C.fluid3 : C.fluid4, 0.8));
    cap.position.set(Math.sin(angle) * 0.21, -0.12, Math.cos(angle) * 0.21);
    rotor.add(cap);
  }
  g.add(rotor);

  // Control panel on body side
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.015), m.equipDark);
  panel.position.set(0.28, 0.22, 0.24); panel.rotation.y = -0.40; g.add(panel);

  const disp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.072, 0.010), m.screen);
  disp.position.set(0.29, 0.22, 0.248); disp.rotation.y = -0.40; g.add(disp);

  [C.indGreen, C.indAmber].forEach((c, i) => {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), m.emit(c, 2.0));
    led.position.set(0.42 + i * 0.03, 0.22, 0.20); led.rotation.y = -0.40; g.add(led);
  });

  // Rubber feet
  [-0.28, 0.28].forEach(x => [-0.28, 0.28].forEach(z => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.020, 8), m.alumDark);
    foot.position.set(x, 0.01, z); g.add(foot);
  }));

  scene.add(g);
  return { rotor };
}

// ── UV-Vis Spectrophotometer ──────────────────────────────────────────────────
function buildSpectrophotometer(scene: THREE.Scene, m: Mats, interactable: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.position.set(1.6, 1.26, 0.32);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.58, 0.72), m.equip);
  body.position.y = 0.29; body.castShadow = true;
  body.userData.stationId = "chamber"; interactable.push(body); g.add(body);

  // Sample compartment lid
  const compLid = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.065, 0.36), m.alumDark);
  compLid.position.set(-0.18, 0.62, 0.06); g.add(compLid);

  // Sample compartment recess
  const compRecess = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.30), m.equipDark);
  compRecess.position.set(-0.18, 0.56, 0.06); g.add(compRecess);

  // Cuvette holder
  const cuvetteBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.12, 0.010),
    new THREE.MeshStandardMaterial({ color: C.indCyan, emissive: C.indCyan, emissiveIntensity: 2.2, transparent: true, opacity: 0.9 })
  );
  cuvetteBeam.position.set(-0.18, 0.52, 0.175); g.add(cuvetteBeam);

  // Cuvette (sample)
  const cuvetteMat = new THREE.MeshStandardMaterial({
    color: C.fluid3, roughness: 0.04, transparent: true, opacity: 0.55,
    emissive: C.fluid3, emissiveIntensity: 0.25,
  });
  const cuvette = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.04), cuvetteMat);
  cuvette.position.set(-0.18, 0.56, 0.06); g.add(cuvette);

  // Detector side glow
  const detGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.10, 0.010),
    new THREE.MeshStandardMaterial({ color: C.fluid3, emissive: C.fluid3, emissiveIntensity: 1.8 })
  );
  detGlow.position.set(-0.18, 0.52, -0.065); g.add(detGlow);
  const detLight = new THREE.PointLight(C.fluid3, 0.3, 0.8);
  detLight.position.set(-0.18, 0.52, -0.07); g.add(detLight);

  // Digital display
  const dispMat = new THREE.MeshStandardMaterial({
    color: 0x020C06, roughness: 0.3, emissive: C.waveGreen, emissiveIntensity: 0.35,
  });
  const disp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.012), dispMat);
  disp.position.set(0.34, 0.38, 0.365); g.add(disp);

  // Wavelength scale (decorative lines on display)
  const scaleMat = new THREE.MeshStandardMaterial({
    color: C.waveGreen, emissive: C.waveGreen, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.6,
  });
  for (let i = 0; i < 5; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.04 + (i === 2 ? 0.06 : 0), 0.006), scaleMat);
    tick.position.set(0.34 + (i - 2) * 0.062, 0.30, 0.372); g.add(tick);
  }
  const absLine = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.15, 0.006),
    new THREE.MeshStandardMaterial({ color: C.waveGreen, emissive: C.waveGreen, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 }));
  absLine.position.set(0.34 + 0.04, 0.36, 0.373); g.add(absLine);

  // Control buttons
  [0.18, 0.28, 0.38, 0.48].forEach((x, i) => {
    const btn = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.028, 0.016), i === 0 ? m.emit(C.indCyan, 1.0) : m.alumDark);
    btn.position.set(x, 0.16, 0.369); g.add(btn);
  });

  // USB port
  const usb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, 0.018), m.alumDark);
  usb.position.set(0.55, 0.16, 0.370); g.add(usb);

  scene.add(g);
  return { detLight };
}

// ── Scatter items ─────────────────────────────────────────────────────────────
function buildScatterItems(scene: THREE.Scene, m: Mats) {
  [
    { x:  0.3, z: -0.2, fl: C.fluid4 },
    { x:  1.2, z: -0.4, fl: C.fluid3 },
    { x: -0.4, z:  0.15, fl: C.fluid2 },
  ].forEach(({ x, z, fl }) => {
    const Y = 1.285;
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.130, 0.120, 0.024, 28), m.glass);
    dish.position.set(x, Y, z); scene.add(dish);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.104, 0.013, 24), m.fill(fl, 0.55));
    fill.position.set(x, Y, z); scene.add(fill);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.128, 0.016, 28), m.glass);
    lid.position.set(x, Y + 0.022, z); scene.add(lid);
  });

  // Digital scale (side arm)
  const sg = new THREE.Group();
  sg.position.set(3.6, 1.26, 0.8);
  const scaleBase = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.058, 0.54), m.equip);
  scaleBase.position.y = 0.029; sg.add(scaleBase);
  const platf = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.022, 0.42), m.alum);
  platf.position.y = 0.072; sg.add(platf);
  const disp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.095, 0.012), m.screen);
  disp.position.set(-0.21, 0.092, 0.285); sg.add(disp);
  const sampleBkr = new THREE.Mesh(beakerGeo(0.042, 0.090), m.glass);
  sampleBkr.position.set(0.08, 0.072, 0); sg.add(sampleBkr);
  const sampleF = new THREE.Mesh(beakerGeo(0.036, 0.044), m.fill(C.fluid2, 0.62));
  sampleF.position.set(0.08, 0.072, 0); sg.add(sampleF);
  scene.add(sg);

  // Mortar & pestle
  const mg = new THREE.Group();
  mg.position.set(3.9, 1.26, 2.1);
  mg.add(new THREE.Mesh(new THREE.LatheGeometry([
    v2(0.01, 0), v2(0.07, 0.01), v2(0.12, 0.06), v2(0.135, 0.14), v2(0.12, 0.23), v2(0.08, 0.255),
  ], 24), m.alum));
  mg.add(new THREE.Mesh(new THREE.LatheGeometry([
    v2(0.01, 0), v2(0.065, 0.01), v2(0.102, 0.08), v2(0.102, 0.14),
  ], 24), m.fill(C.fluid3, 0.75)));
  const pest = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.030, 0.32, 12), m.alum);
  pest.position.set(0.065, 0.25, 0); pest.rotation.z = -0.38; mg.add(pest);
  scene.add(mg);

  // Test tube rack
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.055, 0.10), m.alumDark);
  rack.position.set(-1.0, 1.297, -1.85); scene.add(rack);
  [C.fluid1, C.fluid3, C.fluid2, C.fluid4].forEach((fl, i) => {
    const x = -1.0 + (i - 1.5) * 0.068;
    const tt = new THREE.Mesh(new THREE.LatheGeometry([v2(0, 0), v2(0.022, 0), v2(0.022, 0.18), v2(0.025, 0.19)], 16), m.glass);
    tt.position.set(x, 1.33, -1.85); scene.add(tt);
    const tf = new THREE.Mesh(new THREE.LatheGeometry([v2(0, 0), v2(0.017, 0), v2(0.017, 0.09)], 16), m.fill(fl, 0.72));
    tf.position.set(x, 1.33, -1.85); scene.add(tf);
  });

  // Bench beakers
  [
    { x: -1.9, z: -0.4, r: 0.065, h: 0.20, fl: C.fluid1 },
    { x:  1.6, z: -1.1, r: 0.080, h: 0.25, fl: C.fluid2 },
  ].forEach(({ x, z, r, h, fl }) => {
    const bk = new THREE.Mesh(beakerGeo(r, h), m.glass);
    bk.position.set(x, 1.27, z); scene.add(bk);
    const bf = new THREE.Mesh(beakerGeo(r * 0.90, h * 0.50), m.fill(fl, 0.62));
    bf.position.set(x, 1.27, z); scene.add(bf);
  });

  // Tablet readout (side arm)
  const tg = new THREE.Group();
  tg.position.set(4.8, 1.26, 1.8);
  const tabBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.42), m.equipDark);
  tabBody.position.y = 0.018; tg.add(tabBody);
  const tabScr = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.010, 0.34), m.screen);
  tabScr.position.y = 0.038; tg.add(tabScr);
  scene.add(tg);

  // Notebook & pen (personal touch)
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.018, 0.28), m.shelf);
  book.position.set(-2.8, 1.275, 0.40); scene.add(book);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.020, 0.28),
    new THREE.MeshStandardMaterial({ color: C.boardLine, emissive: C.boardLine, emissiveIntensity: 0.3 }));
  spine.position.set(-3.0, 1.278, 0.40); scene.add(spine);
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.32, 8), m.alum);
  pen.rotation.z = 0.22; pen.position.set(-2.60, 1.283, 0.50); scene.add(pen);
}

// ── Dust particle system ──────────────────────────────────────────────────────
const DUST_COUNT = 300;
function buildDustParticles(scene: THREE.Scene) {
  const positions = new Float32Array(DUST_COUNT * 3);
  const velocities = new Float32Array(DUST_COUNT * 3);

  for (let i = 0; i < DUST_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = Math.random() * 5.0 + 0.3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    velocities[i * 3]     = (Math.random() - 0.5) * 0.0022;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.00065;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.0018;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0x8ED8E8, size: 0.022, transparent: true, opacity: 0.28,
    sizeAttenuation: true, depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return { points, positions, velocities };
}

// ── Camera constants ──────────────────────────────────────────────────────────
const FRUSTUM_SIZE  = 11;
// True isometric: equal X and Z (45° horizontal), moderate elevation to show instrument faces
const CAM_BASE      = new THREE.Vector3(14, 9, 14);
const CAM_LOOK_BASE = new THREE.Vector3(0, 1.2, 0.5);
const CAM_INTRO_START = CAM_BASE.clone().multiplyScalar(1.55);

// ── Static panel data ─────────────────────────────────────────────────────────
const LANG_COLOR: Record<string, string> = {
  TypeScript: "#7FB7C9", JavaScript: "#D9B36A", Python: "#A8D8E8",
  HTML: "#D98A6A", Go: "#7BBF8E", Rust: "#E07B5A", C: "#8888AA",
};
const CHANNELS = [
  { label: "EMAIL",  value: "jay7math@gmail.com",   href: "mailto:jay7math@gmail.com"           },
  { label: "GITHUB", value: "VectorSophie",          href: "https://github.com/VectorSophie"     },
  { label: "NAVER",  value: "paranormalian",         href: "https://blog.naver.com/paranormalian" },
  { label: "VELOG",  value: "vectorsophie",          href: "https://velog.io/@vectorsophie/posts" },
];
const TECH_STACK = [
  { label: "LANG",  value: "TypeScript · Python · Rust · Go · C" },
  { label: "FE",    value: "React · Next.js · Svelte"              },
  { label: "BE",    value: "FastAPI · Supabase · Redis"            },
  { label: "ML/AI", value: "PyTorch · TensorFlow · Genkit"         },
  { label: "OPS",   value: "Docker · Vercel · GitHub Actions"      },
];
const LANGUAGES_DATA = [
  { code: "EN", note: "Primary" }, { code: "KO", note: "Native" },
  { code: "ES", note: "Conv."  }, { code: "ZH", note: "Learning" },
];
const NOTABLE_EXPERIMENTS = [
  { name: "doom-on-github",          lang: "C",      stars: 19, note: "DOOM via GitHub Actions" },
  { name: "ColdWarTerminal",         lang: "Rust",   stars: 0,  note: "CLI cold-war thriller"   },
  { name: "limbus-terminal-stream",  lang: "Rust",   stars: 3,  note: "Stream game → terminal"  },
  { name: "Lambda-pp",               lang: "TypeScript", stars: 1, note: "λ++ language interpreter" },
];

// ── Panel content components ──────────────────────────────────────────────────
function OpticalContent({ posts }: { posts: BlogMeta[] }) {
  return (
    <div className="flex gap-8 h-full">
      <div className="w-36 shrink-0 flex flex-col gap-4">
        <div>
          <div className="lab-label text-[#7A848E] mb-2">SIGNAL SOURCES</div>
          <div className="space-y-1.5">
            {[{ c: "#D9B36A", l: "NAVER BLOG" }, { c: "#7FB7C9", l: "VELOG" }].map(({ c, l }) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} aria-hidden />
                <span className="lab-label">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="lab-label text-[#7A848E] mb-1">ENTRIES</div>
          <div className="lab-mono text-[#444B54]">{posts.length} LOADED</div>
        </div>
        <div className="mt-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7BBF8E] pulse-dot" aria-hidden />
          <span className="lab-label text-[#7BBF8E]">CHANNEL CLEAR</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="space-y-2 flex-1">
          {posts.length > 0 ? posts.map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 group border border-[#CCC9C1] hover:border-[#7FB7C9] px-3 py-2.5 transition-colors duration-150 bg-[#E8E5DD]">
              <span className="lab-label px-1.5 py-0.5 border shrink-0"
                style={{ borderColor: p.source === "Naver" ? "#D9B36A" : "#7FB7C9", color: p.source === "Naver" ? "#D9B36A" : "#7FB7C9" }}>
                {p.source.toUpperCase()}
              </span>
              <span className="text-[13px] text-[#444B54] group-hover:text-[#7FB7C9] transition-colors truncate flex-1">{p.title}</span>
              <span className="lab-label text-[#7A848E] shrink-0">{p.publishedAt}</span>
            </a>
          )) : <div className="lab-label text-[#7A848E] opacity-50">NO TRANSMISSIONS AVAILABLE</div>}
        </div>
        <div className="flex justify-end">
          <a href="/blogs" className="lab-mono text-[#7FB7C9] hover:text-[#444B54] transition-colors">VIEW ALL ENTRIES →</a>
        </div>
      </div>
    </div>
  );
}

function ComputeContent({ repos }: { repos: RepoMeta[] }) {
  return (
    <div className="flex gap-8 h-full">
      <div className="w-36 shrink-0 flex flex-col gap-4">
        <div>
          <div className="lab-label text-[#7A848E] mb-1">NODES ONLINE</div>
          <div className="lab-mono text-[#444B54]">{repos.length} / 6</div>
        </div>
        <div>
          <div className="lab-label text-[#7A848E] mb-2">LANGUAGES</div>
          <div className="space-y-1.5">
            {Object.entries(LANG_COLOR).slice(0, 5).map(([lang, color]) => (
              <div key={lang} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} aria-hidden />
                <span className="lab-label">{lang}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="grid grid-cols-2 gap-2 flex-1">
          {repos.map(repo => {
            const color = LANG_COLOR[repo.language] ?? "#CCC9C1";
            return (
              <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2.5 group border border-[#CCC9C1] hover:border-[#7FB7C9] px-3 py-2 transition-colors duration-150 bg-[#E8E5DD] min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} aria-hidden />
                <span className="text-[12px] text-[#444B54] group-hover:text-[#7FB7C9] transition-colors truncate flex-1">{repo.name}</span>
                <span className="lab-label text-[#7A848E] shrink-0">★ {repo.stars}</span>
              </a>
            );
          })}
        </div>
        <div className="flex justify-end mt-2">
          <a href="/projects" className="lab-mono text-[#7FB7C9] hover:text-[#444B54] transition-colors">INSPECT ALL NODES →</a>
        </div>
      </div>
    </div>
  );
}

function SignalContent() {
  return (
    <div className="flex gap-10 h-full">
      <div className="flex-1">
        <div className="lab-label text-[#7A848E] mb-4">OUTBOUND CHANNELS</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {CHANNELS.map(({ label, value, href }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="lab-label w-14 shrink-0">{label}</span>
              <span className="lab-label text-[#CCC9C1]" aria-hidden>──</span>
              <a href={href} target={href.startsWith("mailto") ? undefined : "_blank"} rel="noopener noreferrer"
                 className="text-[13px] text-[#444B54] hover:text-[#7FB7C9] transition-colors">{value}</a>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-[#CCC9C1]">
          <div className="lab-label text-[#7A848E] mb-1">NOT ACCEPTING</div>
          <p className="text-xs text-[#444B54] opacity-60">Crypto opportunities · "star my repos and back" · suspicious MP4 PRs</p>
        </div>
      </div>
      <div className="w-40 shrink-0 flex flex-col gap-2.5">
        <div className="lab-label text-[#7A848E] mb-1">SIGNAL STATUS</div>
        {CHANNELS.map(({ label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7BBF8E] pulse-dot" aria-hidden />
            <span className="lab-label text-[#7BBF8E]">{label}: ONLINE</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchiveContent() {
  return (
    <div className="flex gap-8 h-full">
      <div className="w-48 shrink-0">
        <div className="lab-label text-[#7A848E] mb-3">OPERATOR LANGUAGES</div>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES_DATA.map(({ code, note }) => (
            <div key={code} className="border border-[#CCC9C1] px-3 py-2 bg-[#E8E5DD]">
              <div className="lab-mono text-[#444B54]">{code}</div>
              <div className="lab-label opacity-40 mt-0.5">{note}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4">
        {[
          { l: "DESIGNATION", v: "Jack B. (백동재) · Developer / Writer / Systems Researcher" },
          { l: "DOMAIN",      v: "AI Systems · Web Infrastructure · Rust Systems · Open Source" },
          { l: "LOCATION",    v: "Seoul, KR · UTC+9" },
        ].map(({ l, v }) => (
          <div key={l}>
            <div className="lab-label text-[#7A848E] mb-1">{l}</div>
            <div className="text-[13px] text-[#444B54]">{v}</div>
          </div>
        ))}
        <div>
          <div className="lab-label text-[#7A848E] mb-1">PHILOSOPHY</div>
          <p className="text-xs text-[#444B54] opacity-80 leading-relaxed">Open source turns private learning into public infrastructure.</p>
        </div>
      </div>
    </div>
  );
}

function ChamberContent() {
  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1">
        <div className="lab-label text-[#7A848E] mb-3">CAPABILITY MATRIX</div>
        <div className="space-y-2">
          {TECH_STACK.map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-4">
              <span className="lab-label w-14 shrink-0 text-[#7FB7C9]">{label}</span>
              <span className="w-px h-3 bg-[#CCC9C1] shrink-0" aria-hidden />
              <span className="text-[11px] text-[#444B54]">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-52 shrink-0 flex flex-col gap-3">
        <div>
          <div className="lab-label text-[#7A848E] mb-2">NOTABLE EXPERIMENTS</div>
          <div className="space-y-1.5">
            {NOTABLE_EXPERIMENTS.map(({ name, lang, stars, note }) => {
              const color = LANG_COLOR[lang] ?? "#CCC9C1";
              return (
                <a key={name} href={`https://github.com/VectorSophie/${name}`} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} aria-hidden />
                  <span className="lab-label text-[#444B54] group-hover:text-[#7FB7C9] transition-colors truncate">{name}</span>
                  {stars > 0 && <span className="lab-label opacity-40 shrink-0">★{stars}</span>}
                </a>
              );
            })}
          </div>
        </div>
        <div>
          <div className="lab-label text-[#7A848E] mb-2">ACTIVE SYSTEMS</div>
          <div className="space-y-1.5">
            {[
              { c: "#7FB7C9", cl: "pulse-dot-fast", l: "GENKIT · ONLINE"   },
              { c: "#7BBF8E", cl: "pulse-dot",      l: "GEMINI 2.5 FLASH"  },
              { c: "#A8D8E8", cl: "",               l: "LLM INFERENCE"      },
            ].map(({ c, cl, l }) => (
              <div key={l} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${cl}`} style={{ background: c }} aria-hidden />
                <span className="lab-label">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LabScene({ blogPosts = [], repos = [] }: { blogPosts?: BlogMeta[]; repos?: RepoMeta[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const animRef  = useRef<number>(0);

  const [hoveredId, setHoveredId] = useState<StationId | null>(null);
  const [activeId,  setActiveId]  = useState<StationId | null>(null);
  const [labelPos,  setLabelPos]  = useState<{ x: number; y: number } | null>(null);
  const [sysStatus, setSysStatus] = useState("NOMINAL");
  const [sysTime,   setSysTime]   = useState("");
  const [mounted,   setMounted]   = useState(false);

  const hoveredRef = useRef<StationId | null>(null);
  const activeRef  = useRef<StationId | null>(null);

  useEffect(() => {
    setMounted(true);
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.30;
    renderer.setClearColor(C.bg, 1);
    mount.appendChild(renderer.domElement);

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.FogExp2(C.bg, 0.022);

    // ── Camera ──
    const aspect = mount.clientWidth / mount.clientHeight;
    const camera = new THREE.OrthographicCamera(
      -FRUSTUM_SIZE * aspect / 2,  FRUSTUM_SIZE * aspect / 2,
       FRUSTUM_SIZE / 2,           -FRUSTUM_SIZE / 2,
       0.1, 200
    );
    camera.position.copy(CAM_INTRO_START);
    camera.lookAt(CAM_LOOK_BASE);

    const camPos     = new THREE.Vector3().copy(CAM_INTRO_START);
    const camLook    = new THREE.Vector3().copy(CAM_LOOK_BASE);
    const camLookTgt = new THREE.Vector3().copy(CAM_LOOK_BASE);
    const camPosTgt  = new THREE.Vector3();
    let introProgress = 0;

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xB0D0E0, 0.50));

    const keyLight = new THREE.DirectionalLight(0xD8EEFF, 2.4);
    keyLight.position.set(12, 20, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5; keyLight.shadow.camera.far = 60;
    keyLight.shadow.camera.left = -16; keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top  =  16; keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x3A6080, 0.50);
    fillLight.position.set(-10, 4, -8);
    scene.add(fillLight);

    const accentLight = new THREE.PointLight(C.indCyan, 1.4, 28);
    accentLight.position.set(-3.5, 3.5, 1); scene.add(accentLight);

    const ovenLight = new THREE.PointLight(0x6C2800, 2.0, 3.2);
    ovenLight.position.set(-3.1, 2.0, -0.8); scene.add(ovenLight);

    const benchFill = new THREE.PointLight(0x4A8FA0, 0.6, 7.0);
    benchFill.position.set(0, 1.8, 0.5); scene.add(benchFill);

    // ── Floor & grid ──
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.97 })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01;
    floor.receiveShadow = true; scene.add(floor);

    const grid = new THREE.GridHelper(40, 80, 0x182838, 0x182838);
    (grid.material as THREE.Material).opacity = 0.40;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0.002; scene.add(grid);

    // ── Build scene ──
    const mats = makeMats();
    const interactable: THREE.Object3D[] = [];

    buildEnvironment(scene, mats);
    const { lampMat, lampLight } = buildOverheadLamp(scene, mats);
    buildBench(scene, mats, interactable);
    buildShelf(scene, mats);
    const { lineMat }              = buildBlackboard(scene, mats);
    const { winMat }               = buildOven(scene, mats, interactable);
    const { leds }                 = buildServer(scene, mats, interactable);
    const { illLed, illLight }     = buildMicroscope(scene, mats, interactable);
    const { flame, flamePt, fluidPt, fluidMesh } = buildBunsenSetup(scene, mats, interactable);
    const { wavePositions, waveGeo, refPositions, refGeo } = buildOscilloscope(scene, mats, interactable);
    const { rotor: centrifugeRotor } = buildCentrifuge(scene, mats, interactable);
    buildSpectrophotometer(scene, mats, interactable);
    buildScatterItems(scene, mats);
    const { points: dustPoints, positions: dustPos, velocities: dustVel } = buildDustParticles(scene);
    const dustGeoAttr = dustPoints.geometry.attributes.position;

    // ── Glow sprites ──
    const glowTex = makeGlowTexture();
    const glowSprites: THREE.Sprite[] = [];

    function addGlow(wx: number, wy: number, wz: number, color: number, size: number, speed: number, opacity = 0.55) {
      const spr = makeGlowSprite(glowTex, color, size, opacity, speed);
      spr.position.set(wx, wy, wz);
      scene.add(spr);
      glowSprites.push(spr);
    }

    // Server LED glows (group at -1.3, 1.26, -1.7; LEDs at -0.36, 0.22+i*0.36, 0.460)
    for (let i = 0; i < 4; i++) {
      addGlow(-1.66, 1.48 + i * 0.36, -1.24, i % 2 ? C.indCyan : C.indGreen, 0.14, 3.0 + i * 0.4);
    }
    // Bunsen flame glow
    addGlow(2.1, 1.82, -0.8, C.indCyan, 0.40, 18.0, 0.65);
    // Microscope LED glow
    addGlow(0.90, 1.706, -1.2, C.indCyan, 0.20, 2.0);
    // Oven window glow
    addGlow(-3.1, 2.06, -0.47, 0xFF4400, 0.32, 0.9, 0.45);
    // Blackboard screen glow
    addGlow(4.18, 2.95, -3.35, C.screenGlow, 0.50, 0.7, 0.35);
    // Overhead lamp tube glow
    addGlow(0.5, 5.62, -0.6, 0xCCE8FF, 0.55, 0.4, 0.22);
    // Oscilloscope screen glow
    addGlow(2.66, 1.76, -1.312, C.waveGreen, 0.25, 0.8, 0.30);

    // ── Raycasting & interaction ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9, -9);
    let prevHovered: StationId | null = null;

    function processPointer(clientX: number, clientY: number) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(interactable, true);
      if (hits.length > 0) {
        const id = hits[0].object.userData.stationId as StationId;
        if (id !== prevHovered) {
          prevHovered = id; hoveredRef.current = id; setHoveredId(id);
          const wp = new THREE.Vector3();
          hits[0].object.getWorldPosition(wp);
          wp.y += 2.0; wp.project(camera);
          setLabelPos({
            x: ((wp.x + 1) / 2) * (mount?.clientWidth ?? 0),
            y: (-(wp.y - 1) / 2) * (mount?.clientHeight ?? 0),
          });
          renderer.domElement.style.cursor = "pointer";
        }
      } else if (prevHovered !== null) {
        prevHovered = null; hoveredRef.current = null;
        setHoveredId(null); setLabelPos(null);
        renderer.domElement.style.cursor = "default";
      }
    }

    const onMouseMove = (e: MouseEvent) => processPointer(e.clientX, e.clientY);
    const onClick = () => {
      if (hoveredRef.current) { activeRef.current = hoveredRef.current; setActiveId(hoveredRef.current); }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) processPointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      if (hoveredRef.current) { activeRef.current = hoveredRef.current; setActiveId(hoveredRef.current); }
    };

    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });
    renderer.domElement.addEventListener("touchend", onTouchEnd);

    // ── Animation loop ──
    const STATUSES = ["NOMINAL", "SCANNING", "CALIBRATING", "ANALYZING", "PROCESSING"];
    let idleTimer = 0, statusIdx = 0;
    const clock = new THREE.Clock(); let prevT = 0;

    function animate() {
      animRef.current = requestAnimationFrame(animate);
      const t  = clock.getElapsedTime();
      const dt = Math.min(t - prevT, 0.05); prevT = t;

      const hovered = hoveredRef.current;
      const active  = activeRef.current;

      // ── Bunsen flame ──
      flame.scale.set(
        1.0 + Math.sin(t * 17) * 0.10,
        1.0 + Math.sin(t * 22) * 0.16 + Math.cos(t * 7) * 0.08,
        1.0 + Math.sin(t * 14) * 0.10,
      );
      (flame.material as THREE.MeshStandardMaterial).emissiveIntensity = 4.0 + Math.sin(t * 21) * 0.9;
      flamePt.intensity = 0.8 + Math.sin(t * 19) * 0.35;
      fluidPt.intensity = 0.30 + Math.sin(t * 1.8) * 0.12;

      // ── Bunsen fluid gentle sloshing ──
      fluidMesh.scale.y = 0.45 + Math.sin(t * 0.7) * 0.018;

      // ── Server LEDs ──
      leds.forEach((led, i) => {
        (led.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.8 + Math.sin(t * 1.8 + i * 1.2) * 0.80;
      });

      // ── Microscope illuminator ──
      (illLed.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.0 + Math.sin(t * 0.9) * 0.55;
      illLight.intensity = 0.6 + Math.sin(t * 0.9) * 0.22;

      // ── Blackboard flicker ──
      lineMat.emissiveIntensity = 0.65 + Math.sin(t * 0.28) * 0.18 + (Math.random() < 0.003 ? -0.3 : 0);

      // ── Oven throb ──
      winMat.emissiveIntensity = 1.0 + Math.sin(t * 0.6) * 0.28;
      ovenLight.intensity = 1.8 + Math.sin(t * 0.6) * 0.45;

      // ── Overhead lamp flicker ──
      lampMat.emissiveIntensity = 3.0 + Math.sin(t * 0.12) * 0.35 + (Math.random() < 0.001 ? -0.8 : 0);
      lampLight.intensity = 2.6 + Math.sin(t * 0.12) * 0.3;

      // ── Accent pulse ──
      accentLight.intensity = 1.2 + Math.sin(t * 1.5) * 0.4;

      // ── Oscilloscope waveform ──
      for (let j = 0; j < WAVE_N; j++) {
        const tx = j / (WAVE_N - 1);
        wavePositions[j * 3]     = (tx - 0.5) * 0.56;
        wavePositions[j * 3 + 1] = Math.sin(tx * Math.PI * 5.5 + t * 2.0) * 0.088
                                  + Math.sin(tx * Math.PI * 2.2 + t * 0.85) * 0.028;
        wavePositions[j * 3 + 2] = 0;
      }
      waveGeo.attributes.position.needsUpdate = true;

      // Reference line (slow AM envelope)
      for (let j = 0; j < WAVE_N; j++) {
        const tx = j / (WAVE_N - 1);
        refPositions[j * 3]     = (tx - 0.5) * 0.56;
        refPositions[j * 3 + 1] = Math.sin(tx * Math.PI * 2 + t * 0.3) * 0.028;
        refPositions[j * 3 + 2] = 0;
      }
      refGeo.attributes.position.needsUpdate = true;

      // ── Centrifuge rotor ──
      centrifugeRotor.rotation.y += 0.10 + Math.sin(t * 0.18) * 0.02;

      // ── Dust particles ──
      for (let i = 0; i < DUST_COUNT; i++) {
        dustPos[i * 3]     += dustVel[i * 3];
        dustPos[i * 3 + 1] += dustVel[i * 3 + 1] + Math.sin(t * 0.35 + i * 0.72) * 0.00022;
        dustPos[i * 3 + 2] += dustVel[i * 3 + 2];
        if (dustPos[i * 3]     >  7) dustPos[i * 3]     = -7;
        if (dustPos[i * 3]     < -7) dustPos[i * 3]     =  7;
        if (dustPos[i * 3 + 1] > 5.8) dustPos[i * 3 + 1] = 0.3;
        if (dustPos[i * 3 + 1] < 0.3) dustPos[i * 3 + 1] = 5.8;
        if (dustPos[i * 3 + 2] >  5) dustPos[i * 3 + 2] = -5;
        if (dustPos[i * 3 + 2] < -5) dustPos[i * 3 + 2] =  5;
      }
      if (dustGeoAttr) dustGeoAttr.needsUpdate = true;

      // ── Glow sprite pulse ──
      glowSprites.forEach((spr, i) => {
        const base = spr.userData.baseScale  as number;
        const spd  = spr.userData.pulseSpeed as number;
        const bOp  = spr.userData.baseOpacity as number;
        const s = base * (1.0 + Math.sin(t * spd + i * 0.85) * 0.22);
        spr.scale.setScalar(s);
        (spr.material as THREE.SpriteMaterial).opacity = bOp + Math.sin(t * spd + i * 0.85) * (bOp * 0.35);
      });

      // ── Idle status cycling ──
      idleTimer += dt;
      if (idleTimer > 9 && !hovered && !active) {
        idleTimer = 0; statusIdx = (statusIdx + 1) % STATUSES.length;
        setSysStatus(STATUSES[statusIdx]);
        setTimeout(() => setSysStatus("NOMINAL"), 3200);
      }

      // ── Camera ──
      camPosTgt.copy(CAM_BASE);
      if (active) {
        camPosTgt.set(CAM_BASE.x, CAM_BASE.y + 0.8, CAM_BASE.z);
        camLookTgt.copy(CAM_LOOK_BASE);
      } else if (hovered) {
        camPosTgt.set(
          CAM_BASE.x + Math.sin(t * 0.07) * 0.18,
          CAM_BASE.y + Math.cos(t * 0.11) * 0.09,
          CAM_BASE.z + Math.sin(t * 0.05) * 0.14,
        );
        camLookTgt.copy(CAM_LOOK_BASE);
      } else {
        camPosTgt.set(
          CAM_BASE.x + Math.sin(t * 0.065) * 0.55,
          CAM_BASE.y + Math.cos(t * 0.095) * 0.30,
          CAM_BASE.z + Math.sin(t * 0.048) * 0.45,
        );
        camLookTgt.set(
          CAM_LOOK_BASE.x + Math.sin(t * 0.038) * 0.25,
          CAM_LOOK_BASE.y,
          CAM_LOOK_BASE.z,
        );
      }

      // Intro: lerp camera from far start to base over 3.5 s
      if (introProgress < 1) {
        introProgress = Math.min(1, introProgress + dt / 3.5);
        const ease = 1 - Math.pow(1 - introProgress, 3);
        camPos.lerpVectors(CAM_INTRO_START, CAM_BASE, ease);
      } else {
        camPos.lerp(camPosTgt, active ? 0.020 : 0.025);
      }
      camLook.lerp(camLookTgt, active ? 0.022 : 0.032);
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      renderer.render(scene, camera);
    }

    animate();

    const clockId = setInterval(() => setSysTime(new Date().toTimeString().slice(0, 8)), 1000);
    setSysTime(new Date().toTimeString().slice(0, 8));

    const onResize = () => {
      if (!mount) return;
      const a = mount.clientWidth / mount.clientHeight;
      camera.left   = -FRUSTUM_SIZE * a / 2; camera.right  =  FRUSTUM_SIZE * a / 2;
      camera.top    =  FRUSTUM_SIZE / 2;      camera.bottom = -FRUSTUM_SIZE / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(clockId);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  const activeStation  = STATIONS.find(s => s.id === activeId)  ?? null;
  const hoveredStation = STATIONS.find(s => s.id === hoveredId) ?? null;
  const closePanel = () => { activeRef.current = null; setActiveId(null); };

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#0E1820" }}>
      <div ref={mountRef} className="absolute inset-0" />

      {/* System status bar */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D9B36A] pulse-dot" aria-hidden />
            <span className="lab-label text-[#7A848E]">JB·EXPERIMENTAL·001</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="lab-label text-[#7FB7C9]">{sysStatus}</span>
            <span className="w-px h-3 bg-[#2A5868]" aria-hidden />
            <span className="lab-mono text-[#7A848E] tabular-nums">{mounted ? sysTime : "──:──:──"}</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredId && labelPos && !activeId && (
          <motion.div key={hoveredId + "tip"} className="absolute z-10 pointer-events-none"
            style={{ left: labelPos.x, top: labelPos.y, transform: "translate(-50%,-100%)" }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}>
            <div className="bg-[#0E1820]/90 border border-[#7FB7C9]/40 px-2.5 py-1.5 backdrop-blur-sm">
              <div className="lab-label font-medium text-[#DEF0F5]">{hoveredStation?.label}</div>
              <div className="lab-label text-[#7FB7C9] mt-0.5">{hoveredStation?.sublabel}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity */}
      <AnimatePresence>
        {!activeId && (
          <motion.div className="absolute bottom-8 left-6 z-10 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}>
            <div className="lab-display text-[#DEF0F5]" style={{ fontSize: "clamp(1.8rem, 4vw, 3.2rem)" }}>Jack B.</div>
            <div className="lab-label text-[#7FB7C9] mt-1.5">DEVELOPER · WRITER · SYSTEMS RESEARCHER</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav hint */}
      <AnimatePresence>
        {!activeId && mounted && (
          <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ delay: 4, duration: 1.5 }}>
            <span className="lab-label opacity-25 text-[#DEF0F5]">HOVER TO INSPECT · CLICK TO ACCESS</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom drawer panel */}
      <AnimatePresence>
        {activeId && activeStation && (
          <motion.div key={activeId + "drawer"} className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 42, damping: 19 }}>
            <div className="h-px bg-[#7FB7C9] opacity-60" />
            <div className="bg-[#F3EFE7] border-t border-[#CCC9C1] flex flex-col" style={{ height: "clamp(260px, 36vh, 320px)" }}>
              <div className="flex items-center justify-between px-6 py-3 border-b border-[#CCC9C1] shrink-0">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7BBF8E] pulse-dot-fast" aria-hidden />
                  <span className="lab-label font-medium text-[#444B54]">{activeId.toUpperCase()}</span>
                  <span className="w-px h-3 bg-[#CCC9C1]" aria-hidden />
                  <span className="lab-label text-[#444B54]">{activeStation.label}</span>
                  <span className="hidden sm:block w-px h-3 bg-[#CCC9C1]" aria-hidden />
                  <span className="hidden sm:block lab-label">{activeStation.sublabel}</span>
                </div>
                <button onClick={closePanel}
                  className="lab-label text-[#7A848E] hover:text-[#444B54] border border-[#CCC9C1] hover:border-[#7FB7C9] px-2.5 py-1 transition-colors duration-150 cursor-pointer">
                  ESC · CLOSE
                </button>
              </div>
              <div className="flex-1 overflow-hidden px-6 py-4">
                {activeId === "optical"  && <OpticalContent posts={blogPosts} />}
                {activeId === "compute"  && <ComputeContent repos={repos} />}
                {activeId === "signal"   && <SignalContent />}
                {activeId === "archive"  && <ArchiveContent />}
                {activeId === "chamber"  && <ChamberContent />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
