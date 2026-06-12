"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import { Pool } from "@/lib/effects/pool";
import type { EffectProps } from "@/lib/effects/types";

interface Particle {
  /** Drift center x (px); actual x adds the sine wobble + parallax. */
  baseX: number;
  y: number;
  size: number;
  /** Upward float speed (px/s). */
  speedY: number;
  driftAmp: number;
  driftFreq: number;
  phase: number;
  /** Palette factor [0,1]. */
  t: number;
  /** 0 = far, 1 = mid, 2 = near. */
  layer: number;
}

/** Far -> near depth layers, ported from XPanywhere's FloatingParticles. */
const LAYERS = [
  { depth: 0.18, sizeMul: 0.65, speedMul: 0.4, alpha: 0.4, glow: 3.4 },
  { depth: 0.5, sizeMul: 1.0, speedMul: 0.7, alpha: 0.62, glow: 2.6 },
  { depth: 1.0, sizeMul: 1.7, speedMul: 1.0, alpha: 0.9, glow: 1.8 },
];

const BASE_AREA = 240_000;

export function ParallaxDepth({ params }: { params: EffectProps }) {
  const count = Math.max(10, Math.min(220, Math.round(Number(params.count ?? 60))));
  const separation = Number(params.separation ?? 1);
  const drift = Number(params.drift ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const canvasRef = useCanvas2D(
    (ctx, { width, height }) => {
      const area = width * height;
      const scaled = Math.round((count * area) / BASE_AREA + count * 0.5);
      const total = Math.max(10, Math.min(260, scaled));

      const pool = new Pool<Particle>(total, () => ({
        baseX: 0,
        y: 0,
        size: 1,
        speedY: 10,
        driftAmp: 10,
        driftFreq: 1,
        phase: 0,
        t: 0,
        layer: 1,
      }));

      const layerOf = (i: number) => {
        const f = i / total;
        if (f < 0.45) return 0;
        if (f < 0.78) return 1;
        return 2;
      };

      for (let i = 0; i < total; i++) {
        const layer = layerOf(i);
        const cfg = LAYERS[layer];
        pool.spawn((p) => {
          p.layer = layer;
          p.baseX = Math.random() * width;
          p.y = Math.random() * (height + 80) - 40;
          p.size = (2 + Math.random() * 4) * cfg.sizeMul;
          p.speedY = (14 + Math.random() * 22) * cfg.speedMul;
          p.driftAmp = (8 + Math.random() * 22) * cfg.sizeMul;
          p.driftFreq = 0.2 + Math.random() * 0.6;
          p.phase = Math.random() * Math.PI * 2;
          p.t = Math.random();
        });
      }

      // Pointer parallax offset, normalized [-1,1] from center, eased.
      let px = 0;
      let py = 0;
      let targetPx = 0;
      let targetPy = 0;

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave" || type === "up") {
            targetPx = 0;
            targetPy = 0;
            return;
          }
          targetPx = (x / width - 0.5) * 2;
          targetPy = (y / height - 0.5) * 2;
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          px += (targetPx - px) * Math.min(1, dt * 3);
          py += (targetPy - py) * Math.min(1, dt * 3);

          c.globalCompositeOperation = "lighter";

          pool.forEach((p) => {
            const cfg = LAYERS[p.layer];

            // Continuous upward float with seamless wrap.
            p.y -= p.speedY * dt;
            if (p.y < -p.size - 20) {
              p.y = height + p.size + 20;
              p.baseX = Math.random() * width;
            }

            // Gentle sine drift + depth-scaled pointer parallax.
            const wobble = Math.sin(t * p.driftFreq + p.phase) * p.driftAmp * drift;
            const parallax = cfg.depth * separation * 60;
            const x = p.baseX + wobble - px * parallax;
            const y = p.y - py * parallax * 0.4;

            const hueDeg = paletteHue(mode, hue, hue2, p.t);
            const r = p.size;

            // Soft glow halo (wider + fainter for far layers = blurred look).
            const glowR = r * cfg.glow;
            const grad = c.createRadialGradient(x, y, 0, x, y, glowR);
            grad.addColorStop(
              0,
              `hsla(${hueDeg}, 90%, 70%, ${(cfg.alpha * 0.5).toFixed(3)})`
            );
            grad.addColorStop(1, "transparent");
            c.fillStyle = grad;
            c.beginPath();
            c.arc(x, y, glowR, 0, Math.PI * 2);
            c.fill();

            // Sharp core, brightest on the near layer.
            c.globalAlpha = cfg.alpha;
            c.fillStyle = `hsla(${hueDeg}, 95%, ${(70 + p.layer * 6).toFixed(
              0
            )}%, ${cfg.alpha.toFixed(3)})`;
            c.beginPath();
            c.arc(x, y, r * (0.45 + p.layer * 0.12), 0, Math.PI * 2);
            c.fill();
            c.globalAlpha = 1;
          });

          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [count, separation, drift, mode, hue, hue2]
  );

  return (
    <div className="relative h-full w-full bg-[#05060a]">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
