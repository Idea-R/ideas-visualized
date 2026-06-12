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
  angle: number;
  len: number;
  width: number;
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
    angle: 0,
    len: 0,
    width: 0,
    life: 0,
    maxLife: 1,
    hue: 0,
  };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  drift: boolean;
  life: number;
  maxLife: number;
  hue: number;
}

function makeParticle(): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 1,
    spin: 0,
    drift: false,
    life: 0,
    maxLife: 1,
    hue: 0,
  };
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

interface Flash {
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeFlash(): Flash {
  return { x: 0, y: 0, size: 0, life: 0, maxLife: 1, hue: 0 };
}

export function FrostNova({ params }: { params: EffectProps }) {
  const shardCount = Math.max(3, Math.round(Number(params.shards ?? 18)));
  const power = Number(params.power ?? 1);
  const ringSpeed = Number(params.ringSpeed ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const shards = new Pool<Shard>(600, makeShard);
      const particles = new Pool<Particle>(2400, makeParticle);
      const rings = new Pool<Ring>(48, makeRing);
      const flashes = new Pool<Flash>(24, makeFlash);
      let autoTimer = 0;
      let seeded = false;

      const fire = (cx: number, cy: number, prewarm = 0) => {
        const base = 30 + power * 18;

        // Sharp radiating ice crystal shards.
        for (let i = 0; i < shardCount; i++) {
          shards.spawn((s) => {
            const a = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
            const v = (180 + Math.random() * 160) * power;
            const t = i / shardCount;
            s.angle = a;
            s.vx = Math.cos(a) * v;
            s.vy = Math.sin(a) * v;
            s.x = cx + s.vx * prewarm;
            s.y = cy + s.vy * prewarm;
            s.len = base + Math.random() * base * 0.8;
            s.width = 3 + Math.random() * 3.5;
            s.life = 1 - prewarm / 0.6;
            s.maxLife = 0.55 + Math.random() * 0.45;
            s.hue = paletteHue(mode, hue, hue2, t) + (Math.random() - 0.5) * 20;
          });
        }

        // Glittering frost particles drifting outward.
        const pCount = shardCount * 9;
        for (let i = 0; i < pCount; i++) {
          particles.spawn((p) => {
            const a = Math.random() * Math.PI * 2;
            const v = (40 + Math.random() * 320) * power;
            const t = i / pCount;
            p.vx = Math.cos(a) * v;
            p.vy = Math.sin(a) * v;
            p.x = cx + p.vx * prewarm;
            p.y = cy + p.vy * prewarm;
            p.size = 0.8 + Math.random() * 2.2;
            p.spin = Math.random() * Math.PI;
            p.drift = false;
            p.life = 1 - prewarm / 1.1;
            p.maxLife = 0.7 + Math.random() * 0.9;
            p.hue = paletteHue(mode, hue, hue2, t) + (Math.random() - 0.5) * 26;
          });
        }

        // Expanding frost rings (two).
        for (let k = 0; k < 2; k++) {
          rings.spawn((r) => {
            r.x = cx;
            r.y = cy;
            r.speed = (300 + k * 120 + Math.random() * 80) * ringSpeed * power;
            r.radius = 4 + r.speed * prewarm;
            r.life = 1 - prewarm / 0.7;
            r.maxLife = 0.7 + Math.random() * 0.25;
            r.hue = paletteHue(mode, hue, hue2, k * 0.5);
          });
        }

        // Brief cold central flash.
        flashes.spawn((f) => {
          f.x = cx;
          f.y = cy;
          f.size = base * 2.2 * power;
          f.life = 1 - prewarm / 0.35;
          f.maxLife = 0.3;
          f.hue = paletteHue(mode, hue, hue2, 0.5);
        });
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") fire(x, y);
        },
        draw: (c, dt) => {
          if (!seeded) {
            fire(width * 0.5, height * 0.5, 0.32);
            seeded = true;
          }
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = 2.6 + Math.random() * 1.4;
            fire(width * 0.5, height * 0.5);
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          // Central flash.
          flashes.update((f) => {
            f.life -= dt / f.maxLife;
            return f.life > 0;
          });
          flashes.forEach((f) => {
            const a = Math.max(0, f.life);
            const r = f.size * (1.1 - a * 0.5);
            const grad = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
            grad.addColorStop(0, `hsla(${f.hue}, 90%, 92%, ${a * 0.9})`);
            grad.addColorStop(0.4, `hsla(${f.hue}, 95%, 75%, ${a * 0.4})`);
            grad.addColorStop(1, `hsla(${f.hue}, 95%, 70%, 0)`);
            c.globalAlpha = 1;
            c.fillStyle = grad;
            c.beginPath();
            c.arc(f.x, f.y, r, 0, Math.PI * 2);
            c.fill();
          });

          // Expanding rings.
          rings.update((r) => {
            r.radius += r.speed * dt;
            r.speed *= 0.96;
            r.life -= dt / r.maxLife;
            return r.life > 0;
          });
          rings.forEach((r) => {
            const a = Math.max(0, r.life);
            c.globalAlpha = a * a * 0.7;
            c.strokeStyle = `hsl(${r.hue}, 90%, ${72 + a * 18}%)`;
            c.lineWidth = 1 + a * 3;
            c.beginPath();
            c.arc(r.x, r.y, Math.max(0, r.radius), 0, Math.PI * 2);
            c.stroke();
            // faint inner halo
            c.globalAlpha = a * a * 0.3;
            c.lineWidth = 1;
            c.beginPath();
            c.arc(r.x, r.y, Math.max(0, r.radius - 6), 0, Math.PI * 2);
            c.stroke();
          });

          // Ice crystal shards as elongated tapered spikes.
          shards.update((s) => {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vx *= 0.9;
            s.vy *= 0.9;
            s.life -= dt / s.maxLife;
            return s.life > 0;
          });
          shards.forEach((s) => {
            const a = Math.max(0, s.life);
            const len = s.len * (0.5 + a * 0.5);
            const dx = Math.cos(s.angle);
            const dy = Math.sin(s.angle);
            const nx = -dy;
            const ny = dx;
            const w = s.width * a;
            // base sits toward the center, tip points outward
            const bx = s.x;
            const by = s.y;
            const tx = s.x + dx * len;
            const ty = s.y + dy * len;
            const grad = c.createLinearGradient(bx, by, tx, ty);
            grad.addColorStop(0, `hsla(${s.hue}, 95%, 80%, ${a * 0.95})`);
            grad.addColorStop(1, `hsla(${s.hue + 25}, 95%, 70%, 0)`);
            c.globalAlpha = 1;
            c.fillStyle = grad;
            c.beginPath();
            c.moveTo(bx + nx * w, by + ny * w);
            c.lineTo(tx, ty);
            c.lineTo(bx - nx * w, by - ny * w);
            c.closePath();
            c.fill();
          });

          // Glittering frost particles; settle then drift down.
          particles.update((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (!p.drift) {
              p.vx *= 0.92;
              p.vy *= 0.92;
              if (Math.abs(p.vx) + Math.abs(p.vy) < 24) p.drift = true;
            } else {
              p.vy += 18 * dt;
              p.vx += Math.sin(p.x * 0.05 + p.spin) * 4 * dt;
              p.vx *= 0.99;
              p.vy = Math.min(p.vy, 60);
            }
            p.spin += dt * 2;
            p.life -= dt / p.maxLife;
            return p.life > 0;
          });
          particles.forEach((p) => {
            const a = Math.max(0, p.life);
            const tw = 0.55 + 0.45 * Math.sin(p.spin * 3);
            c.globalAlpha = a * tw;
            c.fillStyle = `hsl(${p.hue}, 95%, 82%)`;
            c.beginPath();
            c.arc(p.x, p.y, p.size * (0.4 + a * 0.7), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [shardCount, power, ringSpeed, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
