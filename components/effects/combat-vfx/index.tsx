"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

/**
 * Combat VFX — a selector-driven collection of the dungeon-crawler's one-shot
 * ability animations, ported from dungeon-crawler-og/src/game/vfx.ts. Each
 * ability is a pure, procedural Canvas 2D draw over a 0->1 progress. The
 * original drew at tile coordinates; for this standalone demo we cast at the
 * canvas center and replace TILE_SIZE with a scale derived from the canvas.
 *
 * Signature colors are preserved as the base; the palette controls optionally
 * rotate every hue (single / dual / rainbow), so each look can be re-tinted
 * without losing its identity.
 */

type Ability =
  | "cleave"
  | "backstab"
  | "scimitar_slash"
  | "shield_bash"
  | "ground_slam"
  | "fan_of_knives"
  | "poison_blade"
  | "longshot"
  | "arrow_rain"
  | "fireball"
  | "arcane_missile"
  | "chain_lightning"
  | "ice_storm"
  | "smite"
  | "consecrate"
  | "heal"
  | "earthquake"
  | "war_cry"
  | "smoke_bomb"
  | "shadow_step"
  | "raise_dead"
  | "life_drain"
  | "bone_wall"
  | "divine_shield"
  | "telekinesis"
  | "eagle_eye";

/** Tints a base hex color: rotates its hue toward the palette, keeps sat/light. */
type Tint = (hex: string, t: number, alpha?: number) => string;

interface Pt {
  x: number;
  y: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  grav: number;
}

function makeSpark(): Spark {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0, grav: 0 };
}

interface Cast {
  x: number;
  y: number;
  age: number;
  maxLife: number;
}

function makeCast(): Cast {
  return { x: 0, y: 0, age: 0, maxLife: 1 };
}

// Per-ability animation lifetime in seconds (original durations were in frames).
const LIFE: Record<Ability, number> = {
  cleave: 0.5,
  backstab: 0.6,
  scimitar_slash: 0.55,
  shield_bash: 0.5,
  ground_slam: 0.6,
  fan_of_knives: 0.6,
  poison_blade: 0.7,
  longshot: 0.6,
  arrow_rain: 0.7,
  fireball: 0.6,
  arcane_missile: 0.6,
  chain_lightning: 0.45,
  ice_storm: 0.75,
  smite: 0.6,
  consecrate: 0.8,
  heal: 0.75,
  earthquake: 0.85,
  war_cry: 0.7,
  smoke_bomb: 0.9,
  shadow_step: 0.6,
  raise_dead: 0.8,
  life_drain: 0.7,
  bone_wall: 0.7,
  divine_shield: 0.7,
  telekinesis: 0.7,
  eagle_eye: 0.6,
};

// Signature spark color per ability (drives the pooled burst tint).
const SPARK_HEX: Record<Ability, string> = {
  cleave: "#FF8844",
  backstab: "#FF00FF",
  scimitar_slash: "#FFD700",
  shield_bash: "#AACCFF",
  ground_slam: "#FFAA44",
  fan_of_knives: "#CCCCCC",
  poison_blade: "#44FF00",
  longshot: "#88CC44",
  arrow_rain: "#88CC44",
  fireball: "#FFAA00",
  arcane_missile: "#CC88FF",
  chain_lightning: "#44DDFF",
  ice_storm: "#88CCFF",
  smite: "#FFDD44",
  consecrate: "#FFDD44",
  heal: "#44FF44",
  earthquake: "#CC8844",
  war_cry: "#FF4444",
  smoke_bomb: "#AAAAAA",
  shadow_step: "#8800FF",
  raise_dead: "#AA44CC",
  life_drain: "#CC44CC",
  bone_wall: "#CCCCAA",
  divine_shield: "#FFD700",
  telekinesis: "#CC88FF",
  eagle_eye: "#88CC44",
};

// Hue rotation reference: at this palette hue, single mode leaves colors as-is.
const REF_HUE = 210;

function hexToHsl(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return [REF_HUE, 0, 80];
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = (((g - b) / d) % 6 + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

// Stub fake targets around a center so multi-target spells render standalone.
function stubTargets(x: number, y: number, S: number): Pt[] {
  return [
    { x: x + S * 2.0, y: y - S * 1.6 },
    { x: x + S * 3.4, y: y + S * 0.5 },
    { x: x + S * 2.2, y: y + S * 2.0 },
  ];
}

// === Ported ability renderers (TILE_SIZE -> S, signature colors -> tint) ===

function renderCleave(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  const angle = t * Math.PI * 1.5 - Math.PI * 0.75;
  const r = S * 1.2;
  c.save();
  c.globalAlpha = 1 - t;
  c.strokeStyle = tint("#FF8844", t);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x, y, r, angle - 0.8, angle + 0.8);
  c.stroke();
  c.strokeStyle = tint("#FFCC88", 0.6);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, r * 0.85, angle - 0.5, angle + 0.5);
  c.stroke();
  c.restore();
}

function renderBackstab(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  const trailCount = 5;
  for (let i = 0; i < trailCount; i++) {
    const tt = Math.max(0, t - i * 0.1);
    c.fillStyle = tint("#8800FF", t, (1 - tt) * 0.3);
    c.fillRect(x - 8 + Math.sin(i * 2) * 4, y - 12 + i * 3, 16, 24);
  }
  if (t > 0.3) {
    const st = (t - 0.3) / 0.7;
    c.strokeStyle = tint("#FF00FF", t);
    c.lineWidth = 2;
    c.globalAlpha = 1 - st;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const len = st * S;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      c.stroke();
    }
  }
  c.restore();
}

function renderScimitarSlash(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.9;
  const angle = t * Math.PI * 2 - Math.PI * 0.5;
  const r = S * 1.3;
  c.strokeStyle = tint("#DAA520", t);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x, y, r, angle - 1.2, angle + 1.2);
  c.stroke();
  c.strokeStyle = tint("#FFD700", 0.7);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, r * 0.75, angle - 0.8, angle + 0.8);
  c.stroke();
  const tipX = x + Math.cos(angle + 1.2) * r;
  const tipY = y + Math.sin(angle + 1.2) * r;
  c.fillStyle = tint("#FFFFFF", t);
  c.fillRect(tipX - 2, tipY - 2, 4, 4);
  c.restore();
}

function renderShieldBash(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  const dx = 1;
  const dy = 0;
  c.save();
  c.globalAlpha = (1 - t) * 0.85;
  const offset = Math.sin(t * Math.PI) * S * 0.5;
  const ix = x + dx * offset;
  const iy = y + dy * offset;
  c.strokeStyle = tint("#AACCFF", t);
  c.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const len = (1 - t) * S * 0.6;
    c.beginPath();
    c.moveTo(ix, iy);
    c.lineTo(ix + Math.cos(a) * len, iy + Math.sin(a) * len);
    c.stroke();
  }
  c.restore();
}

function renderGroundSlam(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.8;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const len = t * S * 2.5;
    c.strokeStyle = tint("#FF6644", i / 12);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y);
    const mid = len * 0.5;
    c.lineTo(x + Math.cos(a) * mid + Math.sin(i * 5) * 4, y + Math.sin(a) * mid + Math.cos(i * 3) * 4);
    c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    c.stroke();
  }
  if (t < 0.2) {
    c.fillStyle = tint("#FFAA44", t);
    c.beginPath();
    c.arc(x, y, (0.2 - t) * S * 2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function renderFanOfKnives(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.85;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const len = t * S * 2.5;
    c.strokeStyle = tint("#CCCCCC", i / 8);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
    c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    c.stroke();
    c.fillStyle = tint("#FFFFFF", t);
    c.fillRect(x + Math.cos(a) * len - 1, y + Math.sin(a) * len - 1, 3, 3);
  }
  c.restore();
}

function renderPoisonBlade(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.8;
  for (let i = 0; i < 6; i++) {
    const dx = Math.sin(i * 2 + t * 4) * 6;
    const dy = t * S * 0.5 + i * 3;
    c.fillStyle = tint("#44FF00", i / 6);
    c.fillRect(x + dx - 1, y + dy - 1, 3, 4);
  }
  c.strokeStyle = tint("#44FF00", t);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x - 2, y - 10);
  c.lineTo(x, y + 10);
  c.lineTo(x + 2, y - 10);
  c.stroke();
  c.restore();
}

function renderLongshot(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  const dx = 1;
  const dy = 0;
  c.save();
  c.globalAlpha = (1 - t) * 0.95;
  const dist = t * S * 6;
  const ax = x + dx * dist;
  const ay = y + dy * dist;
  c.strokeStyle = tint("#88CC44", t);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(ax, ay);
  c.stroke();
  c.fillStyle = tint("#CCDD88", t);
  c.beginPath();
  c.arc(ax, ay, 4 * (1 - t * 0.5), 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 5; i++) {
    const pt = Math.max(0, t - i * 0.05);
    const px = x + dx * pt * S * 6;
    const py = y + dy * pt * S * 6;
    c.fillStyle = tint(i % 2 === 0 ? "#6B8E23" : "#88CC44", i / 5);
    c.globalAlpha = (1 - t) * (1 - i * 0.15);
    c.fillRect(px - 1, py - 1, 3, 3);
  }
  c.restore();
}

function renderArrowRain(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.8;
  for (let i = 0; i < 10; i++) {
    const ax = x - S * 2 + i * S * 0.5 + Math.sin(i * 2.3) * 8;
    const ay = y - S * 3 + t * S * 5 + i * 6;
    c.strokeStyle = tint("#88CC44", i / 10);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(ax + 3, ay + 10);
    c.stroke();
    c.fillStyle = tint("#CCDD88", t);
    c.fillRect(ax + 2, ay + 8, 3, 3);
  }
  c.restore();
}

function renderFireball(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  const radius = t * S * 2;
  c.globalAlpha = (1 - t) * 0.85;
  c.strokeStyle = tint("#FF4400", t);
  c.lineWidth = 4;
  c.beginPath();
  c.arc(x, y, radius, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = tint("#FFAA00", 0.5);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, radius * 0.6, 0, Math.PI * 2);
  c.stroke();
  if (t < 0.3) {
    c.globalAlpha = (0.3 - t) / 0.3;
    c.fillStyle = tint("#FFFFFF", t);
    c.beginPath();
    c.arc(x, y, S * 0.5, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function renderArcaneMissile(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint, targets: Pt[]) {
  c.save();
  c.globalAlpha = (1 - t) * 0.85;
  for (let i = 0; i < Math.min(3, targets.length); i++) {
    const tx = targets[i].x;
    const ty = targets[i].y;
    const mt = Math.min(1, t * 2 + i * 0.1);
    const mx = x + (tx - x) * mt;
    const my = y + (ty - y) * mt;
    c.strokeStyle = tint("#AA88FF", i / 3);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y);
    const cx = (x + tx) / 2 + (i - 1) * 20;
    const cy = (y + ty) / 2 - 15;
    c.quadraticCurveTo(cx, cy, mx, my);
    c.stroke();
    c.fillStyle = tint("#CC88FF", i / 3);
    c.beginPath();
    c.arc(mx, my, 4, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function renderChainLightning(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint, targets: Pt[]) {
  c.save();
  c.globalAlpha = (1 - t) * 0.9;
  c.strokeStyle = tint("#44DDFF", t);
  c.lineWidth = 2;
  let prevX = x;
  let prevY = y;
  for (let ti = 0; ti < targets.length; ti++) {
    const tx = targets[ti].x;
    const ty = targets[ti].y;
    c.beginPath();
    c.moveTo(prevX, prevY);
    const segments = 4;
    for (let s = 1; s <= segments; s++) {
      const st = s / segments;
      const mx = prevX + (tx - prevX) * st;
      const my = prevY + (ty - prevY) * st;
      const jitter = (1 - t) * 8;
      c.lineTo(mx + (Math.random() - 0.5) * jitter, my + (Math.random() - 0.5) * jitter);
    }
    c.stroke();
    c.fillStyle = tint("#FFFFFF", t);
    c.beginPath();
    c.arc(tx, ty, (1 - t) * 6, 0, Math.PI * 2);
    c.fill();
    prevX = tx;
    prevY = ty;
  }
  c.restore();
}

function renderIceStorm(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.8;
  for (let i = 0; i < 12; i++) {
    const angle = t * Math.PI * 4 + (i / 12) * Math.PI * 2;
    const radius = S * (1 + t * 2) * (0.5 + (i % 3) * 0.3);
    const fx = x + Math.cos(angle) * radius;
    const fy = y + Math.sin(angle) * radius;
    c.fillStyle = tint(i % 2 === 0 ? "#88CCFF" : "#AADDFF", i / 12);
    c.fillRect(fx - 2, fy, 5, 1);
    c.fillRect(fx, fy - 2, 1, 5);
  }
  c.strokeStyle = tint("#88CCFF", t);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, S * 2 * t, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

function renderSmite(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.85;
  const beamW = 8 + (1 - t) * 12;
  const beamH = S * 4;
  c.fillStyle = tint("#FFDD44", t, (1 - t) * 0.6);
  c.fillRect(x - beamW / 2, y - beamH, beamW, beamH);
  c.fillStyle = tint("#FFFFC8", t, (1 - t) * 0.4);
  c.fillRect(x - beamW / 4, y - beamH, beamW / 2, beamH);
  c.strokeStyle = tint("#FFDD44", t);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, t * S, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

function renderConsecrate(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.6;
  const radius = S * (1 + t * 2);
  const grd = c.createRadialGradient(x, y, 0, x, y, radius);
  grd.addColorStop(0, tint("#FFDD44", 0.2, 0.4));
  grd.addColorStop(0.7, tint("#FFDD44", 0.5, 0.1));
  grd.addColorStop(1, tint("#FFDD44", 0.8, 0));
  c.fillStyle = grd;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  c.fillStyle = tint("#FFDD44", t);
  c.fillRect(x - 1, y - radius * 0.5, 3, radius);
  c.fillRect(x - radius * 0.5, y - 1, radius, 3);
  c.restore();
}

function renderHeal(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.8;
  const crossSize = 6 + t * 8;
  c.fillStyle = tint("#44FF44", t);
  c.fillRect(x - 1, y - crossSize - t * 20, 3, crossSize);
  c.fillRect(x - crossSize / 2, y - crossSize / 2 - t * 20, crossSize, 3);
  c.strokeStyle = tint("#88FF88", t);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, t * S * 1.5, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 3;
    const r = t * S;
    c.fillStyle = tint("#FFD700", i / 6);
    c.fillRect(x + Math.cos(a) * r - 1, y + Math.sin(a) * r - t * 15 - 1, 3, 3);
  }
  c.restore();
}

function renderEarthquake(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.7;
  for (let i = 0; i < 3; i++) {
    const rt = Math.max(0, t - i * 0.15);
    const radius = rt * S * (3 + i);
    c.strokeStyle = tint(i === 0 ? "#CC8844" : "#886644", i / 3);
    c.lineWidth = 3 - i;
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.stroke();
  }
  c.strokeStyle = tint("#664422", t);
  c.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const len = t * S * 4;
    c.beginPath();
    c.moveTo(x, y);
    const jx = Math.sin(i * 3.7) * 8;
    const jy = Math.cos(i * 2.3) * 8;
    c.lineTo(x + Math.cos(a) * len * 0.5 + jx, y + Math.sin(a) * len * 0.5 + jy);
    c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    c.stroke();
  }
  c.restore();
}

function renderWarCry(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.6;
  for (let i = 0; i < 3; i++) {
    const rt = Math.max(0, t - i * 0.12);
    const radius = rt * S * 4;
    c.strokeStyle = tint(i === 0 ? "#FF4444" : "#FF6666", i / 3, i === 0 ? 1 : 0.53);
    c.lineWidth = 3 - i;
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
}

function renderSmokeBomb(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.7;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t;
    const r = t * S * 2;
    const size = 8 + t * 12;
    c.fillStyle = tint("#808080", i / 8, (1 - t) * 0.4);
    c.beginPath();
    c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, size, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function renderShadowStep(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.6;
  for (let i = 0; i < 4; i++) {
    const fade = (1 - t) * (1 - i * 0.2);
    c.fillStyle = tint("#222222", i / 4, fade);
    c.fillRect(x - 8 - i * 4, y - 12, 16, 24);
  }
  c.restore();
}

function renderRaiseDead(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.8;
  for (let i = 0; i < 12; i++) {
    const a = t * Math.PI * 6 + (i / 12) * Math.PI * 2;
    const r = (1 - t) * S * 2 * (i / 12);
    c.fillStyle = tint(i % 2 === 0 ? "#8844AA" : "#AA44CC", i / 12);
    c.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r - 2, 4, 4);
  }
  for (let i = 0; i < 5; i++) {
    const bx = x - 15 + i * 8;
    const by = y + S * 0.5 - t * S * 1.5 - i * 3;
    c.fillStyle = tint("#CCCCAA", i / 5);
    c.fillRect(bx, by, 3, 6);
  }
  c.restore();
}

function renderLifeDrain(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint, targets: Pt[]) {
  if (targets.length === 0) return;
  c.save();
  c.globalAlpha = (1 - t) * 0.8;
  const tx = targets[0].x;
  const ty = targets[0].y;
  c.strokeStyle = tint("#AA00AA", t);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(tx, ty);
  c.stroke();
  for (let i = 0; i < 5; i++) {
    const bt = (t + i * 0.2) % 1;
    const bx = tx + (x - tx) * bt;
    const by = ty + (y - ty) * bt;
    c.fillStyle = tint("#CC44CC", i / 5);
    c.beginPath();
    c.arc(bx, by, 3, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function renderBoneWall(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.8;
  for (let i = 0; i < 5; i++) {
    const bx = x - 30 + i * 15;
    const riseT = Math.min(1, t * 2);
    const by = y - riseT * S * 0.8;
    c.fillStyle = tint("#CCCCAA", i / 5);
    c.fillRect(bx, by, 4, 12 * riseT);
    c.fillRect(bx - 2, by + 2, 8, 3);
  }
  c.restore();
}

function renderDivineShield(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.6;
  const radius = S * (0.8 + Math.sin(t * Math.PI) * 0.3);
  c.strokeStyle = tint("#FFD700", t);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x, y, radius, 0, Math.PI * 2);
  c.stroke();
  const grd = c.createRadialGradient(x, y, 0, x, y, radius);
  grd.addColorStop(0, tint("#FFDD44", 0.2, 0.25));
  grd.addColorStop(1, tint("#FFDD44", 0.8, 0));
  c.fillStyle = grd;
  c.beginPath();
  c.arc(x, y, radius, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function renderTelekinesis(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.7;
  c.strokeStyle = tint("#AA88FF", t);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, t * S * 4, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 6; i++) {
    const a = t * Math.PI * 3 + (i / 6) * Math.PI * 2;
    const r = t * S * 3;
    c.fillStyle = tint("#CC88FF", i / 6);
    c.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r - 2, 4, 4);
  }
  c.restore();
}

function renderEagleEye(c: CanvasRenderingContext2D, x: number, y: number, t: number, S: number, tint: Tint) {
  c.save();
  c.globalAlpha = (1 - t) * 0.5;
  c.strokeStyle = tint("#88CC44", t);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x, y, t * S * 8, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

export function CombatVfx({ params }: { params: EffectProps }) {
  const ability = String(params.ability ?? "fireball") as Ability;
  const speed = Number(params.speed);
  const scale = Number(params.scale);
  const autoCast = Boolean(params.autoCast);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const sparks = new Pool<Spark>(1600, makeSpark);
      const casts = new Pool<Cast>(12, makeCast);

      const S = Math.min(width, height) * 0.1 * scale;

      // Tint helper: rotate a signature color's hue toward the palette.
      const hslCache = new Map<string, [number, number, number]>();
      const baseHsl = (hex: string): [number, number, number] => {
        let v = hslCache.get(hex);
        if (!v) {
          v = hexToHsl(hex);
          hslCache.set(hex, v);
        }
        return v;
      };
      const resolveHue = (baseH: number, t: number): number => {
        if (mode === "rainbow") return paletteHue("rainbow", hue, hue2, t);
        const shift = paletteHue(mode, hue, hue2, t) - REF_HUE;
        return ((baseH + shift) % 360 + 360) % 360;
      };
      const tint: Tint = (hex, t, alpha = 1) => {
        const [bh, s, l] = baseHsl(hex);
        const h = resolveHue(bh, t);
        return `hsla(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%, ${alpha})`;
      };

      const burstSparks = (cx: number, cy: number, n: number, spread: number, hex: string) => {
        const [bh] = baseHsl(hex);
        for (let i = 0; i < n; i++) {
          sparks.spawn((s) => {
            const a = Math.random() * Math.PI * 2;
            const sp = spread * (0.3 + Math.random() * 0.9);
            s.x = cx;
            s.y = cy;
            s.vx = Math.cos(a) * sp;
            s.vy = Math.sin(a) * sp;
            s.life = 1;
            s.maxLife = 0.4 + Math.random() * 0.6;
            s.size = 1 + Math.random() * 1.8;
            s.hue = resolveHue(bh, Math.random());
            s.grav = 60 + Math.random() * 80;
          });
        }
      };

      const targetsFor = (cx: number, cy: number): Pt[] => stubTargets(cx, cy, S);

      const drawAbility = (cast: Cast, t: number) => {
        const x = cast.x;
        const y = cast.y;
        switch (ability) {
          case "cleave":
            renderCleave(ctx, x, y, t, S, tint);
            break;
          case "backstab":
            renderBackstab(ctx, x, y, t, S, tint);
            break;
          case "scimitar_slash":
            renderScimitarSlash(ctx, x, y, t, S, tint);
            break;
          case "shield_bash":
            renderShieldBash(ctx, x, y, t, S, tint);
            break;
          case "ground_slam":
            renderGroundSlam(ctx, x, y, t, S, tint);
            break;
          case "fan_of_knives":
            renderFanOfKnives(ctx, x, y, t, S, tint);
            break;
          case "poison_blade":
            renderPoisonBlade(ctx, x, y, t, S, tint);
            break;
          case "longshot":
            renderLongshot(ctx, x, y, t, S, tint);
            break;
          case "arrow_rain":
            renderArrowRain(ctx, x, y, t, S, tint);
            break;
          case "fireball":
            renderFireball(ctx, x, y, t, S, tint);
            break;
          case "arcane_missile":
            renderArcaneMissile(ctx, x, y, t, S, tint, targetsFor(x, y));
            break;
          case "chain_lightning":
            renderChainLightning(ctx, x, y, t, S, tint, targetsFor(x, y));
            break;
          case "ice_storm":
            renderIceStorm(ctx, x, y, t, S, tint);
            break;
          case "smite":
            renderSmite(ctx, x, y, t, S, tint);
            break;
          case "consecrate":
            renderConsecrate(ctx, x, y, t, S, tint);
            break;
          case "heal":
            renderHeal(ctx, x, y, t, S, tint);
            break;
          case "earthquake":
            renderEarthquake(ctx, x, y, t, S, tint);
            break;
          case "war_cry":
            renderWarCry(ctx, x, y, t, S, tint);
            break;
          case "smoke_bomb":
            renderSmokeBomb(ctx, x, y, t, S, tint);
            break;
          case "shadow_step":
            renderShadowStep(ctx, x, y, t, S, tint);
            break;
          case "raise_dead":
            renderRaiseDead(ctx, x, y, t, S, tint);
            break;
          case "life_drain":
            renderLifeDrain(ctx, x, y, t, S, tint, targetsFor(x, y));
            break;
          case "bone_wall":
            renderBoneWall(ctx, x, y, t, S, tint);
            break;
          case "divine_shield":
            renderDivineShield(ctx, x, y, t, S, tint);
            break;
          case "telekinesis":
            renderTelekinesis(ctx, x, y, t, S, tint);
            break;
          case "eagle_eye":
            renderEagleEye(ctx, x, y, t, S, tint);
            break;
          default: {
            const _exhaustive: never = ability;
            void _exhaustive;
          }
        }
      };

      const cast = (cx: number, cy: number) => {
        casts.spawn((k) => {
          k.x = cx;
          k.y = cy;
          k.age = 0;
          k.maxLife = LIFE[ability];
        });
        burstSparks(cx, cy, 14, S * 6, SPARK_HEX[ability]);
      };

      const autoPoint = (): [number, number] => [
        width * 0.5 + (Math.random() - 0.5) * width * 0.08,
        height * 0.5 + (Math.random() - 0.5) * height * 0.08,
      ];

      // Recast well before the animation ends so a static frame is never blank.
      const nextInterval = () =>
        (LIFE[ability] * 0.55 + Math.random() * 0.15) / Math.max(0.2, speed);
      let autoTimer = nextInterval();

      // Seed one cast at center immediately so the very first frame shows it.
      if (autoCast) cast(width / 2, height / 2);

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") cast(x, y);
        },
        draw: (c, dt) => {
          if (autoCast) {
            autoTimer -= dt;
            if (autoTimer <= 0) {
              autoTimer = nextInterval();
              const [px, py] = autoPoint();
              cast(px, py);
            }
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          casts.update((k) => {
            k.age += dt * speed;
            return k.age < k.maxLife;
          });
          casts.forEach((k) => {
            drawAbility(k, Math.min(0.999, k.age / k.maxLife));
          });

          sparks.update((s) => {
            s.vy += s.grav * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vx *= 0.96;
            s.life -= dt / s.maxLife;
            return s.life > 0;
          });
          sparks.forEach((s) => {
            const a = Math.max(0, s.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${s.hue.toFixed(0)}, 90%, 66%)`;
            c.beginPath();
            c.arc(s.x, s.y, s.size * (0.5 + a * 0.8), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
        },
      };
    },
    [ability, speed, scale, autoCast, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
