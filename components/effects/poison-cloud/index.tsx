"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Blob {
  /** Cluster center this blob orbits. */
  cx: number;
  cy: number;
  /** Orbit radius and angular speed. */
  orbit: number;
  orbitSpeed: number;
  phase: number;
  /** Base radius and how much it pulses. */
  baseRadius: number;
  pulse: number;
  pulseSpeed: number;
  hue: number;
  life: number;
  maxLife: number;
  /** Drift applied to the cluster center. */
  driftX: number;
  driftY: number;
}

function makeBlob(): Blob {
  return {
    cx: 0,
    cy: 0,
    orbit: 0,
    orbitSpeed: 0,
    phase: 0,
    baseRadius: 0,
    pulse: 0,
    pulseSpeed: 0,
    hue: 0,
    life: 0,
    maxLife: 1,
    driftX: 0,
    driftY: 0,
  };
}

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  life: number;
  maxLife: number;
}

function makeBubble(): Bubble {
  return { x: 0, y: 0, vx: 0, vy: 0, size: 1, hue: 0, life: 0, maxLife: 1 };
}

export function PoisonCloud({ params }: { params: EffectProps }) {
  const clouds = Math.max(1, Math.round(Number(params.clouds ?? 4)));
  const drift = Number(params.drift ?? 1);
  const bubbleRate = Number(params.bubbleRate ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const blobs = new Pool<Blob>(420, makeBlob);
      const bubbles = new Pool<Bubble>(700, makeBubble);
      let autoTimer = 0;
      let bubbleTimer = 0;
      let seeded = false;

      // Spawn one cluster of overlapping orbiting blobs at (cx, cy).
      const spawnCloud = (cx: number, cy: number) => {
        const blobCount = 5 + Math.floor(Math.random() * 3);
        const dx = (Math.random() - 0.5) * 26 * drift;
        const dy = -(8 + Math.random() * 18) * drift;
        const t0 = Math.random();
        for (let i = 0; i < blobCount; i++) {
          blobs.spawn((b) => {
            b.cx = cx;
            b.cy = cy;
            b.orbit = 8 + Math.random() * 26;
            b.orbitSpeed = (0.4 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1);
            b.phase = (i / blobCount) * Math.PI * 2 + Math.random() * 0.5;
            b.baseRadius = 26 + Math.random() * 34;
            b.pulse = 6 + Math.random() * 12;
            b.pulseSpeed = 0.8 + Math.random() * 1.4;
            b.hue =
              paletteHue(mode, hue, hue2, (t0 + i / blobCount) % 1) +
              (Math.random() - 0.5) * 18;
            b.maxLife = 3.4 + Math.random() * 2.6;
            b.life = b.maxLife;
            b.driftX = dx;
            b.driftY = dy;
          });
        }
      };

      const spawnBubble = (cx: number, cy: number, h: number) => {
        bubbles.spawn((bu) => {
          bu.x = cx + (Math.random() - 0.5) * 40;
          bu.y = cy + (Math.random() - 0.5) * 30;
          bu.vx = (Math.random() - 0.5) * 12;
          bu.vy = -(18 + Math.random() * 34);
          bu.size = 2 + Math.random() * 5;
          bu.hue = h + (Math.random() - 0.5) * 20;
          bu.maxLife = 0.7 + Math.random() * 1.1;
          bu.life = bu.maxLife;
        });
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") spawnCloud(x, y);
        },
        draw: (c, dt, t) => {
          if (!seeded) {
            for (let i = 0; i < clouds; i++) {
              spawnCloud(
                width * (0.18 + ((i + 0.5) / clouds) * 0.64),
                height * (0.4 + Math.sin(i * 1.7) * 0.12)
              );
            }
            seeded = true;
          }

          // Keep roughly `clouds` clusters alive (~6 blobs each).
          const blobBudget = clouds * 7;
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = 1.6 + Math.random() * 1.8;
            if (blobs.count < blobBudget) {
              spawnCloud(
                width * (0.2 + Math.random() * 0.6),
                height * (0.3 + Math.random() * 0.5)
              );
            }
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          blobs.update((b) => {
            b.cx += b.driftX * dt;
            b.cy += b.driftY * dt;
            b.life -= dt;
            return b.life > 0;
          });

          bubbleTimer -= dt;
          const bubbleInterval = 0.12 / Math.max(0.05, bubbleRate);
          let emit = false;
          if (bubbleTimer <= 0) {
            bubbleTimer = bubbleInterval;
            emit = true;
          }

          blobs.forEach((b) => {
            const lifeT = b.life / b.maxLife;
            // Fade in quickly, fade out toward end of life.
            const fade = Math.min(1, lifeT * 3) * Math.min(1, (1 - lifeT) * 6 + 0.15);
            const ang = b.phase + t * b.orbitSpeed;
            const bx = b.cx + Math.cos(ang) * b.orbit;
            const by = b.cy + Math.sin(ang) * b.orbit;
            const r = Math.max(
              2,
              b.baseRadius + Math.sin(t * b.pulseSpeed + b.phase) * b.pulse
            );
            const alpha = 0.16 + Math.sin(t * b.pulseSpeed + b.phase) * 0.06;
            const a = Math.max(0, alpha * fade);
            const grad = c.createRadialGradient(bx, by, 0, bx, by, r);
            grad.addColorStop(0, `hsla(${b.hue}, 85%, 55%, ${a})`);
            grad.addColorStop(0.6, `hsla(${b.hue}, 80%, 45%, ${a * 0.5})`);
            grad.addColorStop(1, `hsla(${b.hue}, 80%, 40%, 0)`);
            c.globalAlpha = 1;
            c.fillStyle = grad;
            c.beginPath();
            c.arc(bx, by, r, 0, Math.PI * 2);
            c.fill();

            if (emit && fade > 0.4 && Math.random() < 0.22) {
              spawnBubble(bx, by, b.hue);
            }
          });

          bubbles.update((bu) => {
            bu.x += bu.vx * dt;
            bu.y += bu.vy * dt;
            bu.vy *= 0.985;
            bu.life -= dt;
            return bu.life > 0;
          });
          bubbles.forEach((bu) => {
            const lifeT = Math.max(0, bu.life / bu.maxLife);
            // Bubbles swell as they rise, then pop near the end.
            const grow = 1 + (1 - lifeT) * 0.8;
            const a = lifeT < 0.18 ? lifeT / 0.18 : lifeT;
            c.globalAlpha = a * 0.7;
            c.strokeStyle = `hsl(${bu.hue}, 90%, 72%)`;
            c.lineWidth = 1.4;
            c.beginPath();
            c.arc(bu.x, bu.y, bu.size * grow, 0, Math.PI * 2);
            c.stroke();
            c.globalAlpha = a * 0.4;
            c.fillStyle = `hsl(${bu.hue}, 90%, 60%)`;
            c.beginPath();
            c.arc(bu.x, bu.y, bu.size * grow * 0.6, 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [clouds, drift, bubbleRate, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
