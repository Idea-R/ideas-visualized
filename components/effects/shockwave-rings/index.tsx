"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Ring {
  x: number;
  y: number;
  scale: number; // current radius multiplier (px)
  rot: number;
  alpha: number;
  petals: number; // curve complexity
  expand: number; // expansion px/s
  hue: number;
  t: number; // per-ring spectrum slice for rainbow mode
  lineWidth: number;
  kind: number; // 0 rose, 1 lemniscate, 2 circle
}

function makeRing(): Ring {
  return {
    x: 0,
    y: 0,
    scale: 0,
    rot: 0,
    alpha: 1,
    petals: 5,
    expand: 260,
    hue: 190,
    t: 0,
    lineWidth: 2,
    kind: 0,
  };
}

const STEPS = 180;

// Polar radius for the chosen curve, normalized to ~[0,1].
function polarRadius(kind: number, petals: number, theta: number): number {
  if (kind === 2) return 1; // circle
  if (kind === 1) return Math.sqrt(Math.abs(Math.cos(2 * theta))); // lemniscate
  return Math.abs(Math.cos((petals / 2) * theta)); // rose
}

export function ShockwaveRings({ params }: { params: EffectProps }) {
  const shape = String(params.shape);
  const petals = Math.round(Number(params.petals));
  const speed = Number(params.speed);
  const { mode, hue, hue2 } = readPalette(params);
  const spin = Number(params.spin ?? 0.6);
  const spinDir = String(params.spinDir ?? "cw") === "ccw" ? -1 : 1;

  const kind = shape === "circle" ? 2 : shape === "lemniscate" ? 1 : 0;

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const rings = new Pool<Ring>(64, makeRing);
      let autoTimer = 0.2;

      const emit = (x: number, y: number) => {
        rings.spawn((r) => {
          r.x = x;
          r.y = y;
          r.scale = 0;
          r.rot = Math.random() * Math.PI * 2;
          r.alpha = 1;
          r.petals = petals;
          r.expand = speed;
          r.hue = hue;
          r.t = Math.random();
          r.lineWidth = 1.5 + Math.random() * 1.5;
          r.kind = kind;
        });
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") emit(x, y);
        },
        draw: (c, dt) => {
          // Opaque stage first (clearMode "full" leaves it transparent).
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Auto-emit from the center on an interval.
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = 0.9 + Math.random() * 0.5;
            emit(width * 0.5, height * 0.5);
          }

          c.globalCompositeOperation = "lighter";
          c.lineJoin = "round";
          c.lineCap = "round";

          rings.update((r) => {
            r.scale += r.expand * dt;
            r.rot += spin * spinDir * dt;
            r.alpha -= dt * 0.45;
            return r.alpha > 0;
          });

          rings.forEach((r) => {
            const a = Math.max(0, r.alpha);
            c.save();
            c.globalAlpha = a;
            c.translate(r.x, r.y);
            c.rotate(r.rot);

            const grad = c.createLinearGradient(
              -r.scale,
              -r.scale,
              r.scale,
              r.scale
            );
            const t0 = mode === "rainbow" ? r.t : 0;
            const t1 = mode === "rainbow" ? r.t + 0.12 : 1;
            grad.addColorStop(0, `hsl(${Math.round(paletteHue(mode, hue, hue2, t0))}, 95%, 60%)`);
            grad.addColorStop(1, `hsl(${Math.round(paletteHue(mode, hue, hue2, t1))}, 95%, 62%)`);
            c.strokeStyle = grad;
            c.lineWidth = r.lineWidth;

            c.beginPath();
            for (let i = 0; i <= STEPS; i++) {
              const t = (i / STEPS) * Math.PI * 2;
              const radius = polarRadius(r.kind, r.petals, t) * r.scale;
              const x = Math.cos(t) * radius;
              const y = Math.sin(t) * radius;
              if (i === 0) c.moveTo(x, y);
              else c.lineTo(x, y);
            }
            c.stroke();
            c.restore();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [kind, petals, speed, mode, hue, hue2, spin, spinDir]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
