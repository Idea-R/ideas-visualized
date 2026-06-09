"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
}

function makeSpark(): Spark {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, hue: 0, size: 2 };
}

interface Shape {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
  kind: number; // 0 square, 1 triangle, 2 circle, 3 diamond
}

function makeShape(): Shape {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    spin: 0,
    size: 10,
    life: 0,
    maxLife: 1,
    hue: 0,
    kind: 0,
  };
}

interface Emitter {
  x: number;
  y: number;
  angleMin: number;
  angleMax: number;
  punch: number; // density multiplier (bottom corners hit harder)
  acc: number; // fractional spawn accumulator
}

export function CornerFireworks({ params }: { params: EffectProps }) {
  const intensity = Number(params.intensity);
  const gravity = Number(params.gravity);
  const corners = String(params.corners);
  const shapesOn = Boolean(params.shapes);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const sparks = new Pool<Spark>(3200, makeSpark);
      const shapes = new Pool<Shape>(160, makeShape);

      // Corner cannons, each aiming inward (canvas y is down, so "up" = negative).
      const all: Emitter[] = [
        // bottom-left → up-right
        { x: 0, y: height, angleMin: -Math.PI / 2, angleMax: 0, punch: 1.5, acc: 0 },
        // bottom-right → up-left
        { x: width, y: height, angleMin: -Math.PI, angleMax: -Math.PI / 2, punch: 1.5, acc: 0 },
        // top-left → down-right
        { x: 0, y: 0, angleMin: 0, angleMax: Math.PI / 2, punch: 1, acc: 0 },
        // top-right → down-left
        { x: width, y: 0, angleMin: Math.PI / 2, angleMax: Math.PI, punch: 1, acc: 0 },
      ];
      const emitters =
        corners === "bottom"
          ? all.slice(0, 2)
          : corners === "top"
            ? all.slice(2, 4)
            : all;

      // Single → classic two-tone palette derived from hue (magenta + cyan at
      // default 300). Dual alternates the user's two hues; Rainbow spreads color
      // across the emission angle `t` so the show goes multicolor.
      const pickHue = (t: number) => {
        if (mode === "rainbow") {
          return paletteHue(mode, hue, hue2, t) + (Math.random() - 0.5) * 20;
        }
        if (mode === "dual") {
          return (Math.random() < 0.5 ? hue : hue2) + (Math.random() - 0.5) * 28;
        }
        const hueA = hue;
        const hueB = (hue + 160) % 360;
        return (Math.random() < 0.5 ? hueA : hueB) + (Math.random() - 0.5) * 28;
      };

      const spawnSpark = (e: Emitter, beat: number) => {
        sparks.spawn((p) => {
          const angle = e.angleMin + Math.random() * (e.angleMax - e.angleMin);
          const speed = (160 + Math.random() * 230) * (0.6 + beat * 0.6);
          p.x = e.x;
          p.y = e.y;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.life = 1;
          p.maxLife = 0.85 + Math.random() * 0.8;
          p.hue = pickHue(angle / (Math.PI * 2));
          p.size = 1.5 + Math.random() * 2.2;
        });
      };

      const spawnShape = (x: number, y: number, angle: number, fast: boolean) => {
        shapes.spawn((s) => {
          const speed = (fast ? 140 : 90) + Math.random() * 130;
          s.x = x;
          s.y = y;
          s.vx = Math.cos(angle) * speed;
          s.vy = Math.sin(angle) * speed;
          s.rot = Math.random() * Math.PI * 2;
          s.spin = (Math.random() - 0.5) * 6;
          s.size = 8 + Math.random() * 14;
          s.life = 1;
          s.maxLife = 1.4 + Math.random() * 1.1;
          s.hue = pickHue(angle / (Math.PI * 2));
          s.kind = Math.floor(Math.random() * 4);
        });
      };

      const shapeBurst = (x: number, y: number, count: number) => {
        for (let i = 0; i < count; i++) {
          spawnShape(x, y, Math.random() * Math.PI * 2, true);
        }
      };

      const cursorBurst = (x: number, y: number) => {
        const n = Math.round(70 * intensity);
        for (let i = 0; i < n; i++) {
          sparks.spawn((p) => {
            const a = Math.random() * Math.PI * 2;
            const speed = (120 + Math.random() * 280) * (0.6 + intensity * 0.3);
            p.x = x;
            p.y = y;
            p.vx = Math.cos(a) * speed;
            p.vy = Math.sin(a) * speed - 40;
            p.life = 1;
            p.maxLife = 0.7 + Math.random() * 0.8;
            p.hue = pickHue(a / (Math.PI * 2));
            p.size = 1.5 + Math.random() * 2.4;
          });
        }
        if (shapesOn) shapeBurst(x, y, 8 + Math.floor(Math.random() * 7));
      };

      // Synthetic "beat": a steady pulse plus occasional random peaks.
      let peakEnv = 0;
      let peakTimer = 0.6;

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") cursorBurst(x, y);
        },
        draw: (c, dt, t) => {
          // Drive the rhythm.
          const pulse = Math.sin(t * 3.1) * 0.5 + 0.5;
          peakTimer -= dt;
          let firedPeak = false;
          if (peakTimer <= 0) {
            peakTimer = 0.45 + Math.random() * 1.1;
            peakEnv = 1;
            firedPeak = true;
          }
          peakEnv = Math.max(0, peakEnv - dt * 2.4);
          const beat = Math.min(1.5, (pulse * 0.45 + peakEnv * 0.95) * intensity);

          // Opaque dark stage (full clear leaves the canvas transparent).
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Feed the corner cannons proportional to the beat.
          for (const e of emitters) {
            e.acc += beat * e.punch * 520 * dt;
            while (e.acc >= 1) {
              spawnSpark(e, beat);
              e.acc -= 1;
            }
            // Constant gentle trickle of shapes.
            if (shapesOn && Math.random() < 0.12 * intensity) {
              const a = e.angleMin + Math.random() * (e.angleMax - e.angleMin);
              spawnShape(e.x, e.y, a, false);
            }
            // Punchy shape burst out of each cannon on a strong peak.
            if (shapesOn && firedPeak && beat > 0.7) {
              const burst = 4 + Math.floor(Math.random() * 5);
              for (let i = 0; i < burst; i++) {
                const a = e.angleMin + Math.random() * (e.angleMax - e.angleMin);
                spawnShape(e.x, e.y, a, true);
              }
            }
          }

          const g = gravity * 340;

          c.globalCompositeOperation = "lighter";

          // Fountain sparks.
          sparks.update((p) => {
            p.vy += g * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.992;
            p.life -= dt / p.maxLife;
            return p.life > 0 && p.y < height + 40;
          });
          sparks.forEach((p) => {
            const a = Math.max(0, p.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${p.hue}, 100%, ${60 + a * 18}%)`;
            c.beginPath();
            c.arc(p.x, p.y, p.size * (0.5 + a * 0.6), 0, Math.PI * 2);
            c.fill();
          });

          // Spinning wireframe geometric shapes.
          shapes.update((s) => {
            s.vy += g * 0.35 * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vx *= 0.985;
            s.vy *= 0.985;
            s.rot += s.spin * dt;
            s.life -= dt / s.maxLife;
            return s.life > 0;
          });
          shapes.forEach((s) => {
            const a = Math.max(0, s.life);
            c.save();
            c.globalAlpha = a * a;
            c.translate(s.x, s.y);
            c.rotate(s.rot);
            c.strokeStyle = `hsl(${s.hue}, 100%, 66%)`;
            c.lineWidth = 2;
            const r = s.size;
            if (s.kind === 0) {
              c.strokeRect(-r * 0.5, -r * 0.5, r, r);
            } else if (s.kind === 1) {
              c.beginPath();
              c.moveTo(0, -r * 0.6);
              c.lineTo(r * 0.55, r * 0.45);
              c.lineTo(-r * 0.55, r * 0.45);
              c.closePath();
              c.stroke();
            } else if (s.kind === 2) {
              c.beginPath();
              c.arc(0, 0, r * 0.55, 0, Math.PI * 2);
              c.stroke();
            } else {
              c.beginPath();
              c.moveTo(0, -r * 0.6);
              c.lineTo(r * 0.6, 0);
              c.lineTo(0, r * 0.6);
              c.lineTo(-r * 0.6, 0);
              c.closePath();
              c.stroke();
            }
            c.restore();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [intensity, gravity, corners, shapesOn, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
