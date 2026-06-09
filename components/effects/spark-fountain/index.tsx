"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import { Pool } from "@/lib/effects/pool";
import type { EffectProps } from "@/lib/effects/types";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
  t: number;
}

export function SparkFountain({ params }: { params: EffectProps }) {
  const burstRate = Number(params.burstRate ?? 1);
  const power = Number(params.power ?? 1);
  const gravity = Number(params.gravity ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const pool = new Pool<Spark>(700, () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        r: 1,
        t: 0,
      }));

      let timer = 0;
      let next = 0.4;

      const burst = (x: number, y: number, energy: number) => {
        const count = Math.floor(10 + energy * 20);
        for (let i = 0; i < count; i++) {
          pool.spawn((s) => {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.5;
            const speed = (4 + Math.random() * 6 + energy * 8) * 60 * power;
            s.x = x;
            s.y = y;
            s.vx = Math.cos(angle) * speed;
            s.vy = Math.sin(angle) * speed;
            s.life = 1;
            s.r = 1.5 + Math.random() * 2;
            s.t = Math.random();
          });
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") burst(x, y, 1.4);
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Internal rhythm: periodic launches from the bottom edge.
          const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
          timer += dt;
          if (timer >= next) {
            timer = 0;
            burst(width * (0.3 + Math.random() * 0.4), height - 6, 0.6 + pulse);
            next = (0.5 + Math.random() * 0.5) / Math.max(0.25, burstRate);
          }

          const g = 900 * gravity;
          const drag = Math.pow(0.98, dt * 60);
          pool.update((s) => {
            s.vy += g * dt;
            s.vx *= drag;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.life -= dt * 0.9;
            return s.life > 0 && s.y < height + 40;
          });

          c.globalCompositeOperation = "lighter";
          pool.forEach((s) => {
            const a = s.life * s.life;
            c.globalAlpha = a;
            c.fillStyle = `hsl(${paletteHue(mode, hue, hue2, s.t)}, 100%, 62%)`;
            c.beginPath();
            c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [burstRate, power, gravity, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
