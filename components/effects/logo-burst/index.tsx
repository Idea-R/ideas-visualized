"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

function makeSpark(): Spark {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0 };
}

interface Burst {
  x: number;
  y: number;
  age: number;
  maxLife: number;
  rays: number;
  rot: number;
  ringMax: number;
  hueBase: number;
}

function makeBurst(): Burst {
  return { x: 0, y: 0, age: 0, maxLife: 1, rays: 12, rot: 0, ringMax: 1, hueBase: 0 };
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export function LogoBurst({ params }: { params: EffectProps }) {
  const density = Math.round(Number(params.density));
  const speed = Number(params.speed);
  const spread = Number(params.spread);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const sparks = new Pool<Spark>(2400, makeSpark);
      const bursts = new Pool<Burst>(8, makeBurst);
      const baseR = Math.min(width, height) * 0.42;

      const fire = (cx: number, cy: number) => {
        bursts.spawn((b) => {
          b.x = cx;
          b.y = cy;
          b.age = 0;
          b.maxLife = 0.95 + Math.random() * 0.3;
          b.rays = Math.max(10, Math.round(density * 0.55));
          b.rot = Math.random() * Math.PI * 2;
          b.ringMax = baseR * (0.8 + Math.random() * 0.25);
          b.hueBase = paletteHue(mode, hue, hue2, 0.5);
        });
        for (let i = 0; i < density; i++) {
          sparks.spawn((s) => {
            const a = (i / density) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const sp = (150 + Math.random() * 260) * spread;
            s.x = cx;
            s.y = cy;
            s.vx = Math.cos(a) * sp;
            s.vy = Math.sin(a) * sp;
            s.life = 1;
            s.maxLife = 0.6 + Math.random() * 0.7;
            s.size = 1.3 + Math.random() * 2.2;
            s.hue = paletteHue(mode, hue, hue2, i / density) + (Math.random() - 0.5) * 24;
          });
        }
      };

      const autoPoint = (): [number, number] => [
        width * 0.5 + (Math.random() - 0.5) * width * 0.1,
        height * 0.5 + (Math.random() - 0.5) * height * 0.1,
      ];

      const nextInterval = () => (1.3 + Math.random() * 0.6) / Math.max(0.2, speed);
      let autoTimer = nextInterval();

      // Seed one burst at center immediately so the first frame already shows it
      // (also covers reduced-motion single-frame renders).
      fire(width / 2, height / 2);

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") fire(x, y);
        },
        draw: (c, dt) => {
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = nextInterval();
            const [px, py] = autoPoint();
            fire(px, py);
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          bursts.update((b) => {
            b.age += dt * speed;
            return b.age < b.maxLife;
          });
          bursts.forEach((b) => {
            const lifeT = Math.max(0, Math.min(1, b.age / b.maxLife));
            const grow = easeOutCubic(lifeT);
            const alpha = Math.max(0, 1 - lifeT);

            // Radiating rays that extend outward and fade.
            const inner = b.ringMax * 0.08 + b.ringMax * 0.18 * grow;
            const outer = b.ringMax * (0.28 + 0.72 * grow);
            c.lineCap = "round";
            for (let i = 0; i < b.rays; i++) {
              const a = b.rot + (i / b.rays) * Math.PI * 2;
              const ca = Math.cos(a);
              const sa = Math.sin(a);
              c.globalAlpha = alpha * 0.9;
              c.strokeStyle = `hsl(${paletteHue(mode, hue, hue2, i / b.rays)}, 95%, 66%)`;
              c.lineWidth = 2 + (1 - lifeT) * 3;
              c.beginPath();
              c.moveTo(b.x + ca * inner, b.y + sa * inner);
              c.lineTo(b.x + ca * outer, b.y + sa * outer);
              c.stroke();
            }

            // Expanding shockwave ring.
            const ringR = Math.max(0, b.ringMax * grow);
            c.globalAlpha = alpha * 0.8;
            c.strokeStyle = `hsl(${b.hueBase}, 95%, 70%)`;
            c.lineWidth = 2 + (1 - lifeT) * 6;
            c.beginPath();
            c.arc(b.x, b.y, ringR, 0, Math.PI * 2);
            c.stroke();

            // Bright core flash early in the burst.
            if (lifeT < 0.4) {
              const f = (0.4 - lifeT) / 0.4;
              const cr = b.ringMax * 0.28;
              const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, cr);
              g.addColorStop(0, `hsla(${b.hueBase}, 95%, 80%, ${0.8 * f})`);
              g.addColorStop(1, `hsla(${b.hueBase}, 95%, 60%, 0)`);
              c.globalAlpha = 1;
              c.fillStyle = g;
              c.beginPath();
              c.arc(b.x, b.y, cr, 0, Math.PI * 2);
              c.fill();
            }
          });

          sparks.update((s) => {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vx *= 0.965;
            s.vy *= 0.965;
            s.vy += 60 * dt; // gentle gravity for a celebratory arc
            s.life -= dt / s.maxLife;
            return s.life > 0;
          });
          sparks.forEach((s) => {
            const a = Math.max(0, s.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${s.hue}, 95%, 68%)`;
            c.beginPath();
            c.arc(s.x, s.y, s.size * (0.5 + a * 0.8), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [density, speed, spread, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
