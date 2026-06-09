"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Drop {
  x: number;
  baseY: number;
  y: number;
  vx: number;
  baseR: number;
  offset: number;
  opacity: number;
  t: number;
}

export function OceanWave({ params }: { params: EffectProps }) {
  const amplitude = Number(params.amplitude ?? 40);
  const speed = Number(params.speed ?? 1);
  const density = Number(params.density ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const count = Math.min(420, Math.max(20, Math.round((width / 6) * density)));
      const drops: Drop[] = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const jitter = (Math.random() - 0.5) * 25;
        drops.push({
          x,
          baseY: height * (2 / 3) + jitter + 20,
          y: height * (2 / 3),
          vx: (Math.random() - 0.5) * 0.3 * 60,
          baseR: 1.2 + Math.random() * 1.5,
          offset: Math.random() * Math.PI * 2,
          opacity: 0.48 + Math.random() * 0.32,
          t: count > 1 ? i / count : 0,
        });
      }

      let phase = 0;

      return {
        clearMode: "full",
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          phase -= dt * speed * 1.2;
          // Internal sine "bass" replaces the original audio amplitude.
          const bass = Math.max(
            0,
            0.25 + 0.22 * Math.sin(t * 1.1) + 0.12 * Math.sin(t * 0.37 + 1.3)
          );
          const amp = amplitude * (0.5 + bass);

          c.globalCompositeOperation = "lighter";
          for (const d of drops) {
            const waveY =
              Math.sin(d.x * 0.012 + phase + d.offset) * amp +
              Math.sin(d.x * 0.005 - phase * 0.6) * amp * 0.35;
            const targetY = d.baseY + waveY;
            d.y += (targetY - d.y) * 0.1;
            d.x += d.vx * dt;
            if (d.x < -5) d.x = width + 5;
            else if (d.x > width + 5) d.x = -5;

            const r = d.baseR + bass * 2.5;
            const col = paletteHue(mode, hue, hue2, d.t);
            c.globalAlpha = d.opacity;
            c.fillStyle = `hsl(${col}, 100%, 62%)`;
            c.beginPath();
            c.arc(d.x, d.y, r, 0, Math.PI * 2);
            c.fill();
            c.globalAlpha = d.opacity * 0.5;
            c.fillStyle = `hsl(${col}, 100%, 80%)`;
            c.beginPath();
            c.arc(d.x, d.y, r * 0.5, 0, Math.PI * 2);
            c.fill();
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [amplitude, speed, density, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
