"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  tilt: number;
  tiltSpeed: number;
  size: number;
  depth: number; // 0 = far, 1 = near — affects blur, speed, size
  swayPhase: number;
  swaySpeed: number;
  flutter: number;
  hue: number;
}

export function SakuraPetals({ params }: { params: EffectProps }) {
  const count = Math.max(1, Math.round(Number(params.petalCount ?? 30)));
  const fallSpeed = Number(params.fallSpeed ?? 1);
  const windAmount = Number(params.wind ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const makePetal = (startAbove: boolean): Petal => {
        const depth = Math.random();
        return {
          x: Math.random() * (width + 100) - 50,
          y: startAbove ? -20 - Math.random() * height * 0.3 : Math.random() * height,
          vx: 0.2 + depth * 0.4,
          vy: 0.4 + depth * 0.8,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.04,
          tilt: Math.random() * Math.PI,
          tiltSpeed: 0.01 + Math.random() * 0.02,
          size: (3 + Math.random() * 4) * (0.5 + depth * 0.7),
          depth,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.4 + Math.random() * 0.8,
          flutter: 0.3 + Math.random() * 0.7,
          hue: paletteHue(mode, hue, hue2, Math.random()) + (Math.random() * 16 - 8),
        };
      };

      const petals: Petal[] = Array.from({ length: count }, () => makePetal(false));

      let windStrength = 0;
      let windTarget = 0;
      let windTimer = 0;

      // Pointer-driven breeze.
      let breeze = 0;
      let lastPointerX = -9999;

      const drawPetal = (c: CanvasRenderingContext2D, p: Petal, t: number) => {
        const sway = Math.sin(t * p.swaySpeed + p.swayPhase) * p.flutter;
        const tiltScale = Math.abs(Math.sin(p.tilt));

        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rotation);

        if (p.depth < 0.3) {
          c.globalAlpha = 0.4 + p.depth;
        } else if (p.depth > 0.8) {
          c.globalAlpha = 0.7 + (p.depth - 0.8);
        } else {
          c.globalAlpha = 0.55 + p.depth * 0.3;
        }

        const s = p.size;
        const squish = 0.3 + tiltScale * 0.7;
        const fill = `hsl(${p.hue}, 80%, 78%)`;
        const highlight = `hsl(${p.hue}, 90%, 90%)`;

        if (s > 5) {
          for (let lobe = 0; lobe < 5; lobe++) {
            const angle = (lobe / 5) * Math.PI * 2 + sway * 0.2;
            c.beginPath();
            c.ellipse(
              Math.cos(angle) * s * 0.35,
              Math.sin(angle) * s * 0.35,
              s * 0.5,
              s * 0.3 * squish,
              angle,
              0,
              Math.PI * 2
            );
            c.fillStyle = fill;
            c.fill();
          }
          c.beginPath();
          c.arc(0, 0, s * 0.15, 0, Math.PI * 2);
          c.fillStyle = "hsl(45, 90%, 82%)";
          c.fill();
        } else {
          c.beginPath();
          c.ellipse(0, 0, s, s * 0.45 * squish, 0, 0, Math.PI * 2);
          c.fillStyle = fill;
          c.fill();

          c.beginPath();
          c.ellipse(-s * 0.2, -s * 0.1, s * 0.4, s * 0.18 * squish, 0.3, 0, Math.PI * 2);
          c.fillStyle = highlight;
          c.fill();
        }

        c.restore();
      };

      return {
        clearMode: "full",
        onPointer: (x, _y, type) => {
          if (type === "leave") {
            lastPointerX = -9999;
            return;
          }
          if (lastPointerX > -9999) {
            const dx = x - lastPointerX;
            // Pointer movement injects a directional gust.
            breeze += dx * 0.05;
          }
          lastPointerX = x;
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          windTimer -= dt;
          if (windTimer <= 0) {
            windTarget = (Math.random() < 0.3 ? 1 + Math.random() * 3 : 0) * windAmount;
            windTimer = 2 + Math.random() * 4;
          }
          windStrength += (windTarget - windStrength) * 0.02;
          breeze *= 0.94;

          petals.sort((a, b) => a.depth - b.depth);

          for (const p of petals) {
            const sway = Math.sin(t * p.swaySpeed + p.swayPhase) * p.flutter;
            const wind = (windStrength + breeze) * (0.5 + p.depth * 0.5);
            p.x += (p.vx + sway * 0.8) * windAmount + wind;
            p.y += p.vy * fallSpeed;
            p.rotation += p.rotSpeed + windStrength * 0.005;
            p.tilt += p.tiltSpeed;

            if (p.y > height + 30 || p.x > width + 50 || p.x < -60) {
              Object.assign(p, makePetal(true));
              p.x = -10 - Math.random() * 40;
              p.y = Math.random() * height * 0.6;
            }

            drawPetal(c, p, t);
          }

          c.globalAlpha = 1;
        },
      };
    },
    [count, fallSpeed, windAmount, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
