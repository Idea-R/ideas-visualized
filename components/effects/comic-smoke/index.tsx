"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxLife: number;
  radius: number; // target cloud radius
  lobes: number; // scallop bumps around the rim
  rot: number;
  spin: number;
  seed: number; // stable per-puff lobe variation
  hue: number;
}

function makePuff(): Puff {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    maxLife: 1,
    radius: 10,
    lobes: 6,
    rot: 0,
    spin: 0,
    seed: 0,
    hue: 0,
  };
}

// Stable pseudo-random in [0,1] from a scalar seed (deterministic lobe sizes).
function hash(seed: number): number {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export function ComicSmoke({ params }: { params: EffectProps }) {
  const density = Number(params.density);
  const speed = Number(params.speed);
  const size = Number(params.size);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const puffs = new Pool<Puff>(220, makePuff);
      const baseR = Math.min(width, height) * 0.16 * size;

      // Spawn a single rising puff near the chimney point (center / bottom).
      const spawnPuff = (cx: number, cy: number, scatter: number, t: number) => {
        puffs.spawn((p) => {
          p.x = cx + (Math.random() - 0.5) * scatter;
          p.y = cy + (Math.random() - 0.5) * scatter * 0.5;
          p.vx = (Math.random() - 0.5) * 26;
          p.vy = -(34 + Math.random() * 40) * speed;
          p.age = 0;
          p.maxLife = (2.4 + Math.random() * 1.6) / Math.max(0.25, speed);
          p.radius = baseR * (0.7 + Math.random() * 0.7);
          p.lobes = 5 + Math.floor(Math.random() * 4);
          p.rot = Math.random() * Math.PI * 2;
          p.spin = (Math.random() - 0.5) * 0.6;
          p.seed = Math.random() * 1000;
          p.hue = paletteHue(mode, hue, hue2, t) + (Math.random() - 0.5) * 20;
        });
      };

      // A celebratory cluster of puffs at the pointer on click.
      const burst = (cx: number, cy: number) => {
        const n = Math.round(6 + density * 0.6);
        for (let i = 0; i < n; i++) spawnPuff(cx, cy, baseR * 1.4, i / n);
      };

      const chimney = (): [number, number] => [width * 0.5, height * 0.86];

      // Pre-seed a staggered rising column so the very first frame is never
      // blank: each puff starts already partway up and partway through life.
      {
        const [cx, cy] = chimney();
        const seeded = 9;
        for (let i = 0; i < seeded; i++) {
          const t = i / seeded;
          spawnPuff(cx, cy, baseR, t);
        }
        let i = 0;
        puffs.forEach((p) => {
          const t = i / seeded;
          p.age = t * p.maxLife * 0.7;
          p.y = cy - t * height * 0.7;
          i++;
        });
      }

      // Recurring emission timer. density sets how many puffs per second rise.
      let emit = 0;

      const drawCloud = (
        c: CanvasRenderingContext2D,
        p: Puff,
        grow: number,
        alpha: number
      ) => {
        const r = p.radius * grow;
        const ring = r * 0.5;
        const count = p.lobes;

        // Outline pass: slightly larger dark lobes for the comic-ink edge.
        c.globalAlpha = alpha;
        c.fillStyle = `hsl(${p.hue}, 28%, 14%)`;
        c.beginPath();
        const outlineLobe = (cx: number, cy: number, lr: number) => {
          c.moveTo(cx + lr, cy);
          c.arc(cx, cy, lr, 0, Math.PI * 2);
        };
        outlineLobe(p.x, p.y, r * 0.62 + 3);
        for (let i = 0; i < count; i++) {
          const a = p.rot + (i / count) * Math.PI * 2;
          const lr = ring * (0.62 + hash(p.seed + i) * 0.4) + 3;
          outlineLobe(p.x + Math.cos(a) * ring, p.y + Math.sin(a) * ring, lr);
        }
        c.fill();

        // Fill pass: lighter scalloped puffs with a soft radial shade.
        const lobe = (cx: number, cy: number, lr: number) => {
          const g = c.createRadialGradient(
            cx - lr * 0.3,
            cy - lr * 0.3,
            lr * 0.1,
            cx,
            cy,
            lr
          );
          g.addColorStop(0, `hsl(${p.hue}, 70%, 86%)`);
          g.addColorStop(0.6, `hsl(${p.hue}, 60%, 70%)`);
          g.addColorStop(1, `hsl(${p.hue}, 55%, 54%)`);
          c.fillStyle = g;
          c.beginPath();
          c.arc(cx, cy, lr, 0, Math.PI * 2);
          c.fill();
        };
        c.globalAlpha = alpha;
        lobe(p.x, p.y, r * 0.62);
        for (let i = 0; i < count; i++) {
          const a = p.rot + (i / count) * Math.PI * 2;
          const lr = ring * (0.62 + hash(p.seed + i) * 0.4);
          lobe(p.x + Math.cos(a) * ring, p.y + Math.sin(a) * ring, lr);
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") burst(x, y);
        },
        draw: (c, dt) => {
          const [cx, cy] = chimney();
          emit += dt * (1.2 + density * 0.18) * speed;
          while (emit >= 1) {
            emit -= 1;
            spawnPuff(cx, cy, baseR * 0.6, Math.random());
          }

          c.globalCompositeOperation = "source-over";

          puffs.update((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy *= 0.992; // slows as it rises
            p.rot += p.spin * dt;
            p.age += dt;
            return p.age < p.maxLife;
          });

          puffs.forEach((p) => {
            const lifeT = p.age / p.maxLife;
            const grow = 0.5 + easeOutCubic(Math.min(1, lifeT * 1.3)) * 0.9;
            const fadeIn = Math.min(1, lifeT * 6);
            const fadeOut = Math.min(1, (1 - lifeT) * 2.2);
            const alpha = Math.max(0, fadeIn * fadeOut) * 0.92;
            if (alpha <= 0) return;
            drawCloud(c, p, grow, alpha);
          });

          c.globalAlpha = 1;
        },
      };
    },
    [density, speed, size, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
