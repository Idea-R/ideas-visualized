"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

const TRAIL_CAP = 9;

interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  landY: number;
  len: number;
  hue: number;
  /** Interleaved x,y history for the faint trail. */
  trail: number[];
  trailLen: number;
}

function makeArrow(): Arrow {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    landY: 0,
    len: 0,
    hue: 0,
    trail: new Array(TRAIL_CAP * 2).fill(0),
    trailLen: 0,
  };
}

interface Stuck {
  x: number;
  y: number;
  angle: number;
  len: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeStuck(): Stuck {
  return { x: 0, y: 0, angle: 0, len: 0, life: 0, maxLife: 1, hue: 0 };
}

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makePuff(): Puff {
  return { x: 0, y: 0, vx: 0, vy: 0, size: 1, life: 0, maxLife: 1, hue: 0 };
}

export function ArrowVolley({ params }: { params: EffectProps }) {
  const perVolley = Math.max(1, Math.round(Number(params.arrowsPerVolley ?? 14)));
  const power = Number(params.power ?? 1);
  const gravity = Number(params.gravity ?? 1);
  const fireRate = Number(params.fireRate ?? 1);
  const trailOn = Boolean(params.trail ?? true);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const arrows = new Pool<Arrow>(700, makeArrow);
      const stucks = new Pool<Stuck>(220, makeStuck);
      const puffs = new Pool<Puff>(1400, makePuff);

      const originX = width * 0.07;
      const originY = height * 0.86;
      const groundY = height * 0.86;
      const g = height * 1.55 * gravity;

      let autoTimer = 0;
      let seeded = false;

      const spawnPuffs = (cx: number, cy: number, baseHue: number) => {
        const n = 8 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) {
          puffs.spawn((p) => {
            const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.1;
            const v = 30 + Math.random() * 120;
            p.x = cx;
            p.y = cy;
            p.vx = Math.cos(a) * v + 20 + Math.random() * 30;
            p.vy = Math.sin(a) * v - 10;
            p.size = 3 + Math.random() * 7;
            p.life = 1;
            p.maxLife = 0.5 + Math.random() * 0.6;
            p.hue = baseHue + (Math.random() - 0.5) * 18;
          });
        }
      };

      // Fire a salvo aimed at (targetX, targetY) with a fanned spread. When
      // `seed` is true, each arrow is advanced a random amount along its arc so
      // the very first frame already shows a volley mid-flight.
      const fire = (targetX: number, targetY: number, seed: boolean) => {
        const count = perVolley;
        // Flight time controls speed/flatness; power makes shots faster/flatter.
        const flight = 1.7 / Math.max(0.35, power);
        for (let i = 0; i < count; i++) {
          const t = count > 1 ? i / (count - 1) : 0.5;
          const spreadX = (t - 0.5) * width * 0.22;
          const spreadY = (Math.random() - 0.5) * height * 0.08;
          const tx = targetX + spreadX;
          const ty = targetY + spreadY;
          const ft = flight * (0.85 + Math.random() * 0.3);
          const dx = tx - originX;
          const dy = ty - originY;
          const vx = dx / ft;
          const vy = dy / ft - 0.5 * g * ft;
          const baseHue = paletteHue(mode, hue, hue2, t);
          arrows.spawn((ar) => {
            ar.vx = vx;
            ar.vy = vy;
            ar.landY = ty;
            ar.len = 20 + Math.random() * 12;
            ar.hue = baseHue + (Math.random() - 0.5) * 14;
            ar.trailLen = 0;
            if (seed) {
              const e = Math.random() * ft * 0.8;
              ar.x = originX + vx * e;
              ar.y = originY + vy * e + 0.5 * g * e * e;
              ar.vy = vy + g * e;
            } else {
              ar.x = originX;
              ar.y = originY;
            }
          });
        }
      };

      const autoFire = () => {
        const tx = width * (0.78 + Math.random() * 0.16);
        const ty = groundY + (Math.random() - 0.5) * height * 0.05;
        fire(tx, ty, false);
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") fire(x, y, false);
        },
        draw: (c, dt) => {
          if (!seeded) {
            fire(width * 0.82, groundY, true);
            seeded = true;
            autoTimer = 1.6 / Math.max(0.3, fireRate);
          }
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = (1.5 + Math.random() * 1.2) / Math.max(0.3, fireRate);
            autoFire();
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Landing puffs — soft additive dust.
          c.globalCompositeOperation = "lighter";
          puffs.update((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 140 * dt;
            p.vx *= 0.92;
            p.vy *= 0.94;
            p.size += 30 * dt;
            p.life -= dt / p.maxLife;
            return p.life > 0;
          });
          puffs.forEach((p) => {
            const a = Math.max(0, p.life);
            c.globalAlpha = a * a * 0.5;
            c.fillStyle = `hsl(${p.hue}, 45%, 70%)`;
            c.beginPath();
            c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            c.fill();
          });

          // Faint arrow trails (additive).
          if (trailOn) {
            arrows.forEach((ar) => {
              if (ar.trailLen < 2) return;
              c.globalAlpha = 0.28;
              c.strokeStyle = `hsl(${ar.hue}, 90%, 62%)`;
              c.lineWidth = 1.5;
              c.lineCap = "round";
              c.beginPath();
              c.moveTo(ar.trail[0], ar.trail[1]);
              for (let k = 1; k < ar.trailLen; k++) {
                c.lineTo(ar.trail[k * 2], ar.trail[k * 2 + 1]);
              }
              c.stroke();
            });
          }
          c.globalCompositeOperation = "source-over";

          // Stuck arrows fading out where they landed.
          stucks.update((s) => {
            s.life -= dt / s.maxLife;
            return s.life > 0;
          });
          stucks.forEach((s) => {
            const a = Math.max(0, s.life);
            drawArrow(c, s.x, s.y, s.angle, s.len, s.hue, a);
          });

          // Live arrows: integrate, rotate to velocity, land on descent.
          arrows.update((ar) => {
            if (trailOn) {
              if (ar.trailLen < TRAIL_CAP) {
                ar.trail[ar.trailLen * 2] = ar.x;
                ar.trail[ar.trailLen * 2 + 1] = ar.y;
                ar.trailLen++;
              } else {
                for (let k = 0; k < TRAIL_CAP - 1; k++) {
                  ar.trail[k * 2] = ar.trail[(k + 1) * 2];
                  ar.trail[k * 2 + 1] = ar.trail[(k + 1) * 2 + 1];
                }
                ar.trail[(TRAIL_CAP - 1) * 2] = ar.x;
                ar.trail[(TRAIL_CAP - 1) * 2 + 1] = ar.y;
              }
            }
            ar.x += ar.vx * dt;
            ar.y += ar.vy * dt;
            ar.vy += g * dt;

            const landed =
              (ar.vy > 0 && ar.y >= ar.landY) ||
              ar.y >= height + 40 ||
              ar.x >= width + 60;
            if (landed) {
              const lx = ar.x;
              const ly = Math.min(ar.y, ar.landY);
              const angle = Math.atan2(ar.vy, ar.vx);
              spawnPuffs(lx, ly, ar.hue);
              stucks.spawn((s) => {
                s.x = lx;
                s.y = ly;
                s.angle = angle;
                s.len = ar.len;
                s.life = 1;
                s.maxLife = 0.9 + Math.random() * 0.7;
                s.hue = ar.hue;
              });
              return false;
            }
            return true;
          });
          arrows.forEach((ar) => {
            const angle = Math.atan2(ar.vy, ar.vx);
            drawArrow(c, ar.x, ar.y, angle, ar.len, ar.hue, 1);
          });

          c.globalAlpha = 1;
          c.lineCap = "butt";
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [perVolley, power, gravity, fireRate, trailOn, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}

/** Draw a single arrow (shaft + head + faint fletching) at `alpha`. */
function drawArrow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  len: number,
  hue: number,
  alpha: number
) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const half = len / 2;
  const tipX = x + dx * half;
  const tipY = y + dy * half;
  const tailX = x - dx * half;
  const tailY = y - dy * half;
  // Perpendicular for head barbs + fletching.
  const px = -dy;
  const py = dx;

  // Shaft.
  c.globalAlpha = alpha;
  c.strokeStyle = `hsl(${hue}, 70%, 58%)`;
  c.lineWidth = 2;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(tailX, tailY);
  c.lineTo(tipX, tipY);
  c.stroke();

  // Faint fletching near the tail.
  const fx = tailX + dx * (len * 0.12);
  const fy = tailY + dy * (len * 0.12);
  const fw = len * 0.16;
  c.globalAlpha = alpha * 0.55;
  c.strokeStyle = `hsl(${hue}, 80%, 72%)`;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(tailX, tailY);
  c.lineTo(fx + px * fw, fy + py * fw);
  c.moveTo(tailX, tailY);
  c.lineTo(fx - px * fw, fy - py * fw);
  c.stroke();

  // Arrow head.
  const hw = len * 0.16;
  const hb = len * 0.26;
  const baseX = tipX - dx * hb;
  const baseY = tipY - dy * hb;
  c.globalAlpha = alpha;
  c.fillStyle = `hsl(${hue}, 85%, 66%)`;
  c.beginPath();
  c.moveTo(tipX, tipY);
  c.lineTo(baseX + px * hw, baseY + py * hw);
  c.lineTo(baseX - px * hw, baseY - py * hw);
  c.closePath();
  c.fill();
}
