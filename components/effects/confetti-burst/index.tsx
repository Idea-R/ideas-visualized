"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import type { EffectProps } from "@/lib/effects/types";

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  size: number;
  life: number;
  maxLife: number;
  shape: number; // 0 rect, 1 triangle, 2 ellipse
  hue: number;
  drift: number; // phase for wind wobble
}

function makePiece(): Piece {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    spin: 0,
    size: 8,
    life: 0,
    maxLife: 1,
    shape: 0,
    hue: 0,
    drift: 0,
  };
}

interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeRing(): Ring {
  return { x: 0, y: 0, r: 0, life: 0, maxLife: 1, hue: 0 };
}

export function ConfettiBurst({ params }: { params: EffectProps }) {
  const count = Math.round(Number(params.count));
  const gravity = Number(params.gravity);
  const spread = Number(params.spread);
  const ring = Boolean(params.ring);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const pieces = new Pool<Piece>(2400, makePiece);
      const rings = new Pool<Ring>(24, makeRing);
      let autoTimer = 0.4;

      const burst = (x: number, y: number) => {
        const hueBase = Math.random() * 360;
        for (let i = 0; i < count; i++) {
          pieces.spawn((p) => {
            const a = Math.random() * Math.PI * 2;
            const speed = (60 + Math.random() * 260) * (0.5 + spread / 12);
            p.x = x;
            p.y = y;
            p.vx = Math.cos(a) * speed;
            p.vy = Math.sin(a) * speed - 60; // slight upward pop
            p.rot = Math.random() * Math.PI * 2;
            p.spin = (Math.random() - 0.5) * 14;
            p.size = 6 + Math.random() * 12;
            p.life = 1;
            p.maxLife = 1.1 + Math.random() * 1.1;
            p.shape = Math.floor(Math.random() * 3);
            p.hue = (hueBase + Math.random() * 80) % 360;
            p.drift = Math.random() * Math.PI * 2;
          });
        }
        if (ring) {
          rings.spawn((r) => {
            r.x = x;
            r.y = y;
            r.r = 0;
            r.life = 1;
            r.maxLife = 0.5;
            r.hue = hueBase;
          });
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") burst(x, y);
        },
        draw: (c, dt, t) => {
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = 1.4 + Math.random() * 1.6;
            burst(
              width * (0.2 + Math.random() * 0.6),
              height * (0.25 + Math.random() * 0.4)
            );
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Expanding shockwave rings.
          c.globalCompositeOperation = "lighter";
          rings.update((r) => {
            r.life -= dt / r.maxLife;
            r.r += 520 * dt;
            return r.life > 0;
          });
          rings.forEach((r) => {
            const a = Math.max(0, r.life);
            c.strokeStyle = `hsla(${r.hue}, 90%, 65%, ${a * 0.6})`;
            c.lineWidth = 2 + a * 3;
            c.beginPath();
            c.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            c.stroke();
          });

          pieces.update((p) => {
            p.vy += gravity * 380 * dt;
            // Wind drift wobble.
            p.vx += Math.sin(t * 1.6 + p.drift) * 26 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.99;
            p.rot += p.spin * dt;
            p.life -= dt / p.maxLife;
            return p.life > 0 && p.y < height + 40;
          });

          pieces.forEach((p) => {
            const a = Math.max(0, p.life);
            c.save();
            c.translate(p.x, p.y);
            c.rotate(p.rot);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${p.hue}, 90%, 60%)`;
            const s = p.size;
            if (p.shape === 0) {
              c.fillRect(-s * 0.5, -s * 0.2, s, s * 0.4);
            } else if (p.shape === 1) {
              c.beginPath();
              c.moveTo(0, -s * 0.5);
              c.lineTo(s * 0.5, s * 0.4);
              c.lineTo(-s * 0.5, s * 0.4);
              c.closePath();
              c.fill();
            } else {
              c.beginPath();
              c.ellipse(0, 0, s * 0.5, s * 0.22, 0, 0, Math.PI * 2);
              c.fill();
            }
            c.restore();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [count, gravity, spread, ring]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
