"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeBeam(): Beam {
  return { x1: 0, y1: 0, x2: 0, y2: 0, width: 0, life: 0, maxLife: 1, hue: 0 };
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

function makeSpark(): Spark {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0 };
}

export function LaserBeam({ params }: { params: EffectProps }) {
  const beamWidth = Number(params.beamWidth ?? 4);
  const fadeSpeed = Number(params.fadeSpeed ?? 1);
  const fireRate = Number(params.fireRate ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const beams = new Pool<Beam>(64, makeBeam);
      const sparks = new Pool<Spark>(1200, makeSpark);
      let autoTimer = 0;
      let seeded = false;
      // Tracked pointer; targets drift so auto-fired beams feel alive.
      let pointerX = width * 0.5;
      let pointerY = height * 0.5;

      // Origins ring the edges + center so beams converge from everywhere.
      const origins = () => [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: 0, y: height },
        { x: width, y: height },
        { x: width * 0.5, y: 0 },
        { x: width * 0.5, y: height },
        { x: 0, y: height * 0.5 },
        { x: width, y: height * 0.5 },
        { x: width * 0.5, y: height * 0.5 },
      ];

      const spawnImpact = (x: number, y: number, h: number, count: number) => {
        for (let i = 0; i < count; i++) {
          sparks.spawn((sp) => {
            const a = Math.random() * Math.PI * 2;
            const v = 60 + Math.random() * 320;
            sp.x = x;
            sp.y = y;
            sp.vx = Math.cos(a) * v;
            sp.vy = Math.sin(a) * v;
            sp.size = 1 + Math.random() * 2.4;
            sp.life = 1;
            sp.maxLife = 0.25 + Math.random() * 0.4;
            sp.hue = h + (Math.random() - 0.5) * 34;
          });
        }
      };

      const fire = (
        ox: number,
        oy: number,
        tx: number,
        ty: number,
        t: number
      ) => {
        const h = paletteHue(mode, hue, hue2, t);
        beams.spawn((b) => {
          b.x1 = ox;
          b.y1 = oy;
          b.x2 = tx;
          b.y2 = ty;
          b.width = beamWidth;
          b.life = 1;
          // ~200ms beam life (matching the source tween), scaled by fade speed.
          b.maxLife = 0.2 / Math.max(0.2, fadeSpeed);
          b.hue = h;
        });
        spawnImpact(tx, ty, h, 14);
      };

      const autoFire = () => {
        const o = origins();
        const src = o[Math.floor(Math.random() * o.length)];
        // Drifting target near the tracked pointer, kept on-screen.
        const tx = Math.max(
          12,
          Math.min(width - 12, pointerX + (Math.random() - 0.5) * width * 0.5)
        );
        const ty = Math.max(
          12,
          Math.min(height - 12, pointerY + (Math.random() - 0.5) * height * 0.5)
        );
        fire(src.x, src.y, tx, ty, Math.random());
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "move" || type === "down") {
            pointerX = x;
            pointerY = y;
          }
          if (type === "down") {
            const o = origins();
            const src = o[Math.floor(Math.random() * o.length)];
            fire(src.x, src.y, x, y, Math.random());
          }
        },
        draw: (c, dt) => {
          if (!seeded) {
            fire(0, 0, width * 0.5, height * 0.5, 0.5);
            seeded = true;
          }
          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = (0.45 + Math.random() * 0.7) / Math.max(0.2, fireRate);
            autoFire();
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";
          c.lineCap = "round";

          beams.update((b) => {
            b.life -= dt / b.maxLife;
            return b.life > 0;
          });
          beams.forEach((b) => {
            const a = Math.max(0, b.life);
            // Wide colored glow halo underneath.
            c.globalAlpha = a * a * 0.5;
            c.strokeStyle = `hsl(${b.hue}, 100%, 60%)`;
            c.lineWidth = b.width * 4;
            c.beginPath();
            c.moveTo(b.x1, b.y1);
            c.lineTo(b.x2, b.y2);
            c.stroke();

            // Mid colored beam.
            c.globalAlpha = a;
            c.strokeStyle = `hsl(${b.hue}, 100%, 68%)`;
            c.lineWidth = b.width * 1.8;
            c.beginPath();
            c.moveTo(b.x1, b.y1);
            c.lineTo(b.x2, b.y2);
            c.stroke();

            // Bright white-hot core.
            c.globalAlpha = a;
            c.strokeStyle = `hsla(${b.hue}, 100%, 95%, ${0.6 + a * 0.4})`;
            c.lineWidth = Math.max(1, b.width * 0.55);
            c.beginPath();
            c.moveTo(b.x1, b.y1);
            c.lineTo(b.x2, b.y2);
            c.stroke();

            // Endpoint impact flare.
            const flare = b.width * (2.4 + a * 3.5);
            const grad = c.createRadialGradient(
              b.x2,
              b.y2,
              0,
              b.x2,
              b.y2,
              flare
            );
            grad.addColorStop(0, `hsla(${b.hue}, 100%, 96%, ${a})`);
            grad.addColorStop(0.4, `hsla(${b.hue}, 100%, 65%, ${a * 0.6})`);
            grad.addColorStop(1, `hsla(${b.hue}, 100%, 60%, 0)`);
            c.globalAlpha = 1;
            c.fillStyle = grad;
            c.beginPath();
            c.arc(b.x2, b.y2, flare, 0, Math.PI * 2);
            c.fill();
          });

          sparks.update((sp) => {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.vx *= 0.9;
            sp.vy *= 0.9;
            sp.life -= dt / sp.maxLife;
            return sp.life > 0;
          });
          sparks.forEach((sp) => {
            const a = Math.max(0, sp.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${sp.hue}, 100%, 72%)`;
            c.beginPath();
            c.arc(sp.x, sp.y, sp.size * (0.3 + a * 0.8), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.lineCap = "butt";
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [beamWidth, fadeSpeed, fireRate, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
