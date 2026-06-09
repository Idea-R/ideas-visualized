"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import type { EffectProps } from "@/lib/effects/types";

const MAX_TRAIL = 24;

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
  hx: Float32Array;
  hy: Float32Array;
  hn: number; // number of stored history points
}

function makeParticle(): P {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 1,
    hue: 200,
    hx: new Float32Array(MAX_TRAIL),
    hy: new Float32Array(MAX_TRAIL),
    hn: 0,
  };
}

export function CursorAttractor({ params }: { params: EffectProps }) {
  const gravity = Number(params.gravity);
  const emitRate = Number(params.emitRate);
  const trail = Math.min(MAX_TRAIL, Math.round(Number(params.trail)));
  const repel = String(params.mode) === "repel";

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const pool = new Pool<P>(1400, makeParticle);
      const center = { x: width / 2, y: height / 2 };
      const mouse = { x: center.x, y: center.y, active: false };
      let hueBase = 200;

      const spawn = (n: number) => {
        for (let i = 0; i < n; i++) {
          pool.spawn((p) => {
            const a = Math.random() * Math.PI * 2;
            const s = 1 + Math.random() * 3;
            p.x = mouse.active ? mouse.x : center.x;
            p.y = mouse.active ? mouse.y : center.y;
            p.vx = Math.cos(a) * s;
            p.vy = Math.sin(a) * s;
            p.life = 1;
            p.hue = hueBase + Math.random() * 60;
            p.hn = 0;
          });
        }
      };

      return {
        // Crisp full clear every frame — trails are explicit history, no burn-in.
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            mouse.active = false;
          } else {
            mouse.x = x;
            mouse.y = y;
            mouse.active = true;
            if (type === "down") spawn(60);
          }
        },
        draw: (c, dt, t) => {
          hueBase = 200 + Math.sin(t * 0.3) * 60;
          spawn(Math.round(emitRate));

          const sign = repel ? -1 : 1;
          pool.update((p) => {
            const dx = center.x - p.x;
            const dy = center.y - p.y;
            const dist = Math.max(20, Math.hypot(dx, dy));
            const f = (sign * gravity * 120) / (dist * dist);
            p.vx += (dx / dist) * f;
            p.vy += (dy / dist) * f;
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.life -= dt * 0.4;

            if (trail > 0) {
              if (p.hn < trail) {
                p.hx[p.hn] = p.x;
                p.hy[p.hn] = p.y;
                p.hn++;
              } else {
                for (let i = 0; i < trail - 1; i++) {
                  p.hx[i] = p.hx[i + 1];
                  p.hy[i] = p.hy[i + 1];
                }
                p.hx[trail - 1] = p.x;
                p.hy[trail - 1] = p.y;
              }
            }
            return p.life > 0;
          });

          c.globalCompositeOperation = "lighter";
          pool.forEach((p) => {
            for (let i = 0; i < p.hn; i++) {
              const a = (i / p.hn) * p.life;
              c.fillStyle = `hsla(${p.hue}, 90%, 60%, ${a})`;
              const r = 1 + (i / p.hn) * 2.2;
              c.beginPath();
              c.arc(p.hx[i], p.hy[i], r, 0, Math.PI * 2);
              c.fill();
            }
            c.fillStyle = `hsla(${p.hue}, 95%, 65%, ${p.life})`;
            c.beginPath();
            c.arc(p.x, p.y, 1.8 + p.life * 1.8, 0, Math.PI * 2);
            c.fill();
          });
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [gravity, emitRate, trail, repel]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
