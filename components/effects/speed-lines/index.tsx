"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Line {
  /** Radial: angle in radians. Horizontal: unused. */
  angle: number;
  /** Leading-edge coordinate: distance from focus (radial) or x (horizontal). */
  pos: number;
  /** Fixed vertical position for horizontal mode. */
  y: number;
  len: number;
  width: number;
  speed: number;
  hue: number;
}

function makeLine(): Line {
  return { angle: 0, pos: 0, y: 0, len: 0, width: 1, speed: 0, hue: 0 };
}

interface Ink {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

function makeInk(): Ink {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0 };
}

export function SpeedLines({ params }: { params: EffectProps }) {
  const mode = String(params.mode ?? "radial");
  const density = Math.max(1, Math.round(Number(params.density ?? 60)));
  const speed = Number(params.speed ?? 1);
  const thickness = Number(params.thickness ?? 2);
  const inkOn = Boolean(params.ink ?? true);
  const { mode: cmode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const lines = new Pool<Line>(400, makeLine);
      const inks = new Pool<Ink>(600, makeInk);

      // Near-monochrome for "single" (classic manga white streaks); vivid otherwise.
      const sat = cmode === "single" ? 14 : 90;
      const light = cmode === "single" ? 94 : 64;

      const maxR = Math.hypot(width, height);
      const innerR = Math.min(width, height) * 0.12;

      let focusX = width * 0.5;
      let focusY = height * 0.5;
      let seeded = false;
      let autoInk = 1.5 + Math.random() * 2;

      const resetLine = (l: Line, initial: boolean) => {
        const t = Math.random();
        l.hue = paletteHue(cmode, hue, hue2, t);
        l.width = thickness * (0.35 + Math.random() * 1.3);
        if (mode === "horizontal") {
          l.angle = 0;
          l.y = Math.random() * height;
          l.len = 40 + Math.random() * 200;
          l.speed = (200 + Math.random() * 520) * speed;
          l.pos = initial ? Math.random() * width : -Math.random() * 240;
        } else {
          l.angle = Math.random() * Math.PI * 2;
          l.len = 30 + Math.random() * 150;
          l.speed = (150 + Math.random() * 360) * speed * (0.6 + Math.random());
          l.pos = initial
            ? innerR + Math.random() * (maxR - innerR)
            : innerR + Math.random() * 24;
        }
      };

      const seed = () => {
        lines.clear();
        for (let i = 0; i < density; i++) lines.spawn((l) => resetLine(l, true));
      };

      const splat = (cx: number, cy: number) => {
        const big = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < big; i++) {
          inks.spawn((p) => {
            p.x = cx;
            p.y = cy;
            p.vx = (Math.random() - 0.5) * 40;
            p.vy = (Math.random() - 0.5) * 40;
            p.life = 1;
            p.maxLife = 0.5 + Math.random() * 0.5;
            p.size = 14 + Math.random() * 30;
            p.hue = paletteHue(cmode, hue, hue2, Math.random());
          });
        }
        const drops = 14 + Math.floor(Math.random() * 12);
        for (let i = 0; i < drops; i++) {
          inks.spawn((p) => {
            const a = Math.random() * Math.PI * 2;
            const v = 80 + Math.random() * 360;
            p.x = cx;
            p.y = cy;
            p.vx = Math.cos(a) * v;
            p.vy = Math.sin(a) * v;
            p.life = 1;
            p.maxLife = 0.4 + Math.random() * 0.6;
            p.size = 2 + Math.random() * 7;
            p.hue = paletteHue(cmode, hue, hue2, Math.random());
          });
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type !== "down") return;
          if (mode === "radial") {
            focusX = x;
            focusY = y;
          }
          if (inkOn) splat(x, y);
        },
        draw: (c, dt) => {
          if (!seeded) {
            seed();
            seeded = true;
          }

          if (inkOn) {
            autoInk -= dt;
            if (autoInk <= 0) {
              autoInk = 2.4 + Math.random() * 2.6;
              splat(
                width * (0.2 + Math.random() * 0.6),
                height * (0.2 + Math.random() * 0.6)
              );
            }
          }

          c.globalCompositeOperation = "lighter";
          c.lineCap = "round";

          lines.update((l) => {
            l.pos += l.speed * dt;
            if (mode === "horizontal") {
              if (l.pos - l.len > width) resetLine(l, false);
            } else if (l.pos - l.len > maxR) {
              resetLine(l, false);
            }
            return true;
          });

          lines.forEach((l) => {
            let x0: number;
            let y0: number;
            let x1: number;
            let y1: number;
            if (mode === "horizontal") {
              x1 = l.pos;
              y1 = l.y;
              x0 = l.pos - l.len;
              y0 = l.y;
            } else {
              const dx = Math.cos(l.angle);
              const dy = Math.sin(l.angle);
              const head = l.pos;
              const tail = Math.max(innerR, l.pos - l.len);
              x1 = focusX + dx * head;
              y1 = focusY + dy * head;
              x0 = focusX + dx * tail;
              y0 = focusY + dy * tail;
            }
            const grad = c.createLinearGradient(x0, y0, x1, y1);
            grad.addColorStop(0, `hsla(${l.hue}, ${sat}%, ${light}%, 0)`);
            grad.addColorStop(1, `hsla(${l.hue}, ${sat}%, ${light}%, 0.9)`);
            c.strokeStyle = grad;
            c.lineWidth = l.width;
            c.beginPath();
            c.moveTo(x0, y0);
            c.lineTo(x1, y1);
            c.stroke();
          });

          inks.update((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.9;
            p.vy *= 0.9;
            p.vy += 40 * dt;
            p.life -= dt / p.maxLife;
            return p.life > 0;
          });
          inks.forEach((p) => {
            const a = Math.max(0, p.life);
            const r = p.size * (0.6 + (1 - a) * 0.6);
            const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, `hsla(${p.hue}, ${sat}%, ${light}%, ${a * 0.85})`);
            g.addColorStop(1, `hsla(${p.hue}, ${sat}%, ${light}%, 0)`);
            c.fillStyle = g;
            c.beginPath();
            c.arc(p.x, p.y, r, 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.lineCap = "butt";
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [mode, density, speed, thickness, inkOn, cmode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
