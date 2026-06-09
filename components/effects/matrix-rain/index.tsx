"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

const GLYPHS =
  "アァカサタナハマヤャラワガザダバパ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function MatrixRain({ params }: { params: EffectProps }) {
  const fontSize = Number(params.fontSize);
  const speed = Number(params.speed);
  const spotlight = Boolean(params.spotlight);
  const { mode: colorMode, hue, hue2 } = readPalette(params);
  const tail = Math.max(2, Math.round(Number(params.tail)));

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const cols = Math.max(1, Math.floor(width / fontSize));
      // Hue per column: t = columnIndex / columnCount. Rainbow yields rainbow
      // columns, Dual blends across the screen width, Single uses one hue.
      const colHue = new Float32Array(cols);
      for (let i = 0; i < cols; i++)
        colHue[i] = paletteHue(colorMode, hue, hue2, cols > 1 ? i / (cols - 1) : 0);
      const rows = Math.floor(height / fontSize) + 1;
      const grid = new Int16Array(cols * rows);
      for (let i = 0; i < grid.length; i++)
        grid[i] = (Math.random() * GLYPHS.length) | 0;

      const head = new Float32Array(cols);
      const colSpeed = new Float32Array(cols);
      for (let i = 0; i < cols; i++) {
        head[i] = Math.random() * -rows;
        colSpeed[i] = 0.5 + Math.random();
      }
      const mouse = { x: -9999, y: -9999 };

      return {
        // Crisp: full clear each frame; the tail is drawn explicitly.
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            mouse.x = -9999;
            mouse.y = -9999;
          } else {
            mouse.x = x;
            mouse.y = y;
          }
        },
        draw: (c, dt) => {
          c.font = `${fontSize}px monospace`;
          c.textBaseline = "top";

          for (let col = 0; col < cols; col++) {
            head[col] += colSpeed[col] * speed * dt * 18;
            const h = Math.floor(head[col]);

            // occasionally mutate the head glyph for shimmer
            if (h >= 0 && h < rows && Math.random() > 0.7) {
              grid[col * rows + h] = (Math.random() * GLYPHS.length) | 0;
            }

            for (let k = 0; k < tail; k++) {
              const row = h - k;
              if (row < 0 || row >= rows) continue;
              const x = col * fontSize;
              const y = row * fontSize;

              let light = 1 - k / tail; // head brightest, tail fades to 0
              if (spotlight) {
                const d = Math.hypot(x - mouse.x, y - mouse.y);
                light *= Math.max(0.18, Math.min(1, 1 - d / 180));
              }

              const glyph = GLYPHS[grid[col * rows + row]];
              const gh = colHue[col];
              if (k === 0) {
                c.fillStyle = `hsla(${gh}, 100%, 85%, ${Math.min(1, light + 0.2)})`;
              } else {
                c.fillStyle = `hsla(${gh}, 100%, ${45 + light * 25}%, ${light})`;
              }
              c.fillText(glyph, x, y);
            }

            if (h - tail > rows) {
              head[col] = Math.random() * -rows * 0.5;
              colSpeed[col] = 0.5 + Math.random();
            }
          }
        },
      };
    },
    [fontSize, speed, spotlight, colorMode, hue, hue2, tail]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
