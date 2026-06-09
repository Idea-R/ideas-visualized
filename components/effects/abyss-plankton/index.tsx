"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Plankton {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  pulsePhase: number;
  pulseSpeed: number;
  swayPhase: number;
  t: number; // palette factor [0,1]
}

const BASE_AREA = 240_000;

export function AbyssPlankton({ params }: { params: EffectProps }) {
  const density = Number(params.density ?? 55);
  const pulseSpeed = Number(params.pulseSpeed ?? 1);
  const drift = Number(params.drift ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const area = width * height;
      const count = Math.max(16, Math.min(400, Math.round((density * area) / BASE_AREA)));

      const plankton: Plankton[] = [];
      for (let i = 0; i < count; i++) {
        plankton.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 12,
          vy: -(6 + Math.random() * 24),
          size: 1 + Math.random() * 3,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.5 + Math.random() * 1.5,
          swayPhase: Math.random() * Math.PI * 2,
          t: Math.random(),
        });
      }

      const mouse = { x: -9999, y: -9999 };

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
        },
        draw: (c, dt, t) => {
          // Deep-sea vertical gradient backdrop.
          const bg = c.createLinearGradient(0, 0, 0, height);
          bg.addColorStop(0, "#040912");
          bg.addColorStop(1, "#01040a");
          c.fillStyle = bg;
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          for (const p of plankton) {
            p.x += (p.vx + Math.sin(t * 0.5 + p.swayPhase) * 9) * drift * dt;
            p.y += p.vy * drift * dt;

            if (p.y < -20) {
              p.y = height + 20;
              p.x = Math.random() * width;
            }
            if (p.x < -20) p.x = width + 20;
            if (p.x > width + 20) p.x = -20;

            const pulse = Math.sin(t * p.pulseSpeed * pulseSpeed + p.pulsePhase) * 0.4 + 0.6;

            // Cursor proximity brightening.
            let near = 0;
            if (mouse.x > -9000) {
              const dist = Math.hypot(mouse.x - p.x, mouse.y - p.y);
              if (dist < 140) near = (1 - dist / 140) * 0.9;
            }

            const bright = Math.min(1, pulse + near);
            const r = p.size * (0.7 + bright * 0.6);
            const ph = paletteHue(mode, hue, hue2, p.t);

            const grad = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 8);
            grad.addColorStop(0, `hsla(${ph}, 95%, 65%, ${0.28 * bright})`);
            grad.addColorStop(1, "transparent");
            c.globalAlpha = 1;
            c.fillStyle = grad;
            c.beginPath();
            c.arc(p.x, p.y, r * 8, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = `hsla(${ph}, 90%, 85%, ${0.85 * bright})`;
            c.beginPath();
            c.arc(p.x, p.y, r, 0, Math.PI * 2);
            c.fill();
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [density, pulseSpeed, drift, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
