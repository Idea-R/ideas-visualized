"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

const MAX_TRAIL = 40;

export function CustomCursorTrail({ params }: { params: EffectProps }) {
  const trail = Math.min(MAX_TRAIL, Math.max(4, Math.round(Number(params.trail))));
  const size = Number(params.size);
  const { mode, hue, hue2 } = readPalette(params);
  const glow = Boolean(params.glow);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      // Smoothed cursor position chases the raw pointer for fluid motion.
      const cursor = { x: width / 2, y: height / 2 };
      const target = { x: width / 2, y: height / 2 };
      // Ring buffer of recent smoothed positions for the explicit fading tail.
      const hx = new Float32Array(MAX_TRAIL);
      const hy = new Float32Array(MAX_TRAIL);
      let hn = 0;
      // 0..1 presence: rises when the pointer is active, decays when idle/left.
      let presence = 0;
      let active = false;

      const pushHistory = (x: number, y: number) => {
        if (hn < MAX_TRAIL) {
          hx[hn] = x;
          hy[hn] = y;
          hn++;
        } else {
          for (let i = 0; i < MAX_TRAIL - 1; i++) {
            hx[i] = hx[i + 1];
            hy[i] = hy[i + 1];
          }
          hx[MAX_TRAIL - 1] = x;
          hy[MAX_TRAIL - 1] = y;
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            active = false;
          } else {
            target.x = x;
            target.y = y;
            active = true;
          }
        },
        draw: (c, dt, t) => {
          // Frame-rate independent smoothing toward the raw pointer.
          const k = 1 - Math.pow(0.0015, dt);
          cursor.x += (target.x - cursor.x) * k;
          cursor.y += (target.y - cursor.y) * k;

          const presenceTarget = active ? 1 : 0;
          presence += (presenceTarget - presence) * (1 - Math.pow(0.02, dt));

          pushHistory(cursor.x, cursor.y);

          if (presence < 0.002) return;

          const start = Math.max(0, hn - trail);
          const span = hn - start;

          c.globalCompositeOperation = glow ? "lighter" : "source-over";

          // Fading tail drawn from explicit history (oldest faint -> newest bold).
          for (let i = start; i < hn; i++) {
            const f = span > 1 ? (i - start) / (span - 1) : 1;
            const a = f * f * presence * (glow ? 0.55 : 0.7);
            if (a <= 0.001) continue;
            const r = size * (0.18 + f * 0.62);
            const sat = glow ? 95 : 80;
            const light = glow ? 60 + f * 12 : 62;
            // t along the tail (0 at head, 1 at tail end): Dual gives a
            // head→tail gradient, Rainbow a rainbow trail.
            const tailHue = paletteHue(mode, hue, hue2, 1 - f);
            c.fillStyle = `hsla(${tailHue}, ${sat}%, ${light}%, ${a})`;
            c.beginPath();
            c.arc(hx[i], hy[i], r, 0, Math.PI * 2);
            c.fill();
          }

          // Glowing head: soft halo + bright core + white hot center.
          const pulse = 1 + Math.sin(t * 4) * 0.06;
          const head = size * pulse;
          const headHue = paletteHue(mode, hue, hue2, 0);

          if (glow) {
            const halo = c.createRadialGradient(
              cursor.x,
              cursor.y,
              0,
              cursor.x,
              cursor.y,
              head * 3.2
            );
            halo.addColorStop(0, `hsla(${headHue}, 95%, 65%, ${0.5 * presence})`);
            halo.addColorStop(0.4, `hsla(${headHue}, 95%, 60%, ${0.18 * presence})`);
            halo.addColorStop(1, `hsla(${headHue}, 95%, 60%, 0)`);
            c.fillStyle = halo;
            c.beginPath();
            c.arc(cursor.x, cursor.y, head * 3.2, 0, Math.PI * 2);
            c.fill();
          }

          c.globalCompositeOperation = "source-over";
          c.fillStyle = `hsla(${headHue}, ${glow ? 90 : 75}%, ${glow ? 62 : 58}%, ${presence})`;
          c.beginPath();
          c.arc(cursor.x, cursor.y, head, 0, Math.PI * 2);
          c.fill();

          c.fillStyle = `hsla(${headHue}, 100%, 92%, ${0.85 * presence})`;
          c.beginPath();
          c.arc(cursor.x, cursor.y, head * 0.42, 0, Math.PI * 2);
          c.fill();
        },
      };
    },
    [trail, size, mode, hue, hue2, glow]
  );

  return <canvas ref={ref} className="h-full w-full cursor-none" />;
}
