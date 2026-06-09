"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";
import { Pool } from "@/lib/effects/pool";

type SparkType = "spark" | "ember" | "smoke";

const TRAIL = 8;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  gravity: number;
  type: SparkType;
  t: number; // palette factor in [0,1]
  // Fixed-size ring buffer for the explicit motion trail (no per-frame alloc).
  trailX: number[];
  trailY: number[];
  tn: number;
  ti: number;
}

export function EmberForge({ params }: { params: EffectProps }) {
  const sparkRate = Math.max(0, Number(params.sparkRate ?? 1));
  // < 1 = buoyant (sparks float), > 1 = heavier fall.
  const gravityMul = Math.max(0.1, Number(params.gravity ?? 1));
  const strike = Math.max(0, Number(params.strike ?? 1));
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const area = width * height;
      const cap = Math.min(900, Math.round((area / 1600) + 200));
      const pool = new Pool<Spark>(cap, () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
        life: 0,
        maxLife: 1,
        gravity: 0,
        type: "spark",
        t: 0,
        trailX: new Array(TRAIL).fill(0),
        trailY: new Array(TRAIL).fill(0),
        tn: 0,
        ti: 0,
      }));

      const resetTrail = (s: Spark) => {
        s.tn = 0;
        s.ti = 0;
      };

      const spawnSpark = (type: SparkType) => {
        const originX = width * 0.2 + Math.random() * width * 0.6;
        const originY = height * 0.84 + Math.random() * height * 0.16;
        pool.spawn((s) => {
          s.x = originX;
          s.y = originY;
          s.type = type;
          s.life = 0;
          s.t = Math.random();
          resetTrail(s);
          if (type === "smoke") {
            s.vx = (Math.random() - 0.5) * 18;
            s.vy = -(18 + Math.random() * 30);
            s.size = 6 + Math.random() * 10;
            s.maxLife = 3.2 + Math.random() * 2.4;
            s.gravity = -8; // smoke is buoyant
          } else if (type === "spark") {
            s.vx = (Math.random() - 0.5) * 180;
            s.vy = -(180 + Math.random() * 240);
            s.size = 1 + Math.random() * 2;
            s.maxLife = 1 + Math.random() * 1.3;
            s.gravity = 220 * gravityMul;
          } else {
            // ember
            s.vx = (Math.random() - 0.5) * 48;
            s.vy = -(60 + Math.random() * 150);
            s.size = 1.5 + Math.random() * 3;
            s.maxLife = 2 + Math.random() * 3;
            s.gravity = 55 * gravityMul;
          }
        });
      };

      const spawnBurst = (cx: number, cy: number, count: number) => {
        for (let i = 0; i < count; i++) {
          pool.spawn((s) => {
            const angle = Math.random() * Math.PI * 1.2 - Math.PI * 0.6 - Math.PI / 2;
            const speed = 120 + Math.random() * 320;
            s.x = cx;
            s.y = cy;
            s.vx = Math.cos(angle) * speed;
            s.vy = Math.sin(angle) * speed;
            s.size = 0.8 + Math.random() * 2;
            s.life = 0;
            s.maxLife = 0.7 + Math.random() * 0.9;
            s.gravity = 280 * gravityMul;
            s.type = "spark";
            s.t = Math.random();
            resetTrail(s);
          });
        }
      };

      let burstCooldown = 0;

      const heatColor = (factor: number, heat: number, alpha: number) => {
        // heat in [0,1]: near 1 = white-hot, near 0 = deep ember.
        const h = paletteHue(mode, hue, hue2, factor);
        const light = 38 + heat * 56; // 38% → 94%
        const sat = 100 - heat * 22; // hotter washes toward white
        return `hsla(${Math.round(h)}, ${sat}%, ${light}%, ${alpha})`;
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") {
            spawnBurst(x, y, Math.round((20 + Math.random() * 16) * (0.5 + strike)));
          }
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Spawn rate (Poisson-ish via per-frame probability scaled by dt).
          const spawnP = Math.min(1, (0.18 + sparkRate * 0.5) * dt * 60);
          if (pool.count < cap - 40) {
            if (Math.random() < spawnP) spawnSpark("ember");
            if (Math.random() < spawnP * 0.45) spawnSpark("spark");
            if (Math.random() < 0.04 * sparkRate * dt * 60) spawnSpark("smoke");
          }

          // Periodic anvil strike.
          burstCooldown -= dt;
          if (burstCooldown <= 0 && Math.random() < 0.012 * (0.4 + strike) * dt * 60) {
            const bx = width * 0.3 + Math.random() * width * 0.4;
            const by = height * 0.68 + Math.random() * height * 0.2;
            spawnBurst(bx, by, Math.round((14 + Math.random() * 14) * (0.5 + strike)));
            burstCooldown = 1.6;
          }

          c.globalCompositeOperation = "lighter";

          pool.update((s) => {
            s.life += dt;
            if (s.life >= s.maxLife) return false;

            s.x += s.vx * dt;
            s.vy += s.gravity * dt;
            s.y += s.vy * dt;
            s.vx *= s.type === "smoke" ? 0.985 : 0.97;
            if (s.type !== "spark") {
              s.x += Math.sin(s.life * 1.8 + s.x * 0.01) * 18 * dt;
            }

            if (s.y < -40 || s.x < -40 || s.x > width + 40) return false;

            const prog = s.life / s.maxLife;
            const heat = 1 - prog;

            if (s.type === "smoke") {
              const alpha = (1 - prog) * 0.07;
              const radius = s.size * (1 + prog * 2.4);
              const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius);
              g.addColorStop(0, `rgba(150,128,108,${alpha})`);
              g.addColorStop(1, "transparent");
              c.fillStyle = g;
              c.beginPath();
              c.arc(s.x, s.y, radius, 0, Math.PI * 2);
              c.fill();
              return true;
            }

            // Explicit fading polyline trail (sparks only).
            if (s.type === "spark") {
              s.trailX[s.ti] = s.x;
              s.trailY[s.ti] = s.y;
              s.ti = (s.ti + 1) % TRAIL;
              if (s.tn < TRAIL) s.tn++;
              if (s.tn > 1) {
                c.lineWidth = s.size * 0.6;
                c.lineCap = "round";
                for (let k = 0; k < s.tn - 1; k++) {
                  const i0 = (s.ti - s.tn + k + TRAIL * 2) % TRAIL;
                  const i1 = (i0 + 1) % TRAIL;
                  const seg = k / (s.tn - 1); // 0 oldest → 1 newest
                  c.strokeStyle = heatColor(s.t, heat * (0.4 + seg * 0.6), heat * seg * 0.6);
                  c.beginPath();
                  c.moveTo(s.trailX[i0], s.trailY[i0]);
                  c.lineTo(s.trailX[i1], s.trailY[i1]);
                  c.stroke();
                }
              }
            }

            // Glow halo.
            const glowR = s.size * (s.type === "spark" ? 3 : 5);
            const grad = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
            grad.addColorStop(0, heatColor(s.t, heat, heat * 0.55));
            grad.addColorStop(1, "transparent");
            c.fillStyle = grad;
            c.beginPath();
            c.arc(s.x, s.y, glowR, 0, Math.PI * 2);
            c.fill();

            // Core.
            c.fillStyle = heatColor(s.t, Math.min(1, heat + 0.25), heat);
            c.beginPath();
            c.arc(s.x, s.y, s.size * (s.type === "spark" ? 0.7 : 1), 0, Math.PI * 2);
            c.fill();

            return true;
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
          c.lineCap = "butt";
        },
        cleanup: () => {
          pool.clear();
        },
      };
    },
    [sparkRate, gravityMul, strike, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
