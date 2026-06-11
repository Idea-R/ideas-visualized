"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import { Pool } from "@/lib/effects/pool";
import type { EffectProps } from "@/lib/effects/types";

type PetalShape = "petal" | "sakura" | "heart";

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmp: number;
  hue: number;
}

const MAX_PETALS = 600;

export function PetalCursor({ params }: { params: EffectProps }) {
  const shape = String(params.shape ?? "petal") as PetalShape;
  const spawnRate = Number(params.spawnRate ?? 1);
  const sizeScale = Number(params.size ?? 1);
  const fall = Number(params.fall ?? 1);
  const sway = Number(params.sway ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const pool = new Pool<Petal>(MAX_PETALS, () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 8,
        rotation: 0,
        rotSpeed: 0,
        life: 0,
        maxLife: 1,
        swayPhase: 0,
        swaySpeed: 1,
        swayAmp: 1,
        hue: 0,
      }));

      const spawn = (x: number, y: number, energy: number) => {
        pool.spawn((p) => {
          p.x = x + (Math.random() - 0.5) * 8;
          p.y = y + (Math.random() - 0.5) * 8;
          p.vx = (Math.random() - 0.5) * 30 * energy;
          p.vy = (10 + Math.random() * 25) * energy;
          p.size = (6 + Math.random() * 8) * sizeScale;
          p.rotation = Math.random() * Math.PI * 2;
          p.rotSpeed = (Math.random() - 0.5) * 1.6;
          p.life = 0;
          p.maxLife = 2.5 + Math.random() * 2;
          p.swayPhase = Math.random() * Math.PI * 2;
          p.swaySpeed = 1 + Math.random() * 1.5;
          p.swayAmp = 18 + Math.random() * 22;
          p.hue = paletteHue(mode, hue, hue2, Math.random()) + (Math.random() * 14 - 7);
        });
      };

      // Ambient petal: long-lived, drifts the full height with sway. `atTop`
      // spawns it just above the canvas; otherwise it's scattered in view so
      // the very first frame already reads as a calm petal fall.
      const spawnAmbient = (atTop: boolean) => {
        pool.spawn((p) => {
          p.x = Math.random() * width;
          p.y = atTop ? -10 - Math.random() * 20 : Math.random() * height;
          p.vx = (Math.random() - 0.5) * 16;
          p.vy = 12 + Math.random() * 22;
          p.size = (6 + Math.random() * 8) * sizeScale;
          p.rotation = Math.random() * Math.PI * 2;
          p.rotSpeed = (Math.random() - 0.5) * 1.2;
          p.maxLife = (height / Math.max(1, p.vy)) * 1.2 + 2;
          // Scattered seed petals get a head start so they're already past
          // fade-in (and below the top edge) on the first rendered frame.
          p.life = atTop ? 0 : 0.3 + Math.random() * p.maxLife * 0.45;
          p.y = atTop ? p.y : p.life * p.vy;
          p.swayPhase = Math.random() * Math.PI * 2;
          p.swaySpeed = 0.8 + Math.random() * 1.2;
          p.swayAmp = 18 + Math.random() * 24;
          p.hue = paletteHue(mode, hue, hue2, Math.random()) + (Math.random() * 14 - 7);
        });
      };

      // Seed the canvas so a static screenshot is never an empty black box.
      const seed = Math.round(10 * Math.min(2, Math.max(0.4, spawnRate)));
      for (let i = 0; i < seed; i++) spawnAmbient(false);

      const burst = (x: number, y: number) => {
        const count = 14;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 90;
          pool.spawn((p) => {
            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed - 20;
            p.size = (6 + Math.random() * 9) * sizeScale;
            p.rotation = Math.random() * Math.PI * 2;
            p.rotSpeed = (Math.random() - 0.5) * 2.4;
            p.life = 0;
            p.maxLife = 2 + Math.random() * 2;
            p.swayPhase = Math.random() * Math.PI * 2;
            p.swaySpeed = 1 + Math.random() * 1.5;
            p.swayAmp = 16 + Math.random() * 20;
            p.hue = paletteHue(mode, hue, hue2, Math.random()) + (Math.random() * 14 - 7);
          });
        }
      };

      const pointer = { x: width / 2, y: height / 2 };
      let lastX = -9999;
      let lastY = -9999;
      let inside = false;
      let spawnTimer = 0;
      let idleTimer = 0;

      const drawPetal = (c: CanvasRenderingContext2D, p: Petal, alpha: number) => {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rotation);
        c.globalAlpha = alpha;

        const s = p.size;
        const fill = `hsl(${p.hue}, 80%, 76%)`;
        const highlight = `hsl(${p.hue}, 90%, 88%)`;

        switch (shape) {
          case "petal": {
            c.beginPath();
            c.ellipse(0, 0, s * 0.5, s, 0, 0, Math.PI * 2);
            c.fillStyle = fill;
            c.fill();
            c.beginPath();
            c.ellipse(-s * 0.12, -s * 0.25, s * 0.22, s * 0.5, 0.2, 0, Math.PI * 2);
            c.fillStyle = highlight;
            c.fill();
            break;
          }
          case "sakura": {
            for (let lobe = 0; lobe < 5; lobe++) {
              const angle = (lobe / 5) * Math.PI * 2;
              c.beginPath();
              c.ellipse(
                Math.cos(angle) * s * 0.4,
                Math.sin(angle) * s * 0.4,
                s * 0.32,
                s * 0.55,
                angle + Math.PI / 2,
                0,
                Math.PI * 2
              );
              c.fillStyle = fill;
              c.fill();
            }
            c.beginPath();
            c.arc(0, 0, s * 0.18, 0, Math.PI * 2);
            c.fillStyle = "hsl(45, 90%, 80%)";
            c.fill();
            break;
          }
          case "heart": {
            const h = s * 0.5;
            c.beginPath();
            c.moveTo(0, h * 0.6);
            c.bezierCurveTo(-h, -h * 0.6, -h * 2, h * 0.6, 0, h * 2.2);
            c.bezierCurveTo(h * 2, h * 0.6, h, -h * 0.6, 0, h * 0.6);
            c.fillStyle = fill;
            c.fill();
            break;
          }
          default: {
            const _exhaustive: never = shape;
            return _exhaustive;
          }
        }

        c.restore();
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            inside = false;
            lastX = -9999;
            lastY = -9999;
            return;
          }
          pointer.x = x;
          pointer.y = y;
          inside = true;
          if (type === "down") burst(x, y);
        },
        draw: (c, dt, t) => {
          // Trail spawn: emit while the pointer is moving.
          let moved = 0;
          if (inside && lastX > -9999) {
            const dx = pointer.x - lastX;
            const dy = pointer.y - lastY;
            moved = Math.hypot(dx, dy);
          }
          lastX = pointer.x;
          lastY = pointer.y;

          // Always-on ambient fall from the top edge, modest density scaled by
          // spawnRate. Runs whether or not the pointer has ever moved.
          idleTimer += dt;
          const ambientInterval = 0.35 / Math.max(0.2, spawnRate);
          while (idleTimer >= ambientInterval) {
            idleTimer -= ambientInterval;
            spawnAmbient(true);
          }

          // Pointer trail: stream extra petals from the cursor while it moves.
          if (inside && moved > 1.5) {
            spawnTimer += dt;
            const interval = 0.05 / Math.max(0.2, spawnRate);
            while (spawnTimer >= interval) {
              spawnTimer -= interval;
              spawn(pointer.x, pointer.y, 0.8 + Math.random() * 0.4);
            }
          }

          const g = 60 * fall;
          const drag = Math.pow(0.9, dt * 60);
          pool.update((p) => {
            p.life += dt;
            const swayX = Math.sin(t * p.swaySpeed + p.swayPhase) * p.swayAmp * sway;
            p.vx *= drag;
            p.vy += g * dt;
            p.x += (p.vx + swayX) * dt;
            p.y += p.vy * dt;
            p.rotation += p.rotSpeed * dt;
            return p.life < p.maxLife && p.y < height + 40;
          });

          pool.forEach((p) => {
            const fadeIn = Math.min(1, p.life * 6);
            const fadeOut = 1 - Math.max(0, (p.life - p.maxLife * 0.6) / (p.maxLife * 0.4));
            const alpha = Math.max(0, Math.min(0.9, fadeIn * fadeOut * 0.9));
            if (alpha <= 0.01) return;
            drawPetal(c, p, alpha);
          });

          c.globalAlpha = 1;
        },
      };
    },
    [shape, spawnRate, sizeScale, fall, sway, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
