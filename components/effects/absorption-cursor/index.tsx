"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Target {
  x: number;
  y: number;
  base: number; // base radius
  glow: number; // 0..1 proximity-driven glow
  hue: number; // per-target palette hue
}

interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
  hue: number;
}

function makeRing(): Ring {
  return { x: 0, y: 0, r: 0, life: 0, hue: 0 };
}

export function AbsorptionCursor({ params }: { params: EffectProps }) {
  const targets = Math.min(8, Math.max(2, Math.round(Number(params.targets))));
  const glowIntensity = Number(params.glowIntensity);
  const { mode, hue, hue2 } = readPalette(params);
  const rings = Boolean(params.rings);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const cursor = { x: width / 2, y: height / 2 };
      const target = { x: width / 2, y: height / 2 };
      let presence = 0;
      let active = false;
      // Smoothed absorption amount (0 free .. 1 fully absorbed).
      let absorb = 0;
      let ringTimer = 0;

      const ringPool = new Pool<Ring>(64, makeRing);

      // Lay targets out on a ring centered in the panel (self-contained, no DOM).
      const nodes: Target[] = [];
      const cx = width / 2;
      const cy = height / 2;
      const layoutR = Math.min(width, height) * 0.32;
      const baseR = Math.max(6, Math.min(width, height) * 0.035);
      for (let i = 0; i < targets; i++) {
        const a = (i / targets) * Math.PI * 2 - Math.PI / 2;
        nodes.push({
          x: cx + Math.cos(a) * layoutR,
          y: cy + Math.sin(a) * layoutR,
          base: baseR,
          glow: 0,
          // t = targetIndex / targetCount: Dual blends across targets, Rainbow
          // makes each target a different hue.
          hue: paletteHue(mode, hue, hue2, i / targets),
        });
      }

      // The cursor itself stays on the base hue.
      const cursorHue = paletteHue(mode, hue, hue2, 0);

      const captureR = baseR * 4.5;

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
          const k = 1 - Math.pow(0.0008, dt);
          cursor.x += (target.x - cursor.x) * k;
          cursor.y += (target.y - cursor.y) * k;
          presence += ((active ? 1 : 0) - presence) * (1 - Math.pow(0.02, dt));

          // Find the nearest target and its proximity (0..1).
          let nearest: Target | null = null;
          let proximity = 0;
          for (const n of nodes) {
            const d = Math.hypot(cursor.x - n.x, cursor.y - n.y);
            const p = Math.max(0, 1 - d / captureR);
            const targetGlow = active ? p : 0;
            n.glow += (targetGlow - n.glow) * (1 - Math.pow(0.01, dt));
            if (p > proximity) {
              proximity = p;
              nearest = n;
            }
          }
          const absorbTarget = active ? proximity : 0;
          absorb += (absorbTarget - absorb) * (1 - Math.pow(0.004, dt));

          // Spawn expanding pulse rings from the target being absorbed.
          if (rings && nearest && absorb > 0.35) {
            ringTimer -= dt;
            if (ringTimer <= 0) {
              ringTimer = 0.18;
              const src = nearest;
              ringPool.spawn((r) => {
                r.x = src.x;
                r.y = src.y;
                r.r = src.base;
                r.life = 1;
                r.hue = src.hue;
              });
            }
          }
          ringPool.update((r) => {
            r.r += dt * 140;
            r.life -= dt * 1.4;
            return r.life > 0;
          });

          // --- Targets ---
          c.globalCompositeOperation = "lighter";
          for (const n of nodes) {
            const g = n.glow;
            const nh = n.hue;
            const haloR = n.base * (2.2 + g * 1.8) * (0.9 + glowIntensity * 0.4);
            const grad = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
            const ha = (0.12 + g * 0.5) * glowIntensity;
            grad.addColorStop(0, `hsla(${nh}, 90%, 65%, ${Math.min(1, ha)})`);
            grad.addColorStop(0.5, `hsla(${nh}, 90%, 60%, ${Math.min(1, ha * 0.4)})`);
            grad.addColorStop(1, `hsla(${nh}, 90%, 60%, 0)`);
            c.fillStyle = grad;
            c.beginPath();
            c.arc(n.x, n.y, haloR, 0, Math.PI * 2);
            c.fill();

            const pulse = 1 + Math.sin(t * 3 + n.x) * 0.05 + g * 0.2;
            c.fillStyle = `hsla(${nh}, ${70 + g * 25}%, ${55 + g * 25}%, ${0.55 + g * 0.45})`;
            c.beginPath();
            c.arc(n.x, n.y, n.base * pulse, 0, Math.PI * 2);
            c.fill();
          }

          // --- Expanding rings ---
          if (rings) {
            c.lineWidth = 2;
            ringPool.forEach((r) => {
              c.strokeStyle = `hsla(${r.hue}, 90%, 68%, ${r.life * 0.5 * glowIntensity})`;
              c.beginPath();
              c.arc(r.x, r.y, r.r, 0, Math.PI * 2);
              c.stroke();
            });
          }

          // --- Cursor ---
          if (presence > 0.002) {
            // Grows/pulses when free; shrinks as it's absorbed into a target.
            const breathe = 1 + Math.sin(t * 2.4) * 0.12;
            const headBase = Math.max(5, Math.min(width, height) * 0.022);
            const head = headBase * breathe * (1 - absorb * 0.72) * (0.8 + glowIntensity * 0.3);

            const haloR = head * (3 + absorb * 2) * (0.8 + glowIntensity * 0.5);
            const halo = c.createRadialGradient(cursor.x, cursor.y, 0, cursor.x, cursor.y, haloR);
            const ha = (0.45 + absorb * 0.3) * presence * glowIntensity;
            halo.addColorStop(0, `hsla(${cursorHue}, 95%, 70%, ${Math.min(1, ha)})`);
            halo.addColorStop(0.4, `hsla(${cursorHue}, 95%, 62%, ${Math.min(1, ha * 0.35)})`);
            halo.addColorStop(1, `hsla(${cursorHue}, 95%, 62%, 0)`);
            c.fillStyle = halo;
            c.beginPath();
            c.arc(cursor.x, cursor.y, haloR, 0, Math.PI * 2);
            c.fill();

            // Absorption rings tighten around the cursor as it's captured.
            if (rings && absorb > 0.25) {
              c.lineWidth = 1.5;
              const r1 = head + 8 + Math.sin(t * 6) * 3;
              c.strokeStyle = `hsla(${cursorHue}, 95%, 72%, ${absorb * 0.6 * presence})`;
              c.beginPath();
              c.arc(cursor.x, cursor.y, r1, 0, Math.PI * 2);
              c.stroke();
            }

            c.globalCompositeOperation = "source-over";
            c.fillStyle = `hsla(${cursorHue}, 90%, 66%, ${presence})`;
            c.beginPath();
            c.arc(cursor.x, cursor.y, head, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = `hsla(${cursorHue}, 100%, 94%, ${0.85 * presence})`;
            c.beginPath();
            c.arc(cursor.x, cursor.y, head * 0.4, 0, Math.PI * 2);
            c.fill();
          }

          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [targets, glowIntensity, mode, hue, hue2, rings]
  );

  return <canvas ref={ref} className="h-full w-full cursor-none" />;
}
