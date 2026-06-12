"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type Variant =
  | "trap_spike"
  | "trap_fire"
  | "trap_poison"
  | "trap_teleport"
  | "portal_swirl"
  | "floor_iris";

// One-shot lifetime per variant, in seconds (before the speed multiplier).
const DURATION: Record<Variant, number> = {
  trap_spike: 1.1,
  trap_fire: 1.3,
  trap_poison: 1.4,
  trap_teleport: 1.1,
  portal_swirl: 1.8,
  floor_iris: 2.4,
};

// Signature colour per variant, used when Color mode is "signature".
const SIGNATURE: Record<Variant, { h: number; s: number; l: number }> = {
  trap_spike: { h: 0, s: 0, l: 70 },
  trap_fire: { h: 22, s: 100, l: 55 },
  trap_poison: { h: 120, s: 85, l: 45 },
  trap_teleport: { h: 275, s: 80, l: 62 },
  portal_swirl: { h: 285, s: 85, l: 70 },
  floor_iris: { h: 32, s: 65, l: 55 },
};

interface Anim {
  variant: Variant;
  x: number;
  y: number;
  age: number;
  maxLife: number;
  dir: number;
  emit: number;
}

function makeAnim(): Anim {
  return { variant: "trap_spike", x: 0, y: 0, age: 0, maxLife: 1, dir: 1, emit: 0 };
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  warm: number; // 0 = orange, 1 = yellow
}

function makeEmber(): Ember {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, warm: 0 };
}

function clampL(l: number): number {
  return Math.max(0, Math.min(98, l));
}

export function TrapsPortals({ params }: { params: EffectProps }) {
  const variant = String(params.variant ?? "trap_spike") as Variant;
  const speed = Number(params.speed);
  const size = Number(params.size);
  const colorMode = String(params.colorMode ?? "signature");
  const { hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const cx = width / 2;
      const cy = height / 2;
      const base = Math.min(width, height) * 0.22 * size;

      const anims = new Pool<Anim>(16, makeAnim);
      const embers = new Pool<Ember>(700, makeEmber);

      const sig = SIGNATURE[variant];
      const tinted = colorMode !== "signature";
      const mode = colorMode as ColorMode;

      const col = (t: number, lightAdj: number, alpha: number): string => {
        if (tinted) {
          return `hsla(${paletteHue(mode, hue, hue2, t)}, 90%, ${clampL(56 + lightAdj)}%, ${alpha})`;
        }
        return `hsla(${sig.h}, ${sig.s}%, ${clampL(sig.l + lightAdj)}%, ${alpha})`;
      };

      const trigger = (x: number, y: number) => {
        anims.spawn((a) => {
          a.variant = variant;
          a.x = x;
          a.y = y;
          a.age = 0;
          a.maxLife = DURATION[variant];
          a.dir = Math.random() < 0.5 ? 1 : -1;
          a.emit = 0;
        });
      };

      // Seed one at center so the very first frame is never blank.
      trigger(cx, cy);
      const interval = () => (DURATION[variant] + 0.3) / Math.max(0.2, speed);
      let autoTimer = interval();

      const drawSpike = (a: Anim, t: number) => {
        const riseT = t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1;
        const n = 5;
        const spread = base * 1.2;
        for (let i = 0; i < n; i++) {
          const sx = a.x - spread / 2 + (i / (n - 1)) * spread;
          const sw = base * 0.18;
          const hgt = riseT * base * 0.9;
          ctx.fillStyle = col(i / n, 0, 0.9);
          ctx.beginPath();
          ctx.moveTo(sx - sw, a.y + base * 0.3);
          ctx.lineTo(sx, a.y + base * 0.3 - hgt);
          ctx.lineTo(sx + sw, a.y + base * 0.3);
          ctx.fill();
          ctx.fillStyle = col(i / n, 24, 0.9 * riseT);
          ctx.beginPath();
          ctx.moveTo(sx - sw * 0.4, a.y + base * 0.3 - hgt * 0.55);
          ctx.lineTo(sx, a.y + base * 0.3 - hgt);
          ctx.lineTo(sx + sw * 0.2, a.y + base * 0.3 - hgt * 0.6);
          ctx.fill();
        }
      };

      const drawPoison = (a: Anim, t: number) => {
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2 + t * 2 * a.dir;
          const r = t * base * 1.3;
          const blob = base * 0.2 + t * base * 0.35;
          ctx.fillStyle = col(i / 7, -4, (1 - t) * 0.4);
          ctx.beginPath();
          ctx.arc(
            a.x + Math.cos(ang) * r,
            a.y + Math.sin(ang) * r,
            blob,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      };

      const drawTeleport = (a: Anim, t: number) => {
        ctx.globalCompositeOperation = "lighter";
        const dots = 12;
        for (let i = 0; i < dots; i++) {
          const ang = t * Math.PI * 6 * a.dir + (i / dots) * Math.PI * 2;
          const r = (1 - t) * base * 0.9;
          const ds = base * 0.06 + (1 - t) * base * 0.05;
          ctx.fillStyle = col(i / dots, 6, 1 - t);
          ctx.beginPath();
          ctx.arc(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r, ds, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      };

      const drawPortal = (a: Anim, t: number, time: number) => {
        const fade = Math.min(1, t * 4) * Math.min(1, (1 - t) * 4);
        const radius = base * 0.9;
        ctx.globalCompositeOperation = "lighter";

        const core = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, radius * 0.7);
        core.addColorStop(0, col(0.2, 12, 0.5 * fade));
        core.addColorStop(1, col(0.2, 0, 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(a.x, a.y, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        const rot = time * 2.2 * a.dir;
        const arms = 3;
        const pts = 16;
        for (let arm = 0; arm < arms; arm++) {
          for (let k = 0; k < pts; k++) {
            const frac = k / pts;
            const ang = rot + arm * ((Math.PI * 2) / arms) + frac * Math.PI * 1.7;
            const rr = radius * frac;
            ctx.fillStyle = col(frac, 6, fade * (1 - frac * 0.45));
            const ds = base * 0.02 + (1 - frac) * base * 0.05;
            ctx.beginPath();
            ctx.arc(a.x + Math.cos(ang) * rr, a.y + Math.sin(ang) * rr, ds, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        const ring = 14;
        for (let i = 0; i < ring; i++) {
          const ang = -rot * 0.6 + (i / ring) * Math.PI * 2;
          ctx.fillStyle = col(i / ring, 10, fade * 0.9);
          ctx.beginPath();
          ctx.arc(
            a.x + Math.cos(ang) * radius,
            a.y + Math.sin(ang) * radius,
            base * 0.03,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      };

      const drawIris = (t: number) => {
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const closing = t < 0.5;
        const phase = closing ? t / 0.5 : (t - 0.5) / 0.5;
        const radius = closing ? maxR * (1 - phase) : maxR * phase;

        ctx.fillStyle = "#05060a";
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.arc(cx, cy, Math.max(0, radius), 0, Math.PI * 2, true);
        ctx.fill();

        // Glowing rim tracing the iris boundary.
        if (radius > 1) {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = col(0.5, 8, 0.8);
          ctx.lineWidth = Math.max(2, base * 0.05);
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") trigger(x, y);
        },
        draw: (c, dt, time) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = interval();
            trigger(cx, cy);
          }

          anims.update((a) => {
            a.age += dt * speed;
            if (a.variant === "trap_fire") {
              const t = a.age / a.maxLife;
              a.emit += dt * 240 * (1 - t * 0.6);
              while (a.emit >= 1) {
                a.emit -= 1;
                embers.spawn((e) => {
                  e.x = a.x + (Math.random() - 0.5) * base * 0.9;
                  e.y = a.y + base * 0.25;
                  e.vx = (Math.random() - 0.5) * base * 0.6;
                  e.vy = -(base * 1.2 + Math.random() * base);
                  e.life = 0;
                  e.maxLife = 0.4 + Math.random() * 0.5;
                  e.size = base * 0.05 + Math.random() * base * 0.06;
                  e.warm = Math.random();
                });
              }
            }
            return a.age < a.maxLife;
          });

          anims.forEach((a) => {
            const t = Math.min(1, a.age / a.maxLife);
            switch (a.variant) {
              case "trap_spike":
                drawSpike(a, t);
                break;
              case "trap_fire":
                break; // rendered via embers below
              case "trap_poison":
                drawPoison(a, t);
                break;
              case "trap_teleport":
                drawTeleport(a, t);
                break;
              case "portal_swirl":
                drawPortal(a, t, time);
                break;
              case "floor_iris":
                drawIris(t);
                break;
              default: {
                const _exhaustive: never = a.variant;
                void _exhaustive;
              }
            }
          });

          embers.update((e) => {
            e.x += e.vx * speed * dt;
            e.y += e.vy * speed * dt;
            e.vy += base * 1.4 * dt; // buoyancy easing off
            e.life += dt * speed;
            return e.life < e.maxLife;
          });
          if (embers.count > 0) {
            c.globalCompositeOperation = "lighter";
            embers.forEach((e) => {
              const a = Math.max(0, 1 - e.life / e.maxLife);
              c.fillStyle = col(e.warm, 6 + e.warm * 18, a);
              c.beginPath();
              c.arc(e.x, e.y, e.size * (0.5 + a), 0, Math.PI * 2);
              c.fill();
            });
            c.globalCompositeOperation = "source-over";
          }

          c.globalAlpha = 1;
        },
      };
    },
    [variant, speed, size, colorMode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
