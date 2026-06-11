"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type PointerMode = "attract" | "repel" | "ignore";

interface Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wingPhase: number;
  wingSpeed: number;
  size: number;
  opacity: number;
  hue: number;
  // Wandering: a slowly rotating heading the butterfly drifts along.
  wander: number;
  wanderSpeed: number;
  bob: number;
}

function makeButterfly(): Butterfly {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    wingPhase: 0,
    wingSpeed: 0,
    size: 6,
    opacity: 1,
    hue: 0,
    wander: 0,
    wanderSpeed: 0,
    bob: 0,
  };
}

// One wing as a teardrop polygon, drawn around the body origin. `side` flips it
// to the other side; `flap` (0..1) squashes it horizontally to fake the beat.
function drawWing(
  c: CanvasRenderingContext2D,
  s: number,
  side: 1 | -1,
  flap: number,
  fill: string,
  accent: string
) {
  c.save();
  c.scale(side * flap, 1);
  // Upper (larger) wing lobe.
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(s * 1.5, -s * 1.5, s * 1.7, -s * 0.4);
  c.quadraticCurveTo(s * 1.8, s * 0.1, s * 0.9, s * 0.2);
  c.quadraticCurveTo(s * 0.3, s * 0.2, 0, 0);
  c.fill();
  // Lower (smaller) wing lobe.
  c.beginPath();
  c.moveTo(0, s * 0.1);
  c.quadraticCurveTo(s * 1.1, s * 0.7, s * 1.0, s * 1.5);
  c.quadraticCurveTo(s * 0.7, s * 1.7, s * 0.3, s * 1.1);
  c.quadraticCurveTo(s * 0.1, s * 0.6, 0, s * 0.1);
  c.fill();
  // Bright inner accent for a two-tone wing.
  c.fillStyle = accent;
  c.beginPath();
  c.ellipse(s * 0.85, -s * 0.45, s * 0.4, s * 0.28, -0.4, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export function ButterflyGarden({ params }: { params: EffectProps }) {
  const count = Math.max(1, Math.round(Number(params.count ?? 18)));
  const speed = Number(params.speed ?? 1);
  const wingFlap = Number(params.wingFlap ?? 1);
  const sizeScale = Number(params.size ?? 1);
  const pointerMode = String(params.pointer ?? "attract") as PointerMode;
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const flock = new Pool<Butterfly>(Math.max(count, 64), makeButterfly);

      const reset = (b: Butterfly, anywhere: boolean) => {
        const t = Math.random();
        b.x = anywhere ? Math.random() * width : -40 - Math.random() * 80;
        b.y = Math.random() * height;
        const dir = Math.random() * Math.PI * 2;
        const base = 22 + Math.random() * 26;
        b.vx = Math.cos(dir) * base;
        b.vy = Math.sin(dir) * base * 0.6;
        b.wingPhase = Math.random() * Math.PI * 2;
        b.wingSpeed = 7 + Math.random() * 6;
        b.size = (5 + Math.random() * 6) * sizeScale;
        b.opacity = 0.55 + Math.random() * 0.4;
        b.hue = paletteHue(mode, hue, hue2, t) + (Math.random() * 18 - 9);
        b.wander = Math.random() * Math.PI * 2;
        b.wanderSpeed = 0.5 + Math.random() * 0.9;
        b.bob = Math.random() * Math.PI * 2;
      };

      for (let i = 0; i < count; i++) {
        flock.spawn((b) => reset(b, true));
      }

      let px = -9999;
      let py = -9999;
      let pointerActive = false;

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            pointerActive = false;
            return;
          }
          px = x;
          py = y;
          pointerActive = true;
        },
        draw: (c, dt, t) => {
          flock.forEach((b) => {
            // Gentle wandering heading nudges the velocity each frame.
            b.wander += (Math.random() - 0.5) * b.wanderSpeed * dt * 6;
            const wanderForce = 14;
            b.vx += Math.cos(b.wander) * wanderForce * dt;
            b.vy += Math.sin(b.wander) * wanderForce * dt;

            // Pointer attraction / repulsion within a soft radius.
            if (pointerActive && pointerMode !== "ignore") {
              const dx = px - b.x;
              const dy = py - b.y;
              const dist = Math.hypot(dx, dy) || 1;
              const radius = 220;
              if (dist < radius) {
                const pull = (1 - dist / radius) * 320 * dt;
                const sign = pointerMode === "attract" ? 1 : -1;
                b.vx += (dx / dist) * pull * sign;
                b.vy += (dy / dist) * pull * sign;
              }
            }

            // Damping keeps the flight loose but bounded.
            b.vx *= 0.96;
            b.vy *= 0.96;

            const sp = speed;
            b.x += b.vx * sp * dt * 1.2;
            b.y += b.vy * sp * dt * 1.2 + Math.sin(t * 1.6 + b.bob) * 8 * dt;

            // Wrap around the edges so the garden stays populated.
            const m = b.size * 3;
            if (b.x < -m) b.x = width + m;
            if (b.x > width + m) b.x = -m;
            if (b.y < -m) b.y = height + m;
            if (b.y > height + m) b.y = -m;

            const flap = Math.abs(
              Math.cos(t * b.wingSpeed * wingFlap + b.wingPhase)
            );
            const headAngle = Math.atan2(b.vy, b.vx) + Math.PI / 2;

            const fill = `hsl(${b.hue}, 78%, 64%)`;
            const accent = `hsl(${b.hue}, 92%, 82%)`;

            c.save();
            c.translate(b.x, b.y);
            c.rotate(headAngle);
            c.globalAlpha = b.opacity;

            const s = b.size;
            // Wings flap between near-flat (0.15) and fully open (1).
            const open = 0.15 + flap * 0.85;
            drawWing(c, s, 1, open, fill, accent);
            drawWing(c, s, -1, open, fill, accent);

            // Body.
            c.globalAlpha = b.opacity;
            c.fillStyle = "rgba(40, 32, 28, 0.75)";
            c.beginPath();
            c.ellipse(0, s * 0.35, s * 0.16, s * 0.8, 0, 0, Math.PI * 2);
            c.fill();
            // Tiny antennae.
            c.strokeStyle = "rgba(40, 32, 28, 0.6)";
            c.lineWidth = Math.max(0.6, s * 0.06);
            c.beginPath();
            c.moveTo(0, -s * 0.35);
            c.quadraticCurveTo(-s * 0.3, -s * 0.9, -s * 0.5, -s * 0.95);
            c.moveTo(0, -s * 0.35);
            c.quadraticCurveTo(s * 0.3, -s * 0.9, s * 0.5, -s * 0.95);
            c.stroke();

            c.restore();
          });

          c.globalAlpha = 1;
        },
      };
    },
    [count, speed, wingFlap, sizeScale, pointerMode, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
