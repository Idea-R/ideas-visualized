"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteColor, readPalette, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Orbiter {
  angle: number; // current orbital angle (radians)
  radius: number; // distance from the hole center
  x: number;
  y: number;
  px: number; // previous-frame position (for explicit streaks, no burn-in)
  py: number;
  t: number; // palette factor 0..1
  size: number; // base dot radius
  permanent: boolean; // disk matter recycles; click/auto bursts get consumed
}

function makeOrbiter(): Orbiter {
  return {
    angle: 0,
    radius: 0,
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    t: 0,
    size: 1,
    permanent: true,
  };
}

export function BlackHole({ params }: { params: EffectProps }) {
  const count = Math.round(Number(params.particles ?? 700));
  const pull = Number(params.pull ?? 1);
  const spin = Number(params.spin ?? 1);
  const diskSize = Number(params.diskSize ?? 0.8);
  const streak = Number(params.streak ?? 0.5);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const cx = width * 0.5;
      const cy = height * 0.5;
      const R = Math.min(width, height) / 2;

      // Geometry derived from canvas size so the effect is scale-invariant.
      const diskR = Math.max(40, diskSize * R); // outer accretion disk radius
      const eh = Math.max(8, R * 0.12); // event-horizon ring radius
      const rVoid = eh * 0.82; // solid black void (slightly inside the ring)

      // One pool: `count` permanent disk orbiters + headroom for injected bursts.
      const capacity = count + 800;
      const pool = new Pool<Orbiter>(capacity, makeOrbiter);

      // Place a particle somewhere in the disk (area-uniform via sqrt).
      const seed = (p: Orbiter, rMin: number, rMax: number, perm: boolean) => {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(
          rMin * rMin + Math.random() * (rMax * rMax - rMin * rMin)
        );
        p.angle = a;
        p.radius = rr;
        p.permanent = perm;
        p.t = Math.random();
        p.size = 0.8 + Math.random() * 1.4;
        p.x = cx + Math.cos(a) * rr;
        p.y = cy + Math.sin(a) * rr;
        p.px = p.x;
        p.py = p.y;
      };

      // Seed the steady-state disk.
      for (let i = 0; i < count; i++) {
        pool.spawn((p) => seed(p, eh * 1.15, diskR, true));
      }

      // Recycle a permanent orbiter back out to the rim (object reuse).
      const recycle = (p: Orbiter) => {
        const a = Math.random() * Math.PI * 2;
        const rr = diskR * (0.85 + Math.random() * 0.15);
        p.angle = a;
        p.radius = rr;
        p.t = Math.random();
        p.size = 0.8 + Math.random() * 1.4;
        p.x = cx + Math.cos(a) * rr;
        p.y = cy + Math.sin(a) * rr;
        p.px = p.x;
        p.py = p.y;
      };

      // Inject a burst of matter that spirals in from the rim.
      const inject = (n: number, aimAngle: number, spreadRad: number) => {
        for (let i = 0; i < n; i++) {
          pool.spawn((p) => {
            const a = aimAngle + (Math.random() - 0.5) * spreadRad;
            const rr = diskR * (0.9 + Math.random() * 0.25);
            p.angle = a;
            p.radius = rr;
            p.permanent = false;
            p.t = Math.random();
            p.size = 1.1 + Math.random() * 1.8;
            p.x = cx + Math.cos(a) * rr;
            p.y = cy + Math.sin(a) * rr;
            p.px = p.x;
            p.py = p.y;
          });
        }
      };

      const burstN = Math.max(30, Math.round(count * 0.18));
      let autoTimer = 2.4 + Math.random() * 2; // periodic self-injection for life

      return {
        clearMode: "full", // crisp; streaks are drawn explicitly (no burn-in)
        onPointer: (x, y, type) => {
          if (type === "down") {
            const aim = Math.atan2(y - cy, x - cx);
            inject(burstN, aim, Math.PI * 0.5);
          }
        },
        draw: (c, dt) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Keep the gallery preview alive even with no interaction.
          autoTimer -= dt;
          if (autoTimer <= 0) {
            inject(
              Math.round(burstN * 0.6),
              Math.random() * Math.PI * 2,
              Math.PI * 0.7
            );
            autoTimer = 2.4 + Math.random() * 2.5;
          }

          // ---- Gravitational-lensing halo (faint radial glow) ----
          const halo = c.createRadialGradient(cx, cy, eh, cx, cy, diskR * 1.25);
          halo.addColorStop(0, "rgba(0,0,0,0)");
          halo.addColorStop(
            0.55,
            paletteColor(mode as ColorMode, hue, hue2, 0.5, 85, 22)
          );
          halo.addColorStop(1, "rgba(0,0,0,0)");
          c.globalCompositeOperation = "lighter";
          c.globalAlpha = 0.5;
          c.fillStyle = halo;
          c.beginPath();
          c.arc(cx, cy, diskR * 1.25, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = 1;

          // ---- Accretion disk particles (additive, explicit streaks) ----
          pool.update((p) => {
            // Keplerian feel: angular speed rises sharply as radius shrinks.
            const rn = Math.max(0.08, p.radius / R);
            const omega = (spin * 1.3) / Math.pow(rn, 1.5);
            p.angle += omega * dt;

            // Inward pull; stronger near the hole.
            const drdt = (pull * R * 0.07) / Math.sqrt(rn);
            p.radius -= drdt * dt;

            // Crossed the horizon → recycle disk matter, consume bursts.
            if (p.radius <= eh) {
              if (p.permanent) {
                recycle(p);
                return true;
              }
              return false;
            }

            p.px = p.x;
            p.py = p.y;
            p.x = cx + Math.cos(p.angle) * p.radius;
            p.y = cy + Math.sin(p.angle) * p.radius;

            // 0 at rim → 1 at horizon: closer = brighter/whiter and longer.
            const closeness = Math.min(
              1,
              Math.max(0, (diskR - p.radius) / Math.max(1, diskR - eh))
            );
            const light = 50 + closeness * 45;
            const sat = 100 - closeness * 65;
            const col = paletteColor(
              mode as ColorMode,
              hue,
              hue2,
              closeness,
              sat,
              light
            );

            const dx = p.x - p.px;
            const dy = p.y - p.py;
            const tailMul = 1 + streak * 7 * (0.3 + closeness);
            const tx = p.x - dx * tailMul;
            const ty = p.y - dy * tailMul;
            const w = p.size * (0.7 + closeness * 0.9);

            c.strokeStyle = col;
            c.globalAlpha = 0.45 + closeness * 0.5;
            c.lineWidth = w;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(tx, ty);
            c.lineTo(p.x, p.y);
            c.stroke();
            return true;
          });
          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";

          // ---- The void: solid black inner disk occludes everything behind ----
          c.fillStyle = "#000000";
          c.beginPath();
          c.arc(cx, cy, rVoid, 0, Math.PI * 2);
          c.fill();

          // ---- Bright event-horizon ring (glow) ----
          const ring = c.createRadialGradient(
            cx,
            cy,
            rVoid,
            cx,
            cy,
            eh * 1.7
          );
          const ringCol = paletteColor(mode as ColorMode, hue, hue2, 0.5, 95, 70);
          ring.addColorStop(0, "rgba(0,0,0,0)");
          ring.addColorStop(0.45, "rgba(255,255,255,0.95)");
          ring.addColorStop(0.7, ringCol);
          ring.addColorStop(1, "rgba(0,0,0,0)");
          c.globalCompositeOperation = "lighter";
          c.fillStyle = ring;
          c.beginPath();
          c.arc(cx, cy, eh * 1.7, 0, Math.PI * 2);
          c.fill();
          c.globalCompositeOperation = "source-over";
        },
        cleanup: () => {
          pool.clear();
        },
      };
    },
    [count, pull, spin, diskSize, streak, mode, hue, hue2]
  );

  return (
    <div className="relative h-full w-full bg-[#05060a]">
      <canvas ref={ref} className="block h-full w-full" />
    </div>
  );
}
