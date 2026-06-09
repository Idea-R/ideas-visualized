"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  energy: number;
  hue: number;
  trail: { x: number; y: number }[];
}

interface Expansion {
  x: number;
  y: number;
  radius: number;
  active: boolean;
}

const TRAIL_LEN = 8;

export function LiquidWeb({ params }: { params: EffectProps }) {
  const count = Math.max(8, Math.round(Number(params.count ?? 60)));
  const linkDist = Number(params.linkDist ?? 110);
  const speed = Number(params.speed ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const linkDist2 = linkDist * linkDist;
      const cap = count + 24;
      const blobs: Blob[] = [];

      const makeBlob = (x: number, y: number, i: number): Blob => {
        const baseSize = 1.5 + Math.random() * 3;
        return {
          x,
          y,
          vx: (Math.random() - 0.5) * 0.5 * speed,
          vy: (Math.random() - 0.5) * 0.5 * speed,
          size: baseSize,
          baseSize,
          energy: 0,
          hue: paletteHue(mode, hue, hue2, count > 1 ? i / count : 0),
          trail: [],
        };
      };

      for (let i = 0; i < count; i++) {
        blobs.push(makeBlob(Math.random() * width, Math.random() * height, i));
      }

      const mouse = { x: -9999, y: -9999 };
      const expansions: Expansion[] = [];

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            mouse.x = -9999;
            mouse.y = -9999;
            return;
          }
          mouse.x = x;
          mouse.y = y;
          if (type === "down") {
            expansions.push({ x, y, radius: 0, active: true });
            if (blobs.length < cap) {
              const b = makeBlob(x, y, blobs.length);
              b.energy = 1;
              b.vx = (Math.random() - 0.5) * 2;
              b.vy = (Math.random() - 0.5) * 2;
              blobs.push(b);
            }
            for (const b of blobs) {
              const dx = b.x - x;
              const dy = b.y - y;
              if (dx * dx + dy * dy < 200 * 200) b.energy = Math.min(1, b.energy + 0.6);
            }
          }
        },
        draw: (c, dt) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          const step = Math.min(2, dt * 60);
          const maxR = Math.hypot(width, height);

          c.globalCompositeOperation = "lighter";

          // Expanding click rings.
          for (const e of expansions) {
            e.radius += 4 * step;
            const fade = 1 - e.radius / maxR;
            if (fade <= 0) {
              e.active = false;
              continue;
            }
            c.globalAlpha = 0.35 * fade;
            c.strokeStyle = `hsl(${hue}, 90%, 65%)`;
            c.lineWidth = 2;
            c.beginPath();
            c.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            c.stroke();
          }
          for (let i = expansions.length - 1; i >= 0; i--) {
            if (!expansions[i].active) expansions.splice(i, 1);
          }

          // Update blobs (mouse repel/attract, drift, trails).
          for (const b of blobs) {
            const dx = mouse.x - b.x;
            const dy = mouse.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 150 && dist > 0) {
              const force = (150 - dist) / 150;
              if (dist < 80) {
                b.vx -= (dx / dist) * force * 0.3 * step;
                b.vy -= (dy / dist) * force * 0.3 * step;
                b.energy = Math.min(1, b.energy + 0.08);
              } else {
                b.vx += (dx / dist) * force * 0.08 * step;
                b.vy += (dy / dist) * force * 0.08 * step;
              }
            }

            b.energy *= 0.95;
            b.size = b.baseSize * (1 + b.energy * 0.8);

            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > TRAIL_LEN) b.trail.shift();

            b.x += b.vx * step;
            b.y += b.vy * step;
            b.vx *= 0.98;
            b.vy *= 0.98;

            if (b.x < 0) b.x = width;
            if (b.x > width) b.x = 0;
            if (b.y < 0) b.y = height;
            if (b.y > height) b.y = 0;
          }

          // Connection lines between nearby blobs.
          c.lineWidth = 1;
          for (let i = 0; i < blobs.length; i++) {
            const a = blobs[i];
            for (let j = i + 1; j < blobs.length; j++) {
              const b = blobs[j];
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 >= linkDist2) continue;
              const strength = 1 - Math.sqrt(d2) / linkDist;
              c.globalAlpha = strength * 0.4;
              c.strokeStyle = `hsl(${a.hue}, 85%, 62%)`;
              c.beginPath();
              c.moveTo(a.x, a.y);
              c.lineTo(b.x, b.y);
              c.stroke();
            }
          }

          // Trails + blob bodies.
          for (const b of blobs) {
            if (b.trail.length > 1) {
              c.globalAlpha = 0.18;
              c.strokeStyle = `hsl(${b.hue}, 85%, 60%)`;
              c.lineWidth = 1;
              c.beginPath();
              for (let i = 0; i < b.trail.length; i++) {
                const p = b.trail[i];
                if (i === 0) c.moveTo(p.x, p.y);
                else c.lineTo(p.x, p.y);
              }
              c.stroke();
            }

            c.globalAlpha = 0.85;
            c.fillStyle = `hsl(${b.hue}, 95%, ${60 + b.energy * 20}%)`;
            c.beginPath();
            c.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            c.fill();

            if (b.energy > 0.15) {
              const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 4);
              g.addColorStop(0, `hsla(${b.hue}, 95%, 70%, ${b.energy * 0.4})`);
              g.addColorStop(1, `hsla(${b.hue}, 95%, 70%, 0)`);
              c.globalAlpha = 1;
              c.fillStyle = g;
              c.beginPath();
              c.arc(b.x, b.y, b.size * 4, 0, Math.PI * 2);
              c.fill();
            }
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [count, linkDist, speed, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
