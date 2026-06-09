"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteColor, readPalette } from "@/lib/effects/color";
import type { ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";
import { Pool } from "@/lib/effects/pool";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  amp: number;
  speed: number;
  width: number;
}

const MAX_POINTS = 6000;
const RIPPLE_CAP = 64;
const TWO_PI = Math.PI * 2;

export function RippleDistortion({ params }: { params: EffectProps }) {
  const pattern = String(params.pattern ?? "dots");
  const density = Number(params.density ?? 30);
  const strength = Number(params.strength ?? 16);
  const waveSpeed = Number(params.waveSpeed ?? 1);
  const decay = Number(params.decay ?? 2);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const pool = new Pool<Ripple>(RIPPLE_CAP, () => ({
        x: 0,
        y: 0,
        radius: 0,
        amp: 0,
        speed: 0,
        width: 0,
      }));

      const base = Math.min(width, height);
      const ringWidth = base * 0.16;
      const pxPerSec = base * 0.9 * waveSpeed;

      // Build the grid once; clamp total points for performance.
      let spacing = Math.max(8, density);
      let cols = Math.ceil(width / spacing) + 1;
      let rows = Math.ceil(height / spacing) + 1;
      while (cols * rows > MAX_POINTS) {
        spacing += 2;
        cols = Math.ceil(width / spacing) + 1;
        rows = Math.ceil(height / spacing) + 1;
      }
      const offX = (width - (cols - 1) * spacing) / 2;
      const offY = (height - (rows - 1) * spacing) / 2;

      const total = cols * rows;
      const baseX = new Float32Array(total);
      const baseY = new Float32Array(total);
      for (let r = 0; r < rows; r++) {
        for (let cIdx = 0; cIdx < cols; cIdx++) {
          const i = r * cols + cIdx;
          baseX[i] = offX + cIdx * spacing;
          baseY[i] = offY + r * spacing;
        }
      }

      const dotSize = Math.max(0.8, Math.min(2.4, spacing * 0.12));
      const ambientAmp = Math.min(strength * 0.18, spacing * 0.5);
      const ambK = TWO_PI / Math.max(40, spacing * 6);

      // Per-frame snapshot of active ripples (allocation-free hot loop).
      const rX = new Float32Array(RIPPLE_CAP);
      const rY = new Float32Array(RIPPLE_CAP);
      const rRad = new Float32Array(RIPPLE_CAP);
      const rAmp = new Float32Array(RIPPLE_CAP);
      const rWid = new Float32Array(RIPPLE_CAP);

      let lastWakeX = -9999;
      let lastWakeY = -9999;
      let autoAcc = 0;

      const spawn = (
        x: number,
        y: number,
        amp: number,
        w: number,
        speed: number
      ) => {
        pool.spawn((rp) => {
          rp.x = x;
          rp.y = y;
          rp.radius = 0;
          rp.amp = amp;
          rp.width = w;
          rp.speed = speed;
        });
      };

      const ctxState = {
        n: 0,
        rX,
        rY,
        rRad,
        rAmp,
        rWid,
        strength,
        ambientAmp,
        ambK,
        t: 0,
        mode,
        hue,
        hue2,
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") return;
          if (type === "down") {
            spawn(x, y, strength * 1.4, ringWidth, pxPerSec * 1.1);
          } else if (type === "move") {
            const dx = x - lastWakeX;
            const dy = y - lastWakeY;
            if (dx * dx + dy * dy > 28 * 28) {
              lastWakeX = x;
              lastWakeY = y;
              spawn(x, y, strength * 0.35, ringWidth * 0.7, pxPerSec * 0.9);
            }
          }
        },
        draw: (c, dt, t) => {
          // Auto-spawn so the idle state stays alive.
          autoAcc += dt;
          if (autoAcc > 2.6) {
            autoAcc = 0;
            spawn(
              Math.random() * width,
              Math.random() * height,
              strength * 0.7,
              ringWidth,
              pxPerSec
            );
          }

          // Advance ripples; expire when amplitude decays to ~0.
          pool.update((rp) => {
            rp.radius += rp.speed * dt;
            rp.amp -= rp.amp * decay * dt;
            if (rp.amp < 0.15 || rp.radius > base * 1.7) return false;
            return true;
          });

          // Snapshot active ripples into flat arrays for the hot loop.
          let n = 0;
          pool.forEach((rp) => {
            rX[n] = rp.x;
            rY[n] = rp.y;
            rRad[n] = rp.radius;
            rAmp[n] = rp.amp;
            rWid[n] = rp.width;
            n++;
          });
          ctxState.n = n;
          ctxState.t = t;

          if (pattern === "lines") {
            drawLines(c, baseX, baseY, cols, rows, dotSize, ctxState);
          } else if (pattern === "grid") {
            c.lineWidth = 1;
            drawGrid(c, baseX, baseY, cols, rows, ctxState);
          } else {
            drawDots(c, baseX, baseY, total, dotSize, ctxState);
          }
        },
      };
    },
    [pattern, density, strength, waveSpeed, decay, mode, hue, hue2]
  );

  return (
    <div className="relative h-full w-full bg-[#05060a]">
      <canvas ref={ref} className="block h-full w-full" />
    </div>
  );
}

interface RippleState {
  n: number;
  rX: Float32Array;
  rY: Float32Array;
  rRad: Float32Array;
  rAmp: Float32Array;
  rWid: Float32Array;
  strength: number;
  ambientAmp: number;
  ambK: number;
  t: number;
  mode: ColorMode;
  hue: number;
  hue2: number;
}

// Reused output to keep the hot loop allocation-free.
const _out = { x: 0, y: 0, mag: 0 };

/**
 * Radial displacement at (px,py): a small ambient breathing wave plus a damped
 * sine pulse from each active ripple, localized at its wavefront and pushing
 * points outward along the radial direction.
 */
function displace(px: number, py: number, s: RippleState): typeof _out {
  let disp =
    s.ambientAmp *
    Math.sin(px * s.ambK + s.t * 1.3) *
    Math.cos(py * s.ambK - s.t * 1.1);

  let dirX = 0;
  let dirY = 0;
  const k = s.strength * 0.06;
  for (let i = 0; i < s.n; i++) {
    const dx = px - s.rX[i];
    const dy = py - s.rY[i];
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const w = s.rWid[i];
    const front = dist - s.rRad[i];
    const fall = Math.exp(-(front * front) / (2 * w * w));
    if (fall < 0.01) continue;
    const wave = Math.sin((front / w) * Math.PI) * s.rAmp[i] * fall * k;
    dirX += (dx / dist) * wave;
    dirY += (dy / dist) * wave;
    disp += Math.abs(wave);
  }

  _out.x = px + dirX;
  _out.y = py + dirY;
  _out.mag = disp;
  return _out;
}

function colorFor(mag: number, s: RippleState): string {
  const norm = Math.min(1, Math.abs(mag) / (s.strength * 0.9 + 0.0001));
  const light = 38 + norm * 42;
  return paletteColor(s.mode, s.hue, s.hue2, norm, 90, light);
}

function drawDots(
  c: CanvasRenderingContext2D,
  baseX: Float32Array,
  baseY: Float32Array,
  total: number,
  dotSize: number,
  s: RippleState
) {
  for (let i = 0; i < total; i++) {
    const d = displace(baseX[i], baseY[i], s);
    const mag = d.mag;
    c.fillStyle = colorFor(mag, s);
    const norm = Math.min(1, Math.abs(mag) / (s.strength * 0.9 + 0.0001));
    const sz = dotSize * (1 + norm * 1.4);
    c.beginPath();
    c.arc(d.x, d.y, sz, 0, TWO_PI);
    c.fill();
  }
}

function drawGrid(
  c: CanvasRenderingContext2D,
  baseX: Float32Array,
  baseY: Float32Array,
  cols: number,
  rows: number,
  s: RippleState
) {
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols - 1; col++) {
      const i = r * cols + col;
      const a = displace(baseX[i], baseY[i], s);
      const ax = a.x;
      const ay = a.y;
      const amag = a.mag;
      const j = i + 1;
      const b = displace(baseX[j], baseY[j], s);
      c.strokeStyle = colorFor((amag + b.mag) * 0.5, s);
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
  }
  for (let col = 0; col < cols; col++) {
    for (let r = 0; r < rows - 1; r++) {
      const i = r * cols + col;
      const a = displace(baseX[i], baseY[i], s);
      const ax = a.x;
      const ay = a.y;
      const amag = a.mag;
      const j = i + cols;
      const b = displace(baseX[j], baseY[j], s);
      c.strokeStyle = colorFor((amag + b.mag) * 0.5, s);
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
  }
}

function drawLines(
  c: CanvasRenderingContext2D,
  baseX: Float32Array,
  baseY: Float32Array,
  cols: number,
  rows: number,
  _dotSize: number,
  s: RippleState
) {
  c.lineWidth = 1.5;
  for (let r = 0; r < rows; r++) {
    let sumMag = 0;
    c.beginPath();
    for (let col = 0; col < cols; col++) {
      const i = r * cols + col;
      const d = displace(baseX[i], baseY[i], s);
      sumMag += Math.abs(d.mag);
      if (col === 0) c.moveTo(d.x, d.y);
      else c.lineTo(d.x, d.y);
    }
    c.strokeStyle = colorFor(sumMag / cols, s);
    c.stroke();
  }
}
