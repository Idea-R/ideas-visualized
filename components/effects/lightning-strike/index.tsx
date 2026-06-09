"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

const MAIN_SEG = 16; // points along the main bolt path
const MAX_BRANCHES = 5;
const BRANCH_SEG = 7; // points per branch polyline

interface Bolt {
  mx: Float32Array;
  my: Float32Array;
  mn: number; // active main points
  bx: Float32Array; // branch points, MAX_BRANCHES * BRANCH_SEG
  by: Float32Array;
  bCount: Int16Array; // points used per branch
  bn: number; // active branches
  life: number;
  maxLife: number;
  hue: number;
  hj: number; // per-bolt hue jitter offset
}

function makeBolt(): Bolt {
  return {
    mx: new Float32Array(MAIN_SEG),
    my: new Float32Array(MAIN_SEG),
    mn: 0,
    bx: new Float32Array(MAX_BRANCHES * BRANCH_SEG),
    by: new Float32Array(MAX_BRANCHES * BRANCH_SEG),
    bCount: new Int16Array(MAX_BRANCHES),
    bn: 0,
    life: 1,
    maxLife: 1,
    hue: 200,
    hj: 0,
  };
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeSpark(): Spark {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, hue: 200 };
}

export function LightningStrike({ params }: { params: EffectProps }) {
  const branches = Math.round(Number(params.branches));
  const jitter = Number(params.jitter);
  const { mode, hue, hue2 } = readPalette(params);
  const auto = Boolean(params.auto);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const bolts = new Pool<Bolt>(24, makeBolt);
      const sparks = new Pool<Spark>(700, makeSpark);
      let autoTimer = 0.6;

      const strike = (tx: number, ty: number) => {
        // Origin: a point along the top / upper edge, biased toward target x.
        const ox = tx + (Math.random() - 0.5) * width * 0.5;
        const oy = -10 - Math.random() * 20;

        bolts.spawn((b) => {
          b.life = 1;
          b.maxLife = 0.32 + Math.random() * 0.16;
          b.hj = (Math.random() - 0.5) * 24;
          b.mn = MAIN_SEG;
          b.bn = 0;

          // Jagged main path from origin to target.
          for (let i = 0; i < MAIN_SEG; i++) {
            const t = i / (MAIN_SEG - 1);
            const px = ox + (tx - ox) * t;
            const py = oy + (ty - oy) * t;
            // Endpoints stay anchored; midpoints jitter perpendicular-ish.
            const j = i === 0 || i === MAIN_SEG - 1 ? 0 : jitter;
            b.mx[i] = px + (Math.random() - 0.5) * j * 2;
            b.my[i] = py + (Math.random() - 0.5) * j;
          }

          // Branches fork off random interior main points.
          const want = Math.min(MAX_BRANCHES, branches);
          for (let k = 0; k < want; k++) {
            const anchor = 2 + Math.floor(Math.random() * (MAIN_SEG - 4));
            let bx = b.mx[anchor];
            let by = b.my[anchor];
            const dirx = b.mx[anchor + 1] - b.mx[anchor - 1];
            const diry = b.my[anchor + 1] - b.my[anchor - 1];
            const dlen = Math.max(0.001, Math.hypot(dirx, diry));
            // Veer at an angle off the main direction.
            const sign = Math.random() < 0.5 ? -1 : 1;
            let ax = (dirx / dlen) * Math.cos(0.7 * sign) - (diry / dlen) * Math.sin(0.7 * sign);
            let ay = (dirx / dlen) * Math.sin(0.7 * sign) + (diry / dlen) * Math.cos(0.7 * sign);
            const step = (18 + Math.random() * 22);
            const base = k * BRANCH_SEG;
            for (let s = 0; s < BRANCH_SEG; s++) {
              b.bx[base + s] = bx;
              b.by[base + s] = by;
              bx += ax * step + (Math.random() - 0.5) * jitter * 1.4;
              by += ay * step + (Math.random() - 0.5) * jitter * 1.4;
              ax += (Math.random() - 0.5) * 0.3;
              ay += (Math.random() - 0.5) * 0.3;
            }
            b.bCount[k] = BRANCH_SEG;
            b.bn++;
          }

          // Spark particles scattered along the path.
          for (let i = 0; i < MAIN_SEG; i += 2) {
            const n = 1 + Math.floor(Math.random() * 2);
            for (let s = 0; s < n; s++) {
              sparks.spawn((sp) => {
                const a = Math.random() * Math.PI * 2;
                const spd = 40 + Math.random() * 140;
                sp.x = b.mx[i];
                sp.y = b.my[i];
                sp.vx = Math.cos(a) * spd;
                sp.vy = Math.sin(a) * spd;
                sp.life = 1;
                sp.maxLife = 0.3 + Math.random() * 0.4;
                const st = mode === "rainbow" ? i / MAIN_SEG : i % 2;
                sp.hue =
                  paletteHue(mode, hue, hue2, st) + (Math.random() - 0.5) * 30;
              });
            }
          }
        });
      };

      const drawPolyline = (
        c: CanvasRenderingContext2D,
        xs: Float32Array,
        ys: Float32Array,
        start: number,
        n: number
      ) => {
        c.beginPath();
        c.moveTo(xs[start], ys[start]);
        for (let i = 1; i < n; i++) c.lineTo(xs[start + i], ys[start + i]);
        c.stroke();
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") strike(x, y);
        },
        draw: (c, dt) => {
          if (auto) {
            autoTimer -= dt;
            if (autoTimer <= 0) {
              autoTimer = 0.9 + Math.random() * 1.4;
              strike(
                width * (0.2 + Math.random() * 0.6),
                height * (0.45 + Math.random() * 0.5)
              );
            }
          }

          // Opaque dark stage (full clear leaves transparent).
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          sparks.update((sp) => {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.vy += 90 * dt;
            sp.vx *= 0.96;
            sp.vy *= 0.96;
            sp.life -= dt / sp.maxLife;
            return sp.life > 0;
          });

          bolts.update((b) => {
            b.life -= dt / b.maxLife;
            return b.life > 0;
          });

          c.globalCompositeOperation = "lighter";
          c.lineCap = "round";
          c.lineJoin = "round";

          bolts.forEach((b) => {
            const a = Math.max(0, b.life);
            // Colored glow pass.
            const mainHue = Math.round(
              ((paletteHue(mode, hue, hue2, 0) + b.hj) % 360 + 360) % 360
            );
            c.shadowColor = `hsla(${mainHue}, 100%, 60%, ${a})`;
            c.shadowBlur = 16;
            c.strokeStyle = `hsla(${mainHue}, 100%, 62%, ${a * 0.8})`;
            c.lineWidth = 5;
            drawPolyline(c, b.mx, b.my, 0, b.mn);
            for (let k = 0; k < b.bn; k++) {
              const tb = mode === "rainbow" ? k / Math.max(1, b.bn) : k % 2;
              const branchHue = Math.round(
                ((paletteHue(mode, hue, hue2, tb) + b.hj) % 360 + 360) % 360
              );
              c.shadowColor = `hsla(${branchHue}, 100%, 60%, ${a})`;
              c.strokeStyle = `hsla(${branchHue}, 100%, 62%, ${a * 0.8})`;
              c.lineWidth = 3;
              drawPolyline(c, b.bx, b.by, k * BRANCH_SEG, b.bCount[k]);
            }
            // White-hot core pass.
            c.shadowBlur = 6;
            c.shadowColor = "rgba(255,255,255,0.9)";
            c.strokeStyle = `rgba(255,255,255,${a})`;
            c.lineWidth = 1.6;
            drawPolyline(c, b.mx, b.my, 0, b.mn);
            for (let k = 0; k < b.bn; k++) {
              c.lineWidth = 1;
              drawPolyline(c, b.bx, b.by, k * BRANCH_SEG, b.bCount[k]);
            }
          });

          c.shadowBlur = 0;
          sparks.forEach((sp) => {
            const a = Math.max(0, sp.life);
            c.fillStyle = `hsla(${sp.hue}, 100%, 70%, ${a})`;
            c.beginPath();
            c.arc(sp.x, sp.y, 1 + a * 1.6, 0, Math.PI * 2);
            c.fill();
          });

          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [branches, jitter, mode, hue, hue2, auto]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
