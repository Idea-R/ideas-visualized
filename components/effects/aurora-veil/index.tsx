"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Band {
  /** Center x as a fraction of width [0,1]. */
  cx: number;
  /** Per-band slow-wave phases. */
  p1: number;
  p2: number;
  p3: number;
  /** Per-band base width (in px) of the soft horizontal glow. */
  spread: number;
  /** Per-band shimmer phase offset. */
  shim: number;
  /** Per-band bend induced by the pointer (px), eased back to 0. */
  bend: number;
  /** Color factor across the curtains [0,1]. */
  t: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  /** Twinkle phase + speed. */
  phase: number;
  speed: number;
  base: number;
}

export function AuroraVeil({ params }: { params: EffectProps }) {
  const bands = Math.max(2, Math.min(8, Math.round(Number(params.bands ?? 4))));
  const waveSpeed = Number(params.waveSpeed ?? 1);
  const heightFrac = Number(params.height ?? 0.8);
  const shimmer = Number(params.shimmer ?? 0.5);
  const brightness = Number(params.brightness ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const canvasRef = useCanvas2D(
    (ctx, { width, height }) => {
      // Precompute per-band phases + center positions.
      const curtains: Band[] = [];
      for (let i = 0; i < bands; i++) {
        const t = bands > 1 ? i / (bands - 1) : 0;
        curtains.push({
          cx: bands > 1 ? (i + 0.5) / bands : 0.5,
          p1: Math.random() * Math.PI * 2,
          p2: Math.random() * Math.PI * 2,
          p3: Math.random() * Math.PI * 2,
          spread: (width / bands) * (0.35 + Math.random() * 0.25),
          shim: Math.random() * Math.PI * 2,
          bend: 0,
          t,
        });
      }

      // Precompute a faint star field behind the curtains.
      const starCount = Math.round(
        Math.min(260, Math.max(40, (width * height) / 9000))
      );
      const stars: Star[] = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.4 + Math.random() * 1.1,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.2,
          base: 0.25 + Math.random() * 0.45,
        });
      }

      // Pointer state (CSS px). pulse decays over time after a pointer-down.
      let pointerX = -9999;
      let pointerActive = false;
      let pulse = 0;

      // Number of vertical samples per curtain ribbon.
      const segments = 26;

      return {
        clearMode: "full",
        onPointer: (x, _y, type) => {
          if (type === "leave" || type === "up") {
            pointerActive = false;
            pointerX = -9999;
            return;
          }
          pointerX = x;
          pointerActive = true;
          if (type === "down") pulse = 1;
        },
        draw: (c, dt, t) => {
          // Solid night-sky base.
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Slow internal "rhythm" envelope — the audio-reactive pulse feel.
          const rhythm =
            0.7 +
            0.3 * Math.sin(t * 0.6) +
            0.12 * Math.sin(t * 0.23 + 1.7);
          pulse = Math.max(0, pulse - dt * 1.4);

          // --- Star field (twinkle), drawn behind the curtains. ---
          c.globalCompositeOperation = "lighter";
          for (const s of stars) {
            const tw =
              s.base * (0.55 + 0.45 * Math.sin(t * s.speed + s.phase));
            c.globalAlpha = Math.max(0, Math.min(1, tw));
            c.fillStyle = "#cfe3ff";
            c.beginPath();
            c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            c.fill();
          }

          // --- Aurora curtains (additive glow). ---
          const reachY = height * heightFrac;
          const time = t * waveSpeed;

          for (const band of curtains) {
            // Ease the pointer-induced bend back toward zero each frame.
            band.bend += (0 - band.bend) * Math.min(1, dt * 3);

            const baseX = band.cx * width;

            // Pointer gently bends the nearest curtain toward the cursor.
            if (pointerActive) {
              const dx = pointerX - baseX;
              const dist = Math.abs(dx);
              const influence = Math.exp(-(dist * dist) / (2 * 140 * 140));
              band.bend += dx * 0.04 * influence;
            }

            const hueDeg = paletteHue(mode, hue, hue2, band.t);
            const shimAmp = shimmer * (0.4 + 0.6 * rhythm);

            for (let s = 0; s < segments; s++) {
              const vy = s / (segments - 1); // 0 (top) → 1 (bottom)
              const y0 = vy * reachY;
              const segH = reachY / segments + 1;

              // Horizontal center = slow sum-of-sines wave + fast shimmer + bend.
              const wave =
                Math.sin(time * 0.7 + band.p1 + vy * 3.2) * 60 +
                Math.sin(time * 1.3 + band.p2 + vy * 5.5) * 26 +
                Math.sin(time * 0.4 + band.p3 - vy * 2.0) * 40;
              const flick =
                Math.sin(time * 6.0 + band.shim + vy * 9.0) * 14 * shimAmp;
              const cx = baseX + wave + flick + band.bend * (1 - vy);

              // Soft horizontal gaussian glow as a 1D gradient across the ribbon.
              const spread = band.spread * (0.85 + 0.3 * Math.sin(vy * 4 + band.p1));
              const half = spread * 2.2;

              // Vertical fade top→bottom, brighter near top, plus rhythm + pulse.
              const vFade = Math.pow(1 - vy, 1.35) * (0.4 + 0.6 * (1 - vy));
              const pulseBoost = 1 + pulse * 1.2;
              const alpha = Math.max(
                0,
                Math.min(
                  0.9,
                  vFade * 0.5 * brightness * rhythm * pulseBoost
                )
              );
              if (alpha <= 0.002) continue;

              const grad = c.createLinearGradient(cx - half, 0, cx + half, 0);
              grad.addColorStop(0, `hsla(${hueDeg}, 90%, 60%, 0)`);
              grad.addColorStop(
                0.5,
                `hsla(${hueDeg}, 95%, ${62 + 12 * (1 - vy)}%, ${alpha})`
              );
              grad.addColorStop(1, `hsla(${hueDeg}, 90%, 60%, 0)`);

              c.globalAlpha = 1;
              c.fillStyle = grad;
              c.fillRect(cx - half, y0, half * 2, segH);
            }
          }

          // Always reset to defaults each frame.
          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [bands, waveSpeed, heightFrac, shimmer, brightness, mode, hue, hue2]
  );

  return (
    <div className="relative h-full w-full bg-[#05060a]">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
