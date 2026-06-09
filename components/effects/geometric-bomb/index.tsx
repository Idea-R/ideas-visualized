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
  rot: number;
  spin: number;
  scale: number;
  life: number;
  maxLife: number;
  shape: number; // 0 square, 1 circle, 2 triangle, 3 cube
  hue: number;
}

function makeShard(): Shard {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    spin: 0,
    scale: 8,
    life: 0,
    maxLife: 1,
    shape: 0,
    hue: 0,
  };
}

// Pseudo-3D wireframe shard at the current transform origin.
function drawShard(
  c: CanvasRenderingContext2D,
  shape: number,
  scale: number,
  hue: number,
  alpha: number
) {
  c.globalAlpha = alpha;
  c.strokeStyle = `hsl(${hue}, 95%, 62%)`;
  c.fillStyle = `hsla(${hue}, 95%, 58%, 0.25)`;
  c.lineWidth = 2;
  const s = scale / 2;
  const persp = scale * 0.25;

  if (shape === 0) {
    c.strokeRect(-s, -s, scale, scale);
    c.beginPath();
    c.moveTo(-s, -s);
    c.lineTo(-s - persp, -s - persp);
    c.lineTo(s - persp, -s - persp);
    c.lineTo(s, -s);
    c.stroke();
  } else if (shape === 1) {
    c.beginPath();
    c.arc(0, 0, s, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.ellipse(-persp * 0.4, -persp * 0.4, s * 0.72, s * 0.48, 0, 0, Math.PI * 2);
    c.stroke();
  } else if (shape === 2) {
    c.beginPath();
    c.moveTo(0, -s);
    c.lineTo(-s, s);
    c.lineTo(s, s);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(0, -s);
    c.lineTo(-persp * 0.5, -s - persp * 0.6);
    c.lineTo(-s, s);
    c.stroke();
  } else {
    c.strokeRect(-s, -s, scale, scale);
    c.beginPath();
    c.moveTo(-s, -s);
    c.lineTo(-s - persp, -s - persp);
    c.lineTo(s - persp, -s - persp);
    c.lineTo(s, -s);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(s, -s);
    c.lineTo(s - persp, -s - persp);
    c.lineTo(s - persp, s - persp);
    c.lineTo(s, s);
    c.closePath();
    c.stroke();
    c.beginPath();
    c.moveTo(-s, s);
    c.lineTo(-s - persp, s - persp);
    c.moveTo(s, s);
    c.lineTo(s - persp, s - persp);
    c.stroke();
  }
}

export function GeometricBomb({ params }: { params: EffectProps }) {
  const count = Math.round(Number(params.count));
  const power = Number(params.power);
  const gravity = Number(params.gravity);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const shards = new Pool<Shard>(900, makeShard);
      let autoTimer = 0.6;

      const detonate = (cx: number, cy: number) => {
        for (let i = 0; i < count; i++) {
          shards.spawn((sh) => {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
            const speed = power * (0.5 + Math.random() * 0.7);
            sh.x = cx;
            sh.y = cy;
            sh.vx = Math.cos(a) * speed;
            sh.vy = Math.sin(a) * speed;
            sh.rot = Math.random() * Math.PI * 2;
            sh.spin = (Math.random() - 0.5) * 8;
            sh.scale = 8 + Math.random() * 14;
            sh.life = 1;
            sh.maxLife = 1.8 + Math.random() * 1.0;
            sh.shape = Math.floor(Math.random() * 4);
            sh.hue = paletteHue(mode, hue, hue2, i / count) + (Math.random() - 0.5) * 36;
          });
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") detonate(x, y);
        },
        draw: (c, dt) => {
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = 1.6 + Math.random() * 2.2;
            detonate(
              width * (0.2 + Math.random() * 0.6),
              height * (0.2 + Math.random() * 0.5)
            );
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          shards.update((sh) => {
            sh.vy += gravity * 220 * dt;
            sh.x += sh.vx * dt;
            sh.y += sh.vy * dt;
            sh.vx *= 0.99;
            sh.rot += sh.spin * dt;
            sh.life -= dt / sh.maxLife;
            return sh.life > 0 && sh.y < height + 60;
          });
          shards.forEach((sh) => {
            const a = Math.max(0, sh.life);
            c.save();
            c.translate(sh.x, sh.y);
            c.rotate(sh.rot);
            drawShard(c, sh.shape, sh.scale, sh.hue, a * a);
            c.restore();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [count, power, gravity, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
