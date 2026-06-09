"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  tw: number;
  off: number;
  depth: number;
  t: number;
}

export function InfiniteStarfield({ params }: { params: EffectProps }) {
  const density = Number(params.density ?? 1);
  const twinkle = Number(params.twinkle ?? 1);
  const gridOn = Boolean(params.grid);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const count = Math.max(20, Math.round(120 * density));
      const stars: Star[] = [];
      for (let i = 0; i < count; i++) {
        const depth = Math.random();
        stars.push({
          x: Math.random(),
          y: Math.random(),
          size: depth * 1.8 + 0.6,
          opacity: Math.random() * 0.6 + 0.3,
          tw: Math.random() * 1.4 + 0.3,
          off: Math.random() * Math.PI * 2,
          depth,
          t: count > 1 ? i / count : 0,
        });
      }

      const cx = width / 2;
      const cy = height / 2;
      // Mouse-driven parallax target/eased offset (replaces scroll parallax).
      const target = { x: 0, y: 0 };
      const parallax = { x: 0, y: 0 };

      const drawGrid = (c: CanvasRenderingContext2D) => {
        const spacing = 46;
        const gh = paletteHue(mode, hue, hue2, 0.5);
        c.lineWidth = 1;
        const ox = parallax.x * 0.6;
        const oy = parallax.y * 0.6;
        for (let gx = ((ox % spacing) + spacing) % spacing; gx < width; gx += spacing) {
          const fade = 1 - Math.abs(gx - cx) / (width * 0.7);
          if (fade <= 0) continue;
          c.strokeStyle = `hsla(${gh}, 70%, 60%, ${0.05 * fade})`;
          c.beginPath();
          c.moveTo(gx, 0);
          c.lineTo(gx, height);
          c.stroke();
        }
        for (let gy = ((oy % spacing) + spacing) % spacing; gy < height; gy += spacing) {
          const fade = 1 - Math.abs(gy - cy) / (height * 0.7);
          if (fade <= 0) continue;
          c.strokeStyle = `hsla(${gh}, 70%, 60%, ${0.05 * fade})`;
          c.beginPath();
          c.moveTo(0, gy);
          c.lineTo(width, gy);
          c.stroke();
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            target.x = 0;
            target.y = 0;
            return;
          }
          target.x = (x - cx) * 0.05;
          target.y = (y - cy) * 0.05;
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          const ease = Math.min(1, dt * 4);
          parallax.x += (target.x - parallax.x) * ease;
          parallax.y += (target.y - parallax.y) * ease;

          if (gridOn) drawGrid(c);

          c.globalCompositeOperation = "lighter";
          for (const s of stars) {
            const tw = Math.sin(t * s.tw * twinkle + s.off);
            const op = s.opacity * (0.6 + 0.4 * tw);
            const shift = 0.3 + s.depth * 1.4;
            const px = s.x * width + parallax.x * shift;
            const py = s.y * height + parallax.y * shift;
            c.globalAlpha = Math.max(0, op);
            c.fillStyle = `hsl(${paletteHue(mode, hue, hue2, s.t)}, 70%, 90%)`;
            c.beginPath();
            c.arc(px, py, s.size, 0, Math.PI * 2);
            c.fill();
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [density, twinkle, gridOn, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
