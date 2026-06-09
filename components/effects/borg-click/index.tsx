"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Pattern {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxR: number;
  rot: number;
  spinDir: number;
  hueJitter: number;
  segments: number;
  rings: number;
}

function makePattern(): Pattern {
  return {
    x: 0,
    y: 0,
    life: 0,
    maxLife: 1,
    maxR: 0,
    rot: 0,
    spinDir: 1,
    hueJitter: 0,
    segments: 12,
    rings: 4,
  };
}

export function BorgClick({ params }: { params: EffectProps }) {
  const segments = Math.round(Number(params.segments));
  const rings = Math.round(Number(params.rings));
  const { mode, hue, hue2 } = readPalette(params);
  const spin = Number(params.spin);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const pool = new Pool<Pattern>(24, makePattern);
      let autoTimer = 0.5;

      const spawn = (x: number, y: number) => {
        pool.spawn((p) => {
          p.x = x;
          p.y = y;
          p.life = 1;
          p.maxLife = 1.1 + Math.random() * 0.5;
          p.maxR = 90 + Math.random() * 120;
          p.rot = Math.random() * Math.PI * 2;
          p.spinDir = Math.random() < 0.5 ? -1 : 1;
          p.hueJitter = (Math.random() - 0.5) * 24;
          p.segments = segments;
          p.rings = rings;
        });
      };

      const poly = (
        c: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        radius: number,
        sides: number,
        rot: number
      ) => {
        c.beginPath();
        for (let i = 0; i <= sides; i++) {
          const a = rot + (i / sides) * Math.PI * 2;
          const px = cx + Math.cos(a) * radius;
          const py = cy + Math.sin(a) * radius;
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.stroke();
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") spawn(x, y);
        },
        draw: (c, dt) => {
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = 1.2 + Math.random() * 1.6;
            spawn(
              width * (0.25 + Math.random() * 0.5),
              height * (0.25 + Math.random() * 0.5)
            );
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          pool.update((p) => {
            p.life -= dt / p.maxLife;
            p.rot += p.spinDir * spin * dt;
            return p.life > 0;
          });

          c.globalCompositeOperation = "lighter";
          c.lineCap = "round";
          c.lineJoin = "round";

          pool.forEach((p) => {
            const a = Math.max(0, p.life);
            // Ease-out expansion: fast then settle.
            const prog = 1 - p.life;
            const grow = 1 - Math.pow(1 - prog, 3);
            const outer = p.maxR * grow;

            // Concentric polygon rings (t = ring index / ring count so Dual
            // blends inner→outer and Rainbow spreads hue across rings).
            for (let r = 1; r <= p.rings; r++) {
              const radius = outer * (r / p.rings);
              const ringT = (r - 1) / Math.max(1, p.rings - 1);
              const ringHue = paletteHue(mode, hue, hue2, ringT) + p.hueJitter;
              c.strokeStyle = `hsla(${ringHue}, 90%, 60%, ${a})`;
              c.lineWidth = 1 + (r === p.rings ? 1 : 0);
              c.globalAlpha = a * (0.4 + 0.6 * (r / p.rings));
              poly(c, p.x, p.y, radius, p.segments, p.rot + r * 0.12);
            }

            // Radiating segment lines from center to the outer ring vertices
            // (t = segment index / segments).
            c.globalAlpha = a * 0.7;
            c.lineWidth = 1;
            for (let i = 0; i < p.segments; i++) {
              const ang = p.rot + (i / p.segments) * Math.PI * 2;
              const segHue =
                paletteHue(mode, hue, hue2, i / p.segments) + p.hueJitter;
              c.strokeStyle = `hsla(${segHue}, 90%, 60%, ${a * 0.7})`;
              c.beginPath();
              c.moveTo(p.x, p.y);
              c.lineTo(p.x + Math.cos(ang) * outer, p.y + Math.sin(ang) * outer);
              c.stroke();
            }

            // Bright vertex nodes on the leading ring (t = vertex index / segments).
            c.globalAlpha = a;
            for (let i = 0; i < p.segments; i++) {
              const ang = p.rot + (i / p.segments) * Math.PI * 2;
              const px = p.x + Math.cos(ang) * outer;
              const py = p.y + Math.sin(ang) * outer;
              const nodeHue =
                paletteHue(mode, hue, hue2, i / p.segments) + p.hueJitter;
              c.fillStyle = `hsla(${nodeHue}, 100%, 72%, ${a})`;
              c.beginPath();
              c.arc(px, py, 1.8, 0, Math.PI * 2);
              c.fill();
            }

            // Core glyph (base hue).
            c.globalAlpha = a;
            c.lineWidth = 1.4;
            c.strokeStyle = `hsla(${paletteHue(mode, hue, hue2, 0) + p.hueJitter}, 90%, 60%, ${a})`;
            poly(c, p.x, p.y, 8 + grow * 6, p.segments, -p.rot * 1.5);
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [segments, rings, mode, hue, hue2, spin]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
