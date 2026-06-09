"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Caustic {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  speed: number;
  opacity: number;
  t: number;
}

export function CausticLight({ params }: { params: EffectProps }) {
  const poolCount = Math.max(1, Math.round(Number(params.poolCount ?? 18)));
  const driftSpeed = Number(params.driftSpeed ?? 1);
  const softness = Number(params.softness ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const caustics: Caustic[] = [];
      for (let i = 0; i < poolCount; i++) {
        caustics.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.3,
          radius: (40 + Math.random() * 120) * softness,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.5,
          opacity: 0.06 + Math.random() * 0.1,
          t: poolCount > 1 ? i / poolCount : 0,
        });
      }

      return {
        clearMode: "full",
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          const time = t * driftSpeed;

          c.globalCompositeOperation = "lighter";
          for (const p of caustics) {
            p.x += (p.vx + Math.sin(time * p.speed + p.phase) * 0.3) * driftSpeed;
            p.y +=
              (p.vy + Math.cos(time * p.speed * 0.7 + p.phase) * 0.2) * driftSpeed;

            if (p.x < -p.radius) p.x = width + p.radius;
            if (p.x > width + p.radius) p.x = -p.radius;
            if (p.y < -p.radius) p.y = height + p.radius;
            if (p.y > height + p.radius) p.y = -p.radius;

            const pulse = Math.sin(time * p.speed + p.phase) * 0.5 + 0.5;
            const r = p.radius * (0.8 + pulse * 0.4);
            const h = paletteHue(mode, hue, hue2, p.t);
            const core = p.opacity * (0.5 + pulse * 0.5);

            const grad = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            grad.addColorStop(0, `hsla(${h}, 70%, 92%, ${core})`);
            grad.addColorStop(0.5, `hsla(${h}, 90%, 62%, ${p.opacity * 0.5})`);
            grad.addColorStop(1, "hsla(0, 0%, 0%, 0)");

            c.fillStyle = grad;
            c.beginPath();
            c.arc(p.x, p.y, r, 0, Math.PI * 2);
            c.fill();
          }

          c.globalCompositeOperation = "source-over";
          c.globalAlpha = 1;
        },
      };
    },
    [poolCount, driftSpeed, softness, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
