"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface DataParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  char: string;
  t: number; // palette factor in [0,1]
}

const DATA_CHARS = "0123456789ABCDEF".split("");

export function HoloGrid({ params }: { params: EffectProps }) {
  // Grid line count along each axis at the near edge.
  const density = Math.max(6, Math.round(Number(params.density ?? 16)));
  // How fast the floor recedes toward the viewer (rows per second).
  const speed = Math.max(0, Number(params.speed ?? 1));
  // Relative spawn rate for the rising data glyphs.
  const particleRate = Math.max(0, Number(params.particleRate ?? 1));
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const horizonY = height * 0.38;
      const floorH = height - horizonY;
      const vpx = width / 2;

      // Scroll offset in [0,1) drives the receding-row illusion.
      let offset = 0;

      // Rising glyph particles, scaled by canvas area, capped for perf.
      const area = width * height;
      const cap = Math.min(160, Math.round((area / 18000) * particleRate));
      const particles: DataParticle[] = [];

      const spawn = (seed = false): DataParticle => {
        const maxLife = 2.2 + Math.random() * 3.2;
        return {
          x: Math.random() * width,
          y: seed ? Math.random() * height : height * (0.55 + Math.random() * 0.45),
          vx: (Math.random() - 0.5) * 8,
          vy: -(14 + Math.random() * 34),
          size: 9 + Math.random() * 5,
          life: seed ? Math.random() * maxLife : 0,
          maxLife,
          char: DATA_CHARS[(Math.random() * DATA_CHARS.length) | 0],
          t: Math.random(),
        };
      };
      for (let i = 0; i < cap; i++) particles.push(spawn(true));

      let scanY = 0;
      let spawnAcc = 0;

      const gridHsl = (t: number, light: number, alpha: number) =>
        `hsla(${Math.round(paletteHue(mode, hue, hue2, t))}, 90%, ${light}%, ${alpha})`;

      return {
        clearMode: "full",
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          offset = (offset + speed * dt) % 1;

          // ── Perspective floor grid ──
          c.globalCompositeOperation = "lighter";

          // Receding horizontal rows: depth^2 spacing bunches rows at the horizon.
          c.lineWidth = 1;
          const rows = density;
          for (let i = 1; i <= rows; i++) {
            const d = (i - offset) / rows; // 0 (far) → 1 (near)
            if (d <= 0) continue;
            const y = horizonY + floorH * d * d;
            const near = d; // brightness/colour factor
            c.strokeStyle = gridHsl(near, 50 + near * 18, 0.05 + near * 0.32);
            c.beginPath();
            c.moveTo(0, y);
            c.lineTo(width, y);
            c.stroke();
          }

          // Converging vertical lines fan from the vanishing point to the base.
          const cols = density;
          for (let i = 0; i <= cols; i++) {
            const fx = i / cols; // 0..1 across the base
            const baseX = fx * width;
            // Pull the top toward the vanishing point for perspective convergence.
            const topX = vpx + (baseX - vpx) * 0.06;
            const tt = Math.abs(fx - 0.5) * 2; // 0 centre → 1 edges
            c.strokeStyle = gridHsl(1 - tt, 56, 0.14);
            c.beginPath();
            c.moveTo(topX, horizonY);
            c.lineTo(baseX, height);
            c.stroke();
          }

          // Horizon glow line.
          const hg = c.createLinearGradient(0, horizonY - 2, 0, horizonY + 2);
          hg.addColorStop(0, "transparent");
          hg.addColorStop(0.5, gridHsl(0.7, 70, 0.6));
          hg.addColorStop(1, "transparent");
          c.fillStyle = hg;
          c.fillRect(0, horizonY - 2, width, 4);

          // ── Horizontal scan sweep ──
          scanY = (scanY + dt * 60) % height;
          const sg = c.createLinearGradient(0, scanY - 34, 0, scanY + 34);
          sg.addColorStop(0, "transparent");
          sg.addColorStop(0.5, gridHsl(0.5, 65, 0.12));
          sg.addColorStop(1, "transparent");
          c.fillStyle = sg;
          c.fillRect(0, scanY - 34, width, 68);

          // ── Rising data glyphs ──
          c.font = "600 13px ui-monospace, monospace";
          c.textAlign = "center";
          c.textBaseline = "middle";
          spawnAcc += dt * particleRate * 6;
          for (const p of particles) {
            p.life += dt;
            if (p.life >= p.maxLife || p.y < -20) {
              Object.assign(p, spawn(false));
            }
            p.x += p.vx * dt;
            p.vy -= 6 * dt; // gentle upward acceleration (buoyant)
            p.y += p.vy * dt;

            const prog = p.life / p.maxLife;
            const fadeIn = Math.min(p.life / 0.4, 1);
            const fadeOut = 1 - Math.max(0, (prog - 0.7) / 0.3);
            const a = fadeIn * fadeOut * 0.75;
            if (a <= 0.01) continue;

            // Occasionally flicker to a new glyph.
            if (Math.random() < dt * 3) p.char = DATA_CHARS[(Math.random() * DATA_CHARS.length) | 0];

            c.fillStyle = gridHsl(p.t, 72, a);
            c.fillText(p.char, p.x, p.y);
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
          c.textAlign = "start";
          c.textBaseline = "alphabetic";
        },
      };
    },
    [density, speed, particleRate, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
