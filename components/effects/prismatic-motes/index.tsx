"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface TrailPoint {
  x: number;
  y: number;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  speed: number;
  hue: number;
  // Explicit stored position history — ring buffer of last N points.
  trail: TrailPoint[];
}

export function PrismaticMotes({ params }: { params: EffectProps }) {
  const moteCount = Math.max(1, Math.round(Number(params.moteCount ?? 30)));
  const speed = Number(params.speed ?? 1);
  const trailLength = Math.max(2, Math.round(Number(params.trailLength ?? 12)));
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const motes: Mote[] = [];
      for (let i = 0; i < moteCount; i++) {
        const factor = moteCount > 1 ? i / moteCount : 0;
        motes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.3,
          radius: 2 + Math.random() * 3,
          phase: Math.random() * Math.PI * 2,
          speed: 0.005 + Math.random() * 0.01,
          hue: paletteHue(mode, hue, hue2, factor) + (Math.random() * 20 - 10),
          trail: [],
        });
      }

      return {
        clearMode: "full",
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";
          for (const m of motes) {
            m.phase += m.speed * speed;
            m.x += (m.vx + Math.sin(m.phase) * 0.3) * speed;
            m.y += (m.vy + Math.cos(m.phase * 0.7) * 0.2) * speed;

            if (m.x < -20) m.x = width + 20;
            if (m.x > width + 20) m.x = -20;
            if (m.y < -20) m.y = height + 20;
            if (m.y > height + 20) m.y = -20;

            // Push current position into the history ring buffer.
            m.trail.push({ x: m.x, y: m.y });
            while (m.trail.length > trailLength) m.trail.shift();

            // Draw the stored polyline as a fading set of dots (oldest faintest).
            const n = m.trail.length;
            for (let i = 0; i < n; i++) {
              const tp = m.trail[i];
              const frac = (i + 1) / n;
              c.globalAlpha = frac * frac * 0.45;
              c.fillStyle = `hsl(${m.hue}, 90%, 70%)`;
              c.beginPath();
              c.arc(tp.x, tp.y, m.radius * frac * 0.8, 0, Math.PI * 2);
              c.fill();
            }

            const pulse = 0.7 + 0.3 * Math.sin(t * 1.2 + m.phase);

            c.globalAlpha = 0.12;
            c.fillStyle = `hsl(${m.hue}, 90%, 65%)`;
            c.beginPath();
            c.arc(m.x, m.y, m.radius * 2.5, 0, Math.PI * 2);
            c.fill();

            c.globalAlpha = 0.85;
            c.fillStyle = `hsl(${m.hue}, 95%, 78%)`;
            c.beginPath();
            c.arc(m.x, m.y, m.radius * pulse, 0, Math.PI * 2);
            c.fill();
          }

          c.globalCompositeOperation = "source-over";
          c.globalAlpha = 1;
        },
      };
    },
    [moteCount, speed, trailLength, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
