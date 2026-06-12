"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Flame {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  /** 0 at core (hot) to 1 at tip (cool), set at spawn from emit progress. */
  heat: number;
}

function makeFlame(): Flame {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0, heat: 0 };
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

function makeEmber(): Ember {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0 };
}

interface Smoke {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  grow: number;
}

function makeSmoke(): Smoke {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, grow: 0 };
}

export function FlameJet({ params }: { params: EffectProps }) {
  const intensity = Number(params.intensity ?? 1);
  const reach = Number(params.reach ?? 1);
  const spread = Number(params.spread ?? 0.32);
  const emberAmount = Number(params.embers ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const flames = new Pool<Flame>(2600, makeFlame);
      const embers = new Pool<Ember>(700, makeEmber);
      const smoke = new Pool<Smoke>(500, makeSmoke);

      // Origin sits a little in from the lower-left so the jet has room to run.
      const ox = width * 0.14;
      const oy = height * 0.66;

      // Reach in pixels scaled to canvas size; drives flame velocity + lifetime.
      const baseReach = Math.min(width, height) * 0.95 * reach;

      // Aim state. `aim` is the current angle, smoothed toward `targetAim`.
      let aim = -0.35;
      let targetAim = -0.35;
      let pointerActive = false;
      let burst = 0; // decays after a click for a momentary surge
      let sweepT = 0;
      let emitAcc = 0;
      let emberAcc = 0;
      let smokeAcc = 0;
      let seeded = false;

      const aimAt = (x: number, y: number) => {
        targetAim = Math.atan2(y - oy, x - ox);
      };

      // Spawn a single flame particle traveling along `ang` with `spreadScale`
      // jitter. `prefill` in [0,1] advances the particle along the jet so we can
      // pre-populate the whole stream on the very first frame.
      const spawnFlame = (ang: number, power: number, prefill: number) => {
        flames.spawn((f) => {
          const jitter = (Math.random() - 0.5) * spread * 2;
          const a = ang + jitter;
          const speed = baseReach * (0.85 + Math.random() * 0.4) * power;
          const life = 0.55 + Math.random() * 0.55;
          // Place along the path if prefilling so the jet exists immediately.
          const along = prefill * life;
          f.x = ox + Math.cos(a) * speed * along;
          f.y = oy + Math.sin(a) * speed * along;
          f.vx = Math.cos(a) * speed;
          f.vy = Math.sin(a) * speed;
          f.maxLife = life;
          f.life = life - along;
          f.size = (10 + Math.random() * 16) * (0.7 + power * 0.4);
          f.heat = Math.random() * 0.25;
          f.hue = paletteHue(mode, hue, hue2, 0);
        });
      };

      const spawnEmber = (ang: number) => {
        embers.spawn((e) => {
          const a = ang + (Math.random() - 0.5) * spread * 2.4;
          const speed = baseReach * (0.4 + Math.random() * 0.7);
          e.x = ox;
          e.y = oy;
          e.vx = Math.cos(a) * speed;
          e.vy = Math.sin(a) * speed - 30;
          e.maxLife = 0.8 + Math.random() * 0.9;
          e.life = e.maxLife;
          e.size = 1 + Math.random() * 2.2;
          e.hue = paletteHue(mode, hue, hue2, 0.85) + (Math.random() - 0.5) * 20;
        });
      };

      const spawnSmoke = (ang: number) => {
        smoke.spawn((s) => {
          const a = ang + (Math.random() - 0.5) * spread * 1.6;
          const along = 0.55 + Math.random() * 0.45;
          const speed = baseReach * 0.6;
          s.x = ox + Math.cos(a) * speed * along * 0.5;
          s.y = oy + Math.sin(a) * speed * along * 0.5;
          s.vx = Math.cos(a) * speed * 0.45;
          s.vy = Math.sin(a) * speed * 0.45 - 18;
          s.maxLife = 1.1 + Math.random() * 1.0;
          s.life = s.maxLife;
          s.size = 14 + Math.random() * 18;
          s.grow = 40 + Math.random() * 50;
        });
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            pointerActive = false;
            return;
          }
          pointerActive = true;
          aimAt(x, y);
          if (type === "down") {
            aim = targetAim; // snap-redirect on click
            burst = 1;
          }
        },
        draw: (c, dt) => {
          // Idle sweep when the pointer isn't steering the jet.
          sweepT += dt;
          if (!pointerActive) {
            targetAim = -0.35 + Math.sin(sweepT * 0.6) * 0.5;
          }
          // Smooth the aim so redirects feel like a turning nozzle.
          const turn = pointerActive ? 8 : 2.5;
          aim += (targetAim - aim) * Math.min(1, turn * dt);

          burst = Math.max(0, burst - dt * 1.6);
          const power = 1 + burst * 1.1;
          const rate = intensity * (1 + burst * 1.4);

          // Pre-fill the whole stream on frame one so it looks alive instantly.
          if (!seeded) {
            for (let i = 0; i < 240; i++) {
              spawnFlame(aim, 1, Math.random());
            }
            seeded = true;
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Time-based emission so density is frame-rate independent.
          emitAcc += dt * 520 * rate;
          while (emitAcc >= 1) {
            emitAcc -= 1;
            spawnFlame(aim, power, 0);
          }

          emberAcc += dt * 70 * rate * emberAmount;
          while (emberAcc >= 1) {
            emberAcc -= 1;
            spawnEmber(aim);
          }

          smokeAcc += dt * 26 * rate;
          while (smokeAcc >= 1) {
            smokeAcc -= 1;
            spawnSmoke(aim);
          }

          // --- Smoke (drawn first, normal blending, thins toward the end) ---
          smoke.update((s) => {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vx *= 0.96;
            s.vy -= 24 * dt; // buoyancy
            s.size += s.grow * dt;
            s.life -= dt;
            return s.life > 0;
          });
          c.globalCompositeOperation = "source-over";
          smoke.forEach((s) => {
            const t = s.life / s.maxLife;
            const a = t * t * 0.18;
            if (a <= 0.002) return;
            const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
            g.addColorStop(0, `rgba(40, 38, 44, ${a})`);
            g.addColorStop(1, "rgba(40, 38, 44, 0)");
            c.globalAlpha = 1;
            c.fillStyle = g;
            c.beginPath();
            c.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            c.fill();
          });

          // --- Flames (additive, cooling core -> tip) ---
          c.globalCompositeOperation = "lighter";
          flames.update((f) => {
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            f.vx *= 0.9;
            f.vy *= 0.9;
            f.vy -= 60 * dt; // hot gas rises
            f.life -= dt;
            return f.life > 0;
          });
          flames.forEach((f) => {
            const t = 1 - f.life / f.maxLife; // 0 hot core -> 1 cool tip
            const cool = Math.min(1, t + f.heat);
            // Hot gradient via lightness + slight hue climb toward yellow tips.
            const baseHue = paletteHue(mode, hue, hue2, cool);
            const tipHue =
              mode === "single" || mode === "dual" ? baseHue + cool * 28 : baseHue;
            const light = 70 - cool * 34;
            const a = (1 - t) * (1 - t) * 0.9;
            const r = f.size * (0.5 + (1 - t) * 0.9);
            const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
            g.addColorStop(0, `hsla(${tipHue}, 100%, ${light + 14}%, ${a})`);
            g.addColorStop(0.5, `hsla(${baseHue}, 100%, ${light}%, ${a * 0.6})`);
            g.addColorStop(1, `hsla(${baseHue}, 100%, ${light}%, 0)`);
            c.globalAlpha = 1;
            c.fillStyle = g;
            c.beginPath();
            c.arc(f.x, f.y, r, 0, Math.PI * 2);
            c.fill();
          });

          // --- Embers (additive sparks) ---
          embers.update((e) => {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.vx *= 0.97;
            e.vy *= 0.97;
            e.vy -= 70 * dt; // float upward
            e.life -= dt;
            return e.life > 0;
          });
          embers.forEach((e) => {
            const a = Math.max(0, e.life / e.maxLife);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${e.hue}, 100%, ${60 + a * 25}%)`;
            c.beginPath();
            c.arc(e.x, e.y, e.size * (0.4 + a * 0.7), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [intensity, reach, spread, emberAmount, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
