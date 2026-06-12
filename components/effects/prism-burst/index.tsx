"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  width: number;
  angle: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeShard(): Shard {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    len: 0,
    width: 0,
    angle: 0,
    life: 0,
    maxLife: 1,
    hue: 0,
  };
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
}

function makeSpark(): Spark {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0 };
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  speed: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeRing(): Ring {
  return { x: 0, y: 0, radius: 0, speed: 0, life: 0, maxLife: 1, hue: 0 };
}

export function PrismBurst({ params }: { params: EffectProps }) {
  const density = Math.max(1, Math.round(Number(params.particles ?? 26)));
  const speed = Number(params.speed ?? 1);
  const spread = Number(params.spread ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const shards = new Pool<Shard>(900, makeShard);
      const sparks = new Pool<Spark>(2600, makeSpark);
      const rings = new Pool<Ring>(48, makeRing);
      let autoTimer = 0;
      let seeded = false;

      const fire = (cx: number, cy: number) => {
        const shardCount = density;
        const sparkCount = density * 3;

        for (let i = 0; i < shardCount; i++) {
          shards.spawn((s) => {
            const a = Math.random() * Math.PI * 2;
            const v = (150 + Math.random() * 320) * speed;
            const t = i / shardCount;
            s.x = cx;
            s.y = cy;
            s.vx = Math.cos(a) * v * spread;
            s.vy = Math.sin(a) * v * spread;
            s.angle = a;
            s.len = 26 + Math.random() * 46;
            s.width = 1.5 + Math.random() * 3;
            s.life = 1;
            s.maxLife = 0.7 + Math.random() * 0.6;
            s.hue = paletteHue(mode, hue, hue2, t) + (Math.random() - 0.5) * 24;
          });
        }

        for (let i = 0; i < sparkCount; i++) {
          sparks.spawn((sp) => {
            const a = Math.random() * Math.PI * 2;
            const v = (90 + Math.random() * 420) * speed;
            const t = i / sparkCount;
            sp.x = cx;
            sp.y = cy;
            sp.vx = Math.cos(a) * v * spread;
            sp.vy = Math.sin(a) * v * spread;
            sp.size = 1 + Math.random() * 2.2;
            sp.life = 1;
            sp.maxLife = 0.5 + Math.random() * 0.7;
            sp.hue = paletteHue(mode, hue, hue2, t) + (Math.random() - 0.5) * 30;
          });
        }

        rings.spawn((r) => {
          r.x = cx;
          r.y = cy;
          r.radius = 4;
          r.speed = (260 + Math.random() * 120) * speed * spread;
          r.life = 1;
          r.maxLife = 0.9 + Math.random() * 0.3;
          r.hue = paletteHue(mode, hue, hue2, 0.5);
        });
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") fire(x, y);
        },
        draw: (c, dt) => {
          if (!seeded) {
            fire(width * 0.5, height * 0.5);
            seeded = true;
          }
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = 2.2 + Math.random() * 1.6;
            fire(width * 0.5, height * 0.5);
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          rings.update((r) => {
            r.radius += r.speed * dt;
            r.life -= dt / r.maxLife;
            return r.life > 0;
          });
          rings.forEach((r) => {
            const a = Math.max(0, r.life);
            const segs = 7;
            for (let k = 0; k < segs; k++) {
              const segHue =
                mode === "rainbow"
                  ? (k / segs) * 360
                  : paletteHue(mode, hue, hue2, k / segs);
              c.globalAlpha = a * a * 0.5;
              c.strokeStyle = `hsl(${segHue}, 95%, 65%)`;
              c.lineWidth = 1.5 + a * 2;
              c.beginPath();
              c.arc(
                r.x,
                r.y,
                Math.max(0, r.radius - k * 3),
                0,
                Math.PI * 2
              );
              c.stroke();
            }
          });

          shards.update((s) => {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vx *= 0.94;
            s.vy *= 0.94;
            s.life -= dt / s.maxLife;
            return s.life > 0;
          });
          shards.forEach((s) => {
            const a = Math.max(0, s.life);
            const half = (s.len * a) / 2;
            const dx = Math.cos(s.angle);
            const dy = Math.sin(s.angle);
            const grad = c.createLinearGradient(
              s.x - dx * half,
              s.y - dy * half,
              s.x + dx * half,
              s.y + dy * half
            );
            grad.addColorStop(0, `hsla(${s.hue}, 95%, 65%, 0)`);
            grad.addColorStop(0.5, `hsla(${s.hue}, 98%, 72%, ${a})`);
            grad.addColorStop(1, `hsla(${s.hue + 30}, 95%, 65%, 0)`);
            c.globalAlpha = 1;
            c.strokeStyle = grad;
            c.lineWidth = s.width;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(s.x - dx * half, s.y - dy * half);
            c.lineTo(s.x + dx * half, s.y + dy * half);
            c.stroke();
          });

          sparks.update((sp) => {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.vy += 26 * dt;
            sp.vx *= 0.965;
            sp.vy *= 0.965;
            sp.life -= dt / sp.maxLife;
            return sp.life > 0;
          });
          sparks.forEach((sp) => {
            const a = Math.max(0, sp.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${sp.hue}, 95%, 70%)`;
            c.beginPath();
            c.arc(sp.x, sp.y, sp.size * (0.4 + a * 0.8), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.lineCap = "butt";
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [density, speed, spread, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
