"use client";

import { useCanvas2D } from "../useCanvas2D";
import type { EffectProps } from "@/lib/effects/types";

interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Seven tier atmospheres ported from XPanywhere's InterpolatedBackground.
 * Hue and saturation are kept from the originals; the very dark base lightness
 * is lifted in the wash so each tier reads clearly on its own canvas.
 */
const TIERS: { name: string; label: string; color: HSL }[] = [
  { name: "rookie", label: "Rookie", color: { h: 240, s: 15, l: 3 } },
  { name: "rising", label: "Rising", color: { h: 210, s: 20, l: 8 } },
  { name: "skilled", label: "Skilled", color: { h: 45, s: 30, l: 12 } },
  { name: "elite", label: "Elite", color: { h: 260, s: 25, l: 15 } },
  { name: "master", label: "Master", color: { h: 320, s: 30, l: 18 } },
  { name: "legend", label: "Legend", color: { h: 45, s: 40, l: 12 } },
  { name: "mythic", label: "Mythic", color: { h: 220, s: 10, l: 40 } },
];

/** Shortest-path hue interpolation around the 360 degree wheel. */
function lerpHue(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return (a + delta * t + 360) % 360;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpHSL(a: HSL, b: HSL, t: number): HSL {
  return {
    h: lerpHue(a.h, b.h, t),
    s: lerp(a.s, b.s, t),
    l: lerp(a.l, b.l, t),
  };
}

export function TierAtmosphere({ params }: { params: EffectProps }) {
  const tierIndex = Math.max(
    0,
    Math.min(
      TIERS.length - 1,
      TIERS.findIndex((tier) => tier.name === String(params.tier ?? "rookie"))
    )
  );
  const autoCycle = Boolean(params.autoCycle ?? false);
  const pulseAmount = Number(params.pulse ?? 0.5);
  const speed = Number(params.speed ?? 1);

  const canvasRef = useCanvas2D(
    (ctx, { width, height }) => {
      // Current eased atmosphere, so tier jumps and auto-cycle both morph.
      const current: HSL = { ...TIERS[tierIndex].color };
      // Glow center, eased toward the pointer for a subtle drift.
      let glowX = width / 2;
      let glowY = height * 0.45;
      let targetX = glowX;
      let targetY = glowY;
      let pointerActive = false;

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave" || type === "up") {
            pointerActive = false;
            targetX = width / 2;
            targetY = height * 0.45;
            return;
          }
          pointerActive = true;
          targetX = x;
          targetY = y;
        },
        draw: (c, dt, t) => {
          // Resolve the target atmosphere for this frame.
          let target: HSL;
          if (autoCycle) {
            const prog = (t * speed * 0.05) % 1;
            const f = prog * TIERS.length;
            const i = Math.min(Math.floor(f), TIERS.length - 1);
            const next = (i + 1) % TIERS.length;
            target = interpHSL(TIERS[i].color, TIERS[next].color, f - i);
          } else {
            target = TIERS[tierIndex].color;
          }

          // Ease the live color toward the target (smooth morph, no hard cut).
          const k = Math.min(1, dt * 2.2);
          current.h = lerpHue(current.h, target.h, k);
          current.s = lerp(current.s, target.s, k);
          current.l = lerp(current.l, target.l, k);

          // Ambient breathing pulse (independent sine), scaled by control.
          const breathe = Math.sin(t * speed * 0.9) * 0.5 + 0.5;
          const amp = pulseAmount * breathe;

          // Ease the glow center toward the pointer (or back to default).
          if (!pointerActive) {
            targetX = width / 2;
            targetY = height * 0.45;
          }
          glowX += (targetX - glowX) * Math.min(1, dt * 3);
          glowY += (targetY - glowY) * Math.min(1, dt * 3);

          // Solid deep base wash.
          const baseL = Math.max(2, current.l * 0.45);
          c.fillStyle = `hsl(${current.h.toFixed(1)}, ${current.s.toFixed(
            1
          )}%, ${baseL.toFixed(1)}%)`;
          c.fillRect(0, 0, width, height);

          // Ambient radial-gradient glow that breathes.
          const radius = Math.hypot(width, height) * (0.62 + amp * 0.12);
          const coreL = Math.min(82, current.l + 22 + amp * 18);
          const coreS = Math.min(85, current.s + 18 + amp * 8);
          const grad = c.createRadialGradient(
            glowX,
            glowY,
            0,
            glowX,
            glowY,
            radius
          );
          grad.addColorStop(
            0,
            `hsla(${current.h.toFixed(1)}, ${coreS.toFixed(1)}%, ${coreL.toFixed(
              1
            )}%, ${(0.45 + amp * 0.45).toFixed(3)})`
          );
          grad.addColorStop(
            0.42,
            `hsla(${current.h.toFixed(1)}, ${current.s.toFixed(1)}%, ${(
              current.l + 6
            ).toFixed(1)}%, ${(0.22 + amp * 0.28).toFixed(3)})`
          );
          grad.addColorStop(
            0.72,
            `hsla(${current.h.toFixed(1)}, ${Math.max(5, current.s - 8).toFixed(
              1
            )}%, ${Math.max(2, current.l - 2).toFixed(1)}%, 0.12)`
          );
          grad.addColorStop(1, "transparent");
          c.fillStyle = grad;
          c.fillRect(0, 0, width, height);

          // A second, slower counter-pulse adds depth without ghosting.
          const breathe2 = Math.sin(t * speed * 0.37 + 1.7) * 0.5 + 0.5;
          const r2 = Math.hypot(width, height) * 0.4;
          const g2 = c.createRadialGradient(
            width * 0.5,
            height * 0.85,
            0,
            width * 0.5,
            height * 0.85,
            r2
          );
          g2.addColorStop(
            0,
            `hsla(${current.h.toFixed(1)}, ${coreS.toFixed(1)}%, ${Math.min(
              80,
              current.l + 14
            ).toFixed(1)}%, ${(0.1 + pulseAmount * breathe2 * 0.18).toFixed(3)})`
          );
          g2.addColorStop(1, "transparent");
          c.fillStyle = g2;
          c.fillRect(0, 0, width, height);
        },
      };
    },
    [tierIndex, autoCycle, pulseAmount, speed]
  );

  return (
    <div className="relative h-full w-full bg-[#05060a]">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
