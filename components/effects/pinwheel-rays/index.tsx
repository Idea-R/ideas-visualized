"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Burst {
  cx: number;
  cy: number;
  len: number;
  maxLen: number;
  alpha: number;
  phase: number;
}

function makeBurst(): Burst {
  return { cx: 0, cy: 0, len: 0, maxLen: 1, alpha: 0, phase: 0 };
}

export function PinwheelRays({ params }: { params: EffectProps }) {
  const rays = Math.max(1, Math.round(Number(params.rays)));
  const speed = Number(params.speed);
  const wobble = Number(params.wobble);
  const { mode, hue, hue2 } = readPalette(params);
  const spin = Number(params.spin ?? 0.35);
  const spinDir = String(params.spinDir ?? "cw") === "ccw" ? -1 : 1;

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const bursts = new Pool<Burst>(10, makeBurst);
      const maxLen = Math.hypot(width, height) * 0.55;
      const wobbleAmp = wobble * 70;
      let rotation = 0;
      let autoTimer = 0.3;

      const colorA = `hsl(${Math.round(paletteHue(mode, hue, hue2, 0))}, 100%, 62%)`;
      const colorB = `hsl(${Math.round(paletteHue(mode, hue, hue2, 1))}, 100%, 66%)`;

      const burst = (x: number, y: number) => {
        bursts.spawn((b) => {
          b.cx = x;
          b.cy = y;
          b.len = 0;
          b.maxLen = maxLen;
          b.alpha = 0.95;
          b.phase = Math.random() * Math.PI * 2;
        });
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") burst(x, y);
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = 1.4 + Math.random() * 0.8;
            burst(width / 2, height / 2);
          }

          rotation += dt * spin * spinDir;

          bursts.update((b) => {
            b.len += speed * dt;
            b.alpha = Math.max(0, b.alpha - dt * (0.6 + b.len / b.maxLen));
            return b.alpha > 0.001;
          });

          c.globalCompositeOperation = "lighter";
          const step = (Math.PI * 2) / rays;

          bursts.forEach((b) => {
            c.globalAlpha = b.alpha * 0.5;
            const len = Math.min(b.len, b.maxLen);
            for (let i = 0; i < rays; i++) {
              const theta = i * step + rotation;
              const ux = Math.cos(theta);
              const uy = Math.sin(theta);
              const nx = -uy;
              const ny = ux;
              const wob =
                Math.sin(t * 2.4 + i * 0.3 + b.phase) * wobbleAmp;
              const ex = b.cx + ux * len + nx * wob;
              const ey = b.cy + uy * len + ny * wob;
              c.strokeStyle =
                mode === "rainbow"
                  ? `hsl(${Math.round(paletteHue("rainbow", hue, hue2, i / rays))}, 100%, 64%)`
                  : i % 2 === 0
                    ? colorA
                    : colorB;
              c.lineWidth = 1.4;
              c.beginPath();
              c.moveTo(b.cx, b.cy);
              c.lineTo(ex, ey);
              c.stroke();
            }
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [rays, speed, wobble, mode, hue, hue2, spin, spinDir]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
