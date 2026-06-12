"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type SporeType = "drifter" | "filament" | "cluster";

// Three discrete depth layers (far → near). Nearer layers are bigger,
// brighter, faster, and parallax harder against wind and the pointer.
const LAYERS = [0.34, 0.62, 1] as const;

interface Spore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  depth: number; // 0 far → 1 near
  phase: number;
  pulseSpeed: number;
  type: SporeType;
  clusterAngle: number;
  life: number; // 0→1 fade-in
  t: number; // palette factor in [0,1]
}

function makeSpore(): Spore {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 1,
    depth: 1,
    phase: 0,
    pulseSpeed: 1,
    type: "drifter",
    clusterAngle: 0,
    life: 0,
    t: 0,
  };
}

interface Pollen {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  t: number;
}

function makePollen(): Pollen {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, t: 0 };
}

export function NeonSpores({ params }: { params: EffectProps }) {
  const density = Math.max(0.2, Number(params.density ?? 1));
  const windStrength = Math.max(0, Number(params.wind ?? 1));
  const driftSpeed = Math.max(0.1, Number(params.speed ?? 1));
  const glow = Math.max(0, Number(params.glow ?? 1));
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const area = width * height;
      const count = Math.min(300, Math.round((area / 13000) * density));

      const SUBTYPES: SporeType[] = [
        "drifter",
        "drifter",
        "drifter",
        "filament",
        "cluster",
      ];

      const spores = new Pool<Spore>(320, makeSpore);
      const pollen = new Pool<Pollen>(1400, makePollen);

      const initSpore = (s: Spore, seed: boolean) => {
        const depth = LAYERS[(Math.random() * LAYERS.length) | 0];
        const speedMul = (0.3 + depth * 0.7) * driftSpeed;
        s.type = SUBTYPES[(Math.random() * SUBTYPES.length) | 0];
        s.x = Math.random() * width;
        s.y = seed ? Math.random() * height : height + 30;
        s.vx = (Math.random() - 0.5) * 14 * speedMul;
        s.vy = -(9 + Math.random() * 24) * speedMul;
        s.size = (1.5 + Math.random() * 2.5) * (0.5 + depth * 0.6);
        s.depth = depth;
        s.phase = Math.random() * Math.PI * 2;
        s.pulseSpeed = 0.4 + Math.random() * 1.2;
        s.clusterAngle = Math.random() * Math.PI * 2;
        s.life = seed ? 1 : 0;
        s.t = Math.random();
      };

      // Pre-populate the field so it reads full and alive on the first frame.
      let seeded = false;

      const burst = (cx: number, cy: number, big: boolean) => {
        const n = big ? 26 + ((Math.random() * 16) | 0) : 12 + ((Math.random() * 12) | 0);
        const baseT = Math.random();
        for (let i = 0; i < n; i++) {
          pollen.spawn((p) => {
            const a = Math.random() * Math.PI * 2;
            const v = (28 + Math.random() * (big ? 150 : 95)) * driftSpeed;
            p.x = cx;
            p.y = cy;
            p.vx = Math.cos(a) * v;
            p.vy = Math.sin(a) * v - (big ? 16 : 10);
            p.size = 1 + Math.random() * 2.2;
            p.life = 1;
            p.maxLife = 0.8 + Math.random() * 1.1;
            p.t = baseT + (Math.random() - 0.5) * 0.25;
          });
        }
      };

      // ── Wind system ──
      let windX = 0;
      let windTarget = 0;
      let nextGust = 3;
      let nextBurst = 4 + Math.random() * 5;
      let clock = 0;

      // ── Pointer ──
      let px = -9999;
      let py = -9999;
      let pointerOn = false;

      const hslaFor = (t: number, light: number, alpha: number) =>
        `hsla(${Math.round(paletteHue(mode, hue, hue2, t))}, 92%, ${light}%, ${alpha})`;

      return {
        // Fade clear gives every spore a soft motion trail; the periodic true
        // clear avoids 8-bit burn-in.
        clearMode: { fade: 0.16, color: "#05060a", resetEvery: 280 },
        onPointer: (x, y, type) => {
          if (type === "leave") {
            pointerOn = false;
            px = -9999;
            py = -9999;
            return;
          }
          px = x;
          py = y;
          pointerOn = type !== "up";
          if (type === "down") burst(x, y, true);
        },
        draw: (c, dt, t) => {
          if (!seeded) {
            for (let i = 0; i < count; i++) spores.spawn((s) => initSpore(s, true));
            seeded = true;
          }

          clock += dt;

          // Auto wind gusts that ease in and slowly decay.
          if (clock > nextGust) {
            windTarget += (Math.random() - 0.5) * 2.6 * windStrength;
            windTarget = Math.max(-3.2, Math.min(3.2, windTarget));
            nextGust = clock + 3.5 + Math.random() * 4.5;
          }
          windX += (windTarget - windX) * 0.6 * dt * 3;
          windTarget *= 1 - 0.12 * dt;

          // Occasional ambient pollen burst somewhere in the field.
          if (clock > nextBurst) {
            burst(Math.random() * width, Math.random() * height * 0.85, false);
            nextBurst = clock + 5 + Math.random() * 7;
          }

          c.globalCompositeOperation = "lighter";

          const pr2 = 150 * 150; // pointer influence radius²

          spores.forEach((s) => {
            if (s.life < 1) s.life = Math.min(s.life + dt * 0.6, 1);

            const depthWind = windX * s.depth * 30;

            // Pointer attract + swirl (stronger on nearer layers).
            if (pointerOn) {
              const dx = px - s.x;
              const dy = py - s.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < pr2 && d2 > 1) {
                const d = Math.sqrt(d2);
                const f = (1 - d / 150) * 220 * s.depth;
                const nx = dx / d;
                const ny = dy / d;
                s.vx += nx * f * dt;
                s.vy += ny * f * dt;
                // Tangential swirl.
                s.vx += -ny * f * 0.7 * dt;
                s.vy += nx * f * 0.7 * dt;
              }
            }

            s.x += (s.vx + Math.sin(t * 0.6 + s.phase) * 12 * s.depth + depthWind) * dt;
            s.y += s.vy * dt;
            // Gentle damping so pointer kicks settle back to a calm drift.
            s.vx *= 1 - 0.6 * dt;

            // Wrap around edges.
            if (s.y < -30) {
              s.y = height + 30;
              s.x = Math.random() * width;
              s.life = 0;
            }
            if (s.x < -40) s.x = width + 40;
            if (s.x > width + 40) s.x = -40;

            const pulse = Math.sin(t * s.pulseSpeed + s.phase) * 0.35 + 0.65;
            const alpha = s.life * s.depth;
            const r = s.size * pulse;
            if (alpha <= 0.01) return;

            // ── Cluster: 3 orbiting sub-spores ──
            if (s.type === "cluster") {
              s.clusterAngle += dt * 0.9;
              for (let j = 0; j < 3; j++) {
                const a = s.clusterAngle + (j * Math.PI * 2) / 3;
                const dist = 4 + Math.sin(t + j) * 2;
                const sx = s.x + Math.cos(a) * dist;
                const sy = s.y + Math.sin(a) * dist;
                c.beginPath();
                c.arc(sx, sy, r * 0.4, 0, Math.PI * 2);
                c.fillStyle = hslaFor(s.t, 64, 0.5 * alpha * pulse);
                c.fill();
              }
            }

            // ── Filament: a short tail streaked along travel direction ──
            if (s.type === "filament") {
              const vmag = Math.hypot(s.vx, s.vy) || 1;
              const len = (10 + s.depth * 22) * (0.6 + glow * 0.4);
              const tx = s.x - (s.vx / vmag) * len;
              const ty = s.y - (s.vy / vmag) * len;
              const grad = c.createLinearGradient(s.x, s.y, tx, ty);
              grad.addColorStop(0, hslaFor(s.t, 62, 0.32 * alpha));
              grad.addColorStop(1, hslaFor(s.t, 58, 0));
              c.strokeStyle = grad;
              c.lineWidth = 0.9 + s.depth;
              c.lineCap = "round";
              c.beginPath();
              c.moveTo(s.x, s.y);
              c.lineTo(tx, ty);
              c.stroke();
            }

            // ── Outer glow ──
            const glowR = r * (s.type === "filament" ? 5 : 7) * (0.6 + glow * 0.6);
            const grad = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
            grad.addColorStop(0, hslaFor(s.t, 62, 0.22 * alpha * pulse * glow));
            grad.addColorStop(0.5, hslaFor(s.t, 58, 0.06 * alpha * pulse * glow));
            grad.addColorStop(1, "transparent");
            c.fillStyle = grad;
            c.beginPath();
            c.arc(s.x, s.y, glowR, 0, Math.PI * 2);
            c.fill();

            // ── Core dot ──
            c.beginPath();
            c.arc(s.x, s.y, r, 0, Math.PI * 2);
            c.fillStyle = hslaFor(s.t, 66, 0.85 * alpha * pulse);
            c.fill();

            // ── Near-depth highlight ──
            if (s.depth > 0.6) {
              c.beginPath();
              c.arc(s.x - r * 0.2, s.y - r * 0.2, r * 0.35, 0, Math.PI * 2);
              c.fillStyle = `rgba(255,255,255,${0.3 * alpha * pulse})`;
              c.fill();
            }
          });

          // ── Pollen bursts ──
          pollen.update((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 22 * dt; // gentle gravity-ish settle
            p.vx *= 1 - 0.9 * dt;
            p.vy *= 1 - 0.9 * dt;
            p.life -= dt / p.maxLife;
            return p.life > 0;
          });
          pollen.forEach((p) => {
            const a = Math.max(0, p.life);
            const pr = p.size * (0.5 + a * 0.8);
            const glowR = pr * 4 * (0.6 + glow * 0.6);
            const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
            g.addColorStop(0, hslaFor(p.t, 64, 0.25 * a * glow));
            g.addColorStop(1, "transparent");
            c.fillStyle = g;
            c.beginPath();
            c.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = hslaFor(p.t, 72, 0.8 * a);
            c.beginPath();
            c.arc(p.x, p.y, pr, 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.lineCap = "butt";
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [density, windStrength, driftSpeed, glow, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
