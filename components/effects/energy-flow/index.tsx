"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

const TRAIL_LEN = 12;

interface Particle {
  /** Which flow stream this rides. */
  stream: number;
  /** Color factor in [0,1] for this particle. */
  frac: number;
  /** Progress along the path, 0 (left) to 1 (right). */
  prog: number;
  /** Per-particle along-path speed multiplier. */
  spd: number;
  /** Per-particle lateral amplitude scale. */
  amp: number;
  /** Per-particle wave phase offset. */
  phase: number;
  /** Head radius in px. */
  size: number;
  /** Explicit trail history (preallocated, no per-frame allocation). */
  tx: number[];
  ty: number[];
  tcount: number;
}

export function EnergyFlow({ params }: { params: EffectProps }) {
  const density = Math.max(40, Math.round(Number(params.count ?? 220)));
  const speed = Number(params.speed ?? 1);
  const thickness = Number(params.thickness ?? 1.6);
  const streams = Math.max(2, Math.min(10, Math.round(Number(params.streams ?? 5))));
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      // Per-stream wave shape, fixed for the life of this setup.
      const streamPhase: number[] = [];
      const streamPhase2: number[] = [];
      const streamFreq: number[] = [];
      const streamFreq2: number[] = [];
      const streamAmp: number[] = [];
      for (let s = 0; s < streams; s++) {
        streamPhase.push(Math.random() * Math.PI * 2);
        streamPhase2.push(Math.random() * Math.PI * 2);
        streamFreq.push(2.2 + Math.random() * 2.0);
        streamFreq2.push(4.5 + Math.random() * 2.5);
        streamAmp.push(0.75 + Math.random() * 0.55);
      }

      const baseAmp = Math.max(18, height * 0.13);

      const cap = density + 32;
      const pool = new Pool<Particle>(cap, () => ({
        stream: 0,
        frac: 0,
        prog: 0,
        spd: 1,
        amp: 1,
        phase: 0,
        size: 1,
        tx: new Array(TRAIL_LEN).fill(0),
        ty: new Array(TRAIL_LEN).fill(0),
        tcount: 0,
      }));

      let spawnIx = 0;
      const initParticle = (p: Particle, prog: number) => {
        const s = spawnIx++ % streams;
        p.stream = s;
        p.frac = streams > 1 ? s / (streams - 1) : 0;
        p.prog = prog;
        p.spd = 0.1 + Math.random() * 0.14;
        p.amp = 0.7 + Math.random() * 0.6;
        p.phase = Math.random() * Math.PI * 2;
        p.size = 1.2 + Math.random() * 1.8;
        p.tcount = 0;
      };

      // Fill the field immediately so it is always animating, no warm-up.
      for (let i = 0; i < density; i++) {
        pool.spawn((p) => initParticle(p, Math.random()));
      }

      const pointer = { x: -9999, y: -9999, active: false };

      const pathPoint = (p: Particle, t: number) => {
        const s = p.stream;
        const baseY = ((s + 0.5) / streams) * height;
        const amp = baseAmp * streamAmp[s] * p.amp;
        const wave =
          Math.sin(p.prog * streamFreq[s] + t * speed + streamPhase[s] + p.phase) *
            amp +
          Math.sin(p.prog * streamFreq2[s] - t * 0.7 * speed + streamPhase2[s]) *
            amp *
            0.35;
        return { x: p.prog * width, y: baseY + wave };
      };

      return {
        clearMode: "full" as const,
        onPointer: (x, y, type) => {
          if (type === "leave" || type === "up") {
            pointer.active = false;
            pointer.x = -9999;
            pointer.y = -9999;
            return;
          }
          pointer.x = x;
          pointer.y = y;
          pointer.active = true;
        },
        draw: (c, dt, t) => {
          const radius = 150;
          const radius2 = radius * radius;

          // Advance + record trail history.
          pool.update((p) => {
            p.prog += p.spd * speed * dt;
            if (p.prog > 1.08) return false; // exited right edge, retire

            const pt = pathPoint(p, t);
            let px = pt.x;
            let py = pt.y;

            // Pointer attracts/bends nearby flow toward the cursor.
            if (pointer.active) {
              const dx = pointer.x - px;
              const dy = pointer.y - py;
              const d2 = dx * dx + dy * dy;
              if (d2 < radius2) {
                const d = Math.sqrt(d2) || 1;
                const influence = (radius - d) / radius;
                const pull = influence * influence * 0.55;
                px += dx * pull;
                py += dy * pull;
              }
            }

            // Shift history (cheap, fixed-size, no allocation).
            for (let k = Math.min(p.tcount, TRAIL_LEN - 1); k > 0; k--) {
              p.tx[k] = p.tx[k - 1];
              p.ty[k] = p.ty[k - 1];
            }
            p.tx[0] = px;
            p.ty[0] = py;
            if (p.tcount < TRAIL_LEN) p.tcount++;
            return true;
          });

          // Refill to keep a continuous stream of energy.
          while (pool.count < density) {
            const spawned = pool.spawn((p) => initParticle(p, 0));
            if (!spawned) break;
          }

          // Additive blending: trails accumulate light without translucent-fade
          // clearing, so there is no ghosting.
          c.globalCompositeOperation = "lighter";

          pool.forEach((p) => {
            if (p.tcount < 2) return;
            const factor = mode === "rainbow" ? p.prog : p.frac;
            const h = paletteHue(mode, hue, hue2, factor);

            // Soft fading trail drawn as fading segments newest -> oldest.
            for (let k = 0; k < p.tcount - 1; k++) {
              const a = 1 - k / TRAIL_LEN;
              c.globalAlpha = a * a * 0.5;
              c.strokeStyle = `hsl(${h}, 90%, 62%)`;
              c.lineWidth = thickness * (1 - k / TRAIL_LEN) + 0.3;
              c.lineCap = "round";
              c.beginPath();
              c.moveTo(p.tx[k], p.ty[k]);
              c.lineTo(p.tx[k + 1], p.ty[k + 1]);
              c.stroke();
            }

            // Glowing head.
            const hx = p.tx[0];
            const hy = p.ty[0];
            const r = p.size * thickness;
            const g = c.createRadialGradient(hx, hy, 0, hx, hy, r * 3);
            g.addColorStop(0, `hsla(${h}, 95%, 75%, 0.9)`);
            g.addColorStop(0.4, `hsla(${h}, 95%, 65%, 0.35)`);
            g.addColorStop(1, `hsla(${h}, 95%, 65%, 0)`);
            c.globalAlpha = 1;
            c.fillStyle = g;
            c.beginPath();
            c.arc(hx, hy, r * 3, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = `hsl(${h}, 100%, 88%)`;
            c.beginPath();
            c.arc(hx, hy, r * 0.6, 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [density, speed, thickness, streams, mode, hue, hue2]
  );

  return (
    <div className="relative h-full w-full bg-[#05060a]">
      <canvas ref={ref} className="block h-full w-full" />
    </div>
  );
}
