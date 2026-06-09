"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type SporeType = "drifter" | "filament" | "cluster";

const TRAIL = 18;

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
  // Ring-buffer trail for filaments (no per-frame allocation).
  trailX: number[];
  trailY: number[];
  tn: number;
  ti: number;
}

export function SporeDrift({ params }: { params: EffectProps }) {
  const density = Math.max(0.2, Number(params.density ?? 1));
  const windStrength = Math.max(0, Number(params.wind ?? 1));
  const glow = Math.max(0, Number(params.glow ?? 1));
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const area = width * height;
      const count = Math.min(220, Math.round((area / 14000) * density));

      const SUBTYPES: SporeType[] = [
        "drifter",
        "drifter",
        "drifter",
        "filament",
        "cluster",
      ];

      const spawn = (seed: boolean): Spore => {
        const type = SUBTYPES[(Math.random() * SUBTYPES.length) | 0];
        const depth = 0.2 + Math.random() * 0.8;
        const speedMul = 0.3 + depth * 0.7;
        return {
          x: Math.random() * width,
          y: seed ? Math.random() * height : height + 30,
          vx: (Math.random() - 0.5) * 14 * speedMul,
          vy: -(9 + Math.random() * 24) * speedMul,
          size: (1.5 + Math.random() * 2.5) * (0.5 + depth * 0.5),
          depth,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.4 + Math.random() * 1.2,
          type,
          clusterAngle: Math.random() * Math.PI * 2,
          life: seed ? 1 : 0,
          t: Math.random(),
          trailX: new Array(TRAIL).fill(0),
          trailY: new Array(TRAIL).fill(0),
          tn: 0,
          ti: 0,
        };
      };

      const spores: Spore[] = [];
      for (let i = 0; i < count; i++) spores.push(spawn(true));
      spores.sort((a, b) => a.depth - b.depth);

      // ── Wind system ──
      let windX = 0;
      let windTarget = 0;
      let nextGust = 3;
      let clock = 0;
      let lastPx = -9999;

      const hslaFor = (s: Spore, light: number, alpha: number) =>
        `hsla(${Math.round(paletteHue(mode, hue, hue2, s.t))}, 92%, ${light}%, ${alpha})`;

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            lastPx = -9999;
            return;
          }
          if (lastPx > -9000) {
            // Pointer motion nudges the wind in its travel direction.
            windTarget += (x - lastPx) * 0.012 * windStrength;
            windTarget = Math.max(-3.2, Math.min(3.2, windTarget));
          }
          lastPx = x;
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          clock += dt;

          // Auto wind gusts.
          if (clock > nextGust) {
            windTarget += (Math.random() - 0.5) * 2.6 * windStrength;
            windTarget = Math.max(-3.2, Math.min(3.2, windTarget));
            nextGust = clock + 3.5 + Math.random() * 4.5;
          }
          windX += (windTarget - windX) * 0.6 * dt * 3;
          windTarget *= 1 - 0.12 * dt;

          c.globalCompositeOperation = "lighter";

          for (const s of spores) {
            if (s.life < 1) s.life = Math.min(s.life + dt * 0.6, 1);

            const depthWind = windX * s.depth * 30;
            s.x += (s.vx + Math.sin(t * 0.6 + s.phase) * 12 * s.depth + depthWind) * dt;
            s.y += s.vy * dt;

            // Wrap around edges.
            if (s.y < -30) {
              s.y = height + 30;
              s.x = Math.random() * width;
              s.life = 0;
              s.tn = 0;
              s.ti = 0;
            }
            if (s.x < -40) s.x = width + 40;
            if (s.x > width + 40) s.x = -40;

            const pulse = Math.sin(t * s.pulseSpeed + s.phase) * 0.35 + 0.65;
            const alpha = s.life * s.depth;
            const r = s.size * pulse;
            if (alpha <= 0.01) continue;

            // ── Filament: organic fading trail ──
            if (s.type === "filament") {
              s.trailX[s.ti] = s.x;
              s.trailY[s.ti] = s.y;
              s.ti = (s.ti + 1) % TRAIL;
              if (s.tn < TRAIL) s.tn++;
              if (s.tn > 1) {
                c.lineWidth = 0.9;
                for (let k = 0; k < s.tn - 1; k++) {
                  const i0 = (s.ti - s.tn + k + TRAIL * 2) % TRAIL;
                  const i1 = (i0 + 1) % TRAIL;
                  const seg = k / (s.tn - 1);
                  c.strokeStyle = hslaFor(s, 60, 0.22 * alpha * seg);
                  c.beginPath();
                  c.moveTo(s.trailX[i0], s.trailY[i0]);
                  c.lineTo(s.trailX[i1], s.trailY[i1]);
                  c.stroke();
                }
              }
            }

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
                c.fillStyle = hslaFor(s, 64, 0.5 * alpha * pulse);
                c.fill();
              }
            }

            // ── Outer glow ──
            const glowR = r * (s.type === "filament" ? 5 : 7) * (0.6 + glow * 0.6);
            const grad = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
            grad.addColorStop(0, hslaFor(s, 62, 0.22 * alpha * pulse * glow));
            grad.addColorStop(0.5, hslaFor(s, 58, 0.06 * alpha * pulse * glow));
            grad.addColorStop(1, "transparent");
            c.fillStyle = grad;
            c.beginPath();
            c.arc(s.x, s.y, glowR, 0, Math.PI * 2);
            c.fill();

            // ── Core dot ──
            c.beginPath();
            c.arc(s.x, s.y, r, 0, Math.PI * 2);
            c.fillStyle = hslaFor(s, 66, 0.85 * alpha * pulse);
            c.fill();

            // ── Near-depth highlight ──
            if (s.depth > 0.6) {
              c.beginPath();
              c.arc(s.x - r * 0.2, s.y - r * 0.2, r * 0.35, 0, Math.PI * 2);
              c.fillStyle = `rgba(255,255,255,${0.3 * alpha * pulse})`;
              c.fill();
            }
          }

          // ── Faint proximity links between spores at similar depth ──
          c.lineWidth = 0.5;
          for (let i = 0; i < spores.length; i++) {
            const a = spores[i];
            if (a.life < 0.4) continue;
            for (let j = i + 1; j < spores.length; j++) {
              const b = spores[j];
              if (Math.abs(a.depth - b.depth) > 0.3) continue;
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < 6400 && d2 > 100) {
                const dist = Math.sqrt(d2);
                const la = (1 - dist / 80) * 0.1 * Math.min(a.depth, b.depth);
                c.strokeStyle = hslaFor(a, 60, la);
                c.beginPath();
                c.moveTo(a.x, a.y);
                c.lineTo(b.x, b.y);
                c.stroke();
              }
            }
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [density, windStrength, glow, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
