"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";
import { Pool } from "@/lib/effects/pool";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
  hue: number;
}

export function TouchRipple({ params }: { params: EffectProps }) {
  const ambientRate = Number(params.ambientRate ?? 0.6);
  const sizeScale = Number(params.size ?? 1);
  const expandSpeed = Number(params.expandSpeed ?? 1);
  const thickness = Number(params.thickness ?? 2);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const pool = new Pool<Ripple>(96, () => ({
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 0,
        alpha: 0,
        speed: 0,
        hue: 0,
      }));

      const base = Math.min(width, height);
      let ambientAcc = 0;

      const spawn = (x: number, y: number) => {
        pool.spawn((r) => {
          r.x = x;
          r.y = y;
          r.radius = 0;
          r.maxRadius = (base * 0.25 + Math.random() * base * 0.2) * sizeScale;
          r.alpha = 0.6;
          r.speed = (Math.random() * 1.2 + 1.8) * expandSpeed;
          r.hue = paletteHue(mode, hue, hue2, Math.random());
        });
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") spawn(x, y);
        },
        draw: (c, dt) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          const step = Math.min(2.5, dt * 60);

          if (ambientRate > 0) {
            ambientAcc += dt * ambientRate;
            while (ambientAcc >= 1) {
              ambientAcc -= 1;
              spawn(Math.random() * width, Math.random() * height);
            }
            if (ambientAcc > 4) ambientAcc = 0;
          }

          c.globalCompositeOperation = "lighter";

          pool.update((r) => {
            r.radius += r.speed * step;
            r.alpha -= 0.008 * step;
            if (r.alpha <= 0 || r.radius >= r.maxRadius) return false;

            const inner = Math.max(0, r.radius - thickness * 4);
            const g = c.createRadialGradient(r.x, r.y, inner, r.x, r.y, r.radius);
            g.addColorStop(0, `hsla(${r.hue}, 80%, 50%, 0)`);
            g.addColorStop(0.7, `hsla(${r.hue}, 85%, 55%, ${r.alpha * 0.5})`);
            g.addColorStop(1, `hsla(${r.hue}, 90%, 65%, ${r.alpha})`);

            c.strokeStyle = g;
            c.lineWidth = thickness;
            c.beginPath();
            c.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            c.stroke();
            return true;
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [ambientRate, sizeScale, expandSpeed, thickness, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
