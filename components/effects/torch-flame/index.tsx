"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

function makeSpark(): Spark {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0 };
}

/**
 * Wall-mounted torches ported from the dungeon-crawler lighting renderer
 * (drawTorchFlame): a bracket, a three-layer flickering flame, and rising
 * sparks. Colors come through the shared palette so the default warm fire can
 * be retuned to ghostly green, arcane blue, and so on.
 */
export function TorchFlame({ params }: { params: EffectProps }) {
  const count = Math.max(1, Math.round(Number(params.count ?? 3)));
  const flameSize = Number(params.flameSize ?? 1);
  const sparkRate = Number(params.sparks ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const sparks = new Pool<Spark>(1200, makeSpark);
      const scale = Math.min(width, height) / 220;
      const baseY = height * 0.62;

      const torchHue = (i: number) => paletteHue(mode, hue, hue2, count > 1 ? i / (count - 1) : 0);

      return {
        clearMode: "full",
        draw: (c, dt, t) => {
          c.fillStyle = "#06060a";
          c.fillRect(0, 0, width, height);

          for (let i = 0; i < count; i++) {
            const cx = width * ((i + 1) / (count + 1));
            const h = torchHue(i);
            const flicker = Math.sin(t * 12 + cx) * 2 * scale;
            const flameH = (28 + Math.sin(t * 8 + i * 3) * 8) * scale * flameSize;
            const topY = baseY - flameH;

            c.globalCompositeOperation = "source-over";

            // Wall bracket.
            c.fillStyle = "#3a2c1d";
            c.fillRect(cx - 4 * scale, baseY, 8 * scale, 18 * scale);
            c.fillStyle = "#2a1f14";
            c.fillRect(cx - 2.5 * scale, baseY + 3 * scale, 5 * scale, 12 * scale);
            c.fillStyle = "#544231";
            c.fillRect(cx - 1.5 * scale, baseY - 4 * scale, 3 * scale, 8 * scale);

            c.globalCompositeOperation = "lighter";

            // Layer 1: broad outer glow.
            const glowR = flameH * 1.5;
            const glow = c.createRadialGradient(cx, topY + flameH * 0.5, 0, cx, topY + flameH * 0.5, glowR);
            glow.addColorStop(0, `hsla(${h}, 100%, 55%, 0.28)`);
            glow.addColorStop(1, `hsla(${h}, 100%, 45%, 0)`);
            c.fillStyle = glow;
            c.beginPath();
            c.arc(cx, topY + flameH * 0.5, glowR, 0, Math.PI * 2);
            c.fill();

            // Layer 2: mid flame body.
            c.fillStyle = `hsl(${(h + 18) % 360}, 100%, 56%)`;
            c.globalAlpha = 0.75;
            c.beginPath();
            c.moveTo(cx - 8 * scale + flicker, baseY);
            c.quadraticCurveTo(cx - 5 * scale + flicker * 0.7, topY + flameH * 0.25, cx + flicker * 0.5, topY);
            c.quadraticCurveTo(cx + 5 * scale + flicker * 0.4, topY + flameH * 0.25, cx + 8 * scale + flicker, baseY);
            c.closePath();
            c.fill();

            // Layer 3: bright inner core.
            c.globalAlpha = 0.95;
            c.fillStyle = `hsl(${(h + 45) % 360}, 100%, 72%)`;
            c.beginPath();
            c.moveTo(cx - 3.5 * scale + flicker, baseY);
            c.quadraticCurveTo(cx + flicker * 0.6, topY + flameH * 0.45, cx + flicker * 0.6, topY + flameH * 0.2);
            c.quadraticCurveTo(cx + flicker * 0.4, topY + flameH * 0.45, cx + 3.5 * scale + flicker, baseY);
            c.closePath();
            c.fill();

            c.fillStyle = `hsl(${(h + 60) % 360}, 100%, 90%)`;
            c.beginPath();
            c.arc(cx + flicker, baseY - flameH * 0.35, 1.6 * scale, 0, Math.PI * 2);
            c.fill();
            c.globalAlpha = 1;

            // Spark emission from the flame tip.
            const emit = dt * 22 * sparkRate;
            if (Math.random() < emit) {
              sparks.spawn((s) => {
                s.x = cx + flicker + (Math.random() - 0.5) * 6 * scale;
                s.y = topY + Math.random() * flameH * 0.4;
                s.vx = (Math.random() - 0.5) * 20 * scale;
                s.vy = -(20 + Math.random() * 40) * scale;
                s.life = 1;
                s.maxLife = 0.6 + Math.random() * 0.8;
                s.size = (0.6 + Math.random() * 1.2) * scale;
                s.hue = (h + 20 + Math.random() * 30) % 360;
              });
            }
          }

          // Rising sparks.
          c.globalCompositeOperation = "lighter";
          sparks.update((s) => {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vy += 12 * scale * dt; // slight gravity decel as they rise
            s.vx *= 0.98;
            s.life -= dt / s.maxLife;
            return s.life > 0;
          });
          sparks.forEach((s) => {
            const a = Math.max(0, s.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${s.hue}, 100%, 70%)`;
            c.beginPath();
            c.arc(s.x, s.y, s.size * (0.5 + a * 0.7), 0, Math.PI * 2);
            c.fill();
          });
          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [count, flameSize, sparkRate, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
