"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeDot(): Dot {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, hue: 0 };
}

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
  c.strokeStyle = `hsl(${hue}, 95%, 65%)`;
  c.fillStyle = `hsla(${hue}, 95%, 60%, 0.25)`;
  c.lineWidth = 2;
  const s = scale / 2;
  const persp = scale * 0.25;

  if (shape === 0) {
    // Square with a hint of depth.
    c.strokeRect(-s, -s, scale, scale);
    c.beginPath();
    c.moveTo(-s, -s);
    c.lineTo(-s - persp, -s - persp);
    c.lineTo(s - persp, -s - persp);
    c.lineTo(s, -s);
    c.stroke();
  } else if (shape === 1) {
    // Circle plus an inner perspective ellipse.
    c.beginPath();
    c.arc(0, 0, s, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.ellipse(-persp * 0.4, -persp * 0.4, s * 0.72, s * 0.48, 0, 0, Math.PI * 2);
    c.stroke();
  } else if (shape === 2) {
    // Triangle with a depth edge.
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
    // Cube wireframe (front + top + right faces).
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

export function NovaBurst({ params }: { params: EffectProps }) {
  const density = Math.round(Number(params.density));
  const shardCount = Math.round(Number(params.shards));
  const { mode, hue, hue2 } = readPalette(params);
  const auto = Boolean(params.auto);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const dots = new Pool<Dot>(2400, makeDot);
      const shards = new Pool<Shard>(400, makeShard);
      let autoTimer = 0.3;

      const detonate = (cx: number, cy: number) => {
        for (let i = 0; i < density; i++) {
          dots.spawn((d) => {
            const a = Math.random() * Math.PI * 2;
            const speed = 120 + Math.random() * 240;
            d.x = cx;
            d.y = cy;
            d.vx = Math.cos(a) * speed;
            d.vy = Math.sin(a) * speed;
            d.life = 1;
            d.maxLife = 2.4 + Math.random() * 0.8;
            d.hue = paletteHue(mode, hue, hue2, a / (Math.PI * 2)) + (Math.random() - 0.5) * 30;
          });
        }
        for (let i = 0; i < shardCount; i++) {
          shards.spawn((sh) => {
            const a = Math.random() * Math.PI * 2;
            const speed = 90 + Math.random() * 180;
            sh.x = cx;
            sh.y = cy;
            sh.vx = Math.cos(a) * speed;
            sh.vy = Math.sin(a) * speed;
            sh.rot = Math.random() * Math.PI * 2;
            sh.spin = (Math.random() - 0.5) * 6;
            sh.scale = 8 + Math.random() * 14;
            sh.life = 1;
            sh.maxLife = 2.6 + Math.random() * 0.8;
            sh.shape = Math.floor(Math.random() * 4);
            sh.hue = paletteHue(mode, hue, hue2, a / (Math.PI * 2)) + (Math.random() - 0.5) * 40;
          });
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") detonate(x, y);
        },
        draw: (c, dt) => {
          if (auto) {
            autoTimer -= dt;
            if (autoTimer <= 0) {
              autoTimer = 1.8 + Math.random() * 1.4;
              detonate(width * 0.5, height * 0.5);
            }
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          dots.update((d) => {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vy += 40 * dt;
            d.vx *= 0.985;
            d.vy *= 0.985;
            d.life -= dt / d.maxLife;
            return d.life > 0;
          });
          dots.forEach((d) => {
            const a = Math.max(0, d.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${d.hue}, 95%, 65%)`;
            c.beginPath();
            c.arc(d.x, d.y, 1.5 + a * 1.2, 0, Math.PI * 2);
            c.fill();
          });

          shards.update((sh) => {
            sh.x += sh.vx * dt;
            sh.y += sh.vy * dt;
            sh.vy += 40 * dt;
            sh.vx *= 0.99;
            sh.rot += sh.spin * dt;
            sh.life -= dt / sh.maxLife;
            return sh.life > 0;
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
    [density, shardCount, mode, hue, hue2, auto]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
