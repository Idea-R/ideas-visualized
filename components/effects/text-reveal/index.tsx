"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteColor, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type Animation =
  | "fade-up"
  | "wave"
  | "blur-in"
  | "scale-in"
  | "typewriter"
  | "slide-in";

interface Glyph {
  ch: string;
  cx: number;
  w: number;
  t: number;
}

const HOLD = 1.6;
const CHAR_DUR = 0.6;

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}

export function TextReveal({ params }: { params: EffectProps }) {
  const text = String(params.text ?? "").slice(0, 24);
  const animation = String(params.animation ?? "fade-up") as Animation;
  const speed = Number(params.speed ?? 1);
  const stagger = Number(params.stagger ?? 0.05);
  const colorMode = String(params.colorMode ?? "single") as ColorMode;
  const hue = Number(params.hue ?? 200);
  const hue2 = Number(params.hue2 ?? hue);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const phrase = text.length ? text : " ";

      let fontSize = Math.max(10, Math.floor(height * 0.32));
      const fontOf = (size: number) =>
        `800 ${size}px "Arial", system-ui, sans-serif`;
      ctx.font = fontOf(fontSize);
      const measured = ctx.measureText(phrase).width || 1;
      const maxW = width * 0.84;
      if (measured > maxW) {
        fontSize = Math.max(10, Math.floor((fontSize * maxW) / measured));
      }

      ctx.font = fontOf(fontSize);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const chars = Array.from(phrase);
      let total = 0;
      const widths = chars.map((c) => {
        const w = ctx.measureText(c).width;
        total += w;
        return w;
      });

      const startX = width / 2 - total / 2;
      const baseY = height / 2;
      const glyphs: Glyph[] = [];
      let cursorX = startX;
      const denom = Math.max(1, chars.length - 1);
      for (let i = 0; i < chars.length; i++) {
        const w = widths[i];
        glyphs.push({ ch: chars[i], cx: cursorX + w / 2, w, t: i / denom });
        cursorX += w;
      }

      const revealDur = (chars.length - 1) * stagger + CHAR_DUR;
      const cycle = revealDur + HOLD;

      // Start on the fully-revealed hold frame so the first paint (gallery
      // preview, static capture, reduced motion) already shows the phrase,
      // then the loop replays the reveal. Reduced motion just holds.
      let elapsed = reduce ? cycle - 0.001 : revealDur;

      const drawGlyph = (
        c: CanvasRenderingContext2D,
        g: Glyph,
        p: number,
        color: string,
        now: number
      ) => {
        const e = easeOutCubic(p);
        let dx = 0;
        let dy = 0;
        let scale = 1;
        let alpha = e;
        let blur = 0;

        switch (animation) {
          case "fade-up":
            dy = (1 - e) * fontSize * 0.45;
            break;
          case "wave": {
            dy = (1 - e) * fontSize * 0.5;
            if (p >= 1 && !reduce) {
              dy += Math.sin(now * 3 + g.t * Math.PI * 4) * fontSize * 0.06;
            }
            break;
          }
          case "blur-in":
            blur = (1 - e) * 14;
            dy = (1 - e) * fontSize * 0.12;
            break;
          case "scale-in":
            scale = 0.2 + e * 0.8;
            break;
          case "slide-in":
            dx = -(1 - e) * fontSize * 1.1;
            break;
          case "typewriter":
            alpha = p > 0 ? 1 : 0;
            scale = 1;
            break;
          default: {
            const _never: never = animation;
            return _never;
          }
        }

        if (alpha <= 0) return;
        c.save();
        c.globalAlpha = Math.min(1, alpha);
        c.translate(g.cx + dx, baseY + dy);
        if (scale !== 1) c.scale(scale, scale);
        if (blur > 0) {
          c.shadowColor = color;
          c.shadowBlur = blur;
        }
        c.fillStyle = color;
        c.fillText(g.ch, -g.w / 2, 0);
        c.restore();
      };

      return {
        clearMode: "full",
        onPointer: (_x, _y, type) => {
          if (type === "down") elapsed = 0;
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          if (!reduce) {
            elapsed += dt * speed;
            if (elapsed > cycle) elapsed = 0;
          }

          let lastVisibleX = startX;
          for (let i = 0; i < glyphs.length; i++) {
            const g = glyphs[i];
            const local = (elapsed - i * stagger) / CHAR_DUR;
            const p = Math.max(0, Math.min(1, local));
            if (p > 0) lastVisibleX = g.cx + g.w / 2;
            const color = paletteColor(colorMode, hue, hue2, g.t);
            drawGlyph(c, g, p, color, t);
          }

          // Typewriter cursor: a blinking caret at the typing position.
          if (animation === "typewriter" && elapsed < revealDur) {
            const blink = Math.sin(t * 8) > 0;
            if (blink) {
              c.globalAlpha = 1;
              c.fillStyle = paletteColor(colorMode, hue, hue2, 1);
              c.fillRect(
                lastVisibleX + 2,
                baseY - fontSize * 0.4,
                Math.max(2, fontSize * 0.06),
                fontSize * 0.8
              );
            }
          }

          c.globalAlpha = 1;
          c.shadowBlur = 0;
        },
      };
    },
    [text, animation, speed, stagger, colorMode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
