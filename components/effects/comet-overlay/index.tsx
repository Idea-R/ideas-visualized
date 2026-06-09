"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface TrailPoint {
  x: number;
  y: number;
}

interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  t: number;
  trail: TrailPoint[];
}

interface Glitter {
  x: number;
  y: number;
  life: number;
}

const MAX_COMETS = 600;
const MAX_GLITTER = 700;
const TRAIL_LEN = 10;

export function CometOverlay({ params }: { params: EffectProps }) {
  const cometRate = Number(params.cometRate ?? 1);
  const glitterDensity = Number(params.glitter ?? 1);
  const spiralOn = Boolean(params.spiral);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const cx = width / 2;
      const cy = height / 2;
      const comets: Comet[] = [];
      const glitters: Glitter[] = [];

      let beatTimer = 0;
      let nextBeat = 0.6;

      const spawnComet = (
        x: number,
        y: number,
        vx: number,
        vy: number,
        t: number
      ) => {
        if (comets.length >= MAX_COMETS) return;
        comets.push({ x, y, vx, vy, life: 1, t, trail: [{ x, y }] });
      };

      // A peak-driven edge burst: comets streak inward from a random screen edge.
      const spawnEdgeBurst = (energy: number) => {
        const sector = Math.floor(Math.random() * 4);
        const count = Math.floor((10 + energy * 22) * (0.5 + cometRate * 0.8));
        for (let i = 0; i < count; i++) {
          let x = 0;
          let y = 0;
          if (sector === 0) {
            x = Math.random() * width;
            y = -10;
          } else if (sector === 1) {
            x = Math.random() * width;
            y = height + 10;
          } else if (sector === 2) {
            x = -10;
            y = Math.random() * height;
          } else {
            x = width + 10;
            y = Math.random() * height;
          }
          const dirx = cx - x;
          const diry = cy - y;
          const d = Math.hypot(dirx, diry) || 1;
          const speed = 200 + Math.random() * 300;
          const jx = (Math.random() - 0.5) * 60;
          const jy = (Math.random() - 0.5) * 60;
          spawnComet(
            x,
            y,
            (dirx / d) * speed + jx,
            (diry / d) * speed + jy,
            count > 1 ? i / count : 0
          );
        }
      };

      const spawnCornerDrips = (energy: number) => {
        const corners: [number, number][] = [
          [10, height - 10],
          [width - 10, height - 10],
        ];
        const count = Math.floor(6 * (0.5 + energy));
        for (let i = 0; i < count; i++) {
          const [sx, sy] = corners[i % corners.length];
          const theta = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
          const sp = 150 + Math.random() * 200;
          spawnComet(sx, sy, Math.cos(theta) * sp, Math.sin(theta) * sp, Math.random());
        }
      };

      const spawnGlitterRing = (energy: number) => {
        const ringR = Math.min(width, height) * 0.42;
        const count = Math.floor(8 * glitterDensity * (0.4 + energy));
        for (let i = 0; i < count; i++) {
          if (glitters.length >= MAX_GLITTER) break;
          const th = Math.random() * Math.PI * 2;
          const jit = (Math.random() - 0.5) * 14;
          glitters.push({
            x: cx + Math.cos(th) * (ringR + jit),
            y: cy + Math.sin(th) * (ringR + jit),
            life: 1,
          });
        }
      };

      const spawnPointerBurst = (x: number, y: number) => {
        const count = Math.floor(24 * (0.6 + cometRate * 0.6));
        for (let i = 0; i < count; i++) {
          const ang = (i / count) * Math.PI * 2 + Math.random() * 0.3;
          const sp = 180 + Math.random() * 260;
          spawnComet(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, i / count);
        }
      };

      const drawSpiral = (c: CanvasRenderingContext2D, mid: number, t: number) => {
        const arms = 3;
        const thetaMax = 10;
        const a = 2.2;
        const b = 3.5 * (0.4 + mid);
        const maxR = Math.hypot(width, height);
        c.save();
        c.globalCompositeOperation = "lighter";
        c.lineWidth = 1 + mid * 2;
        c.globalAlpha = 0.1 + mid * 0.18;
        for (let k = 0; k < arms; k++) {
          c.strokeStyle = `hsl(${paletteHue(mode, hue, hue2, k / arms)}, 90%, 62%)`;
          c.beginPath();
          const steps = 130;
          for (let i = 0; i <= steps; i++) {
            const th = (i / steps) * thetaMax + (k * 2 * Math.PI) / arms + t * 0.2;
            const r = a + b * th;
            if (r > maxR) break;
            const x = cx + Math.cos(th) * r;
            const y = cy + Math.sin(th) * r;
            if (i === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
          }
          c.stroke();
        }
        c.restore();
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") spawnPointerBurst(x, y);
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Internal rhythm replaces the original audio peaks.
          const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
          beatTimer += dt;
          if (beatTimer >= nextBeat) {
            beatTimer = 0;
            const energy = 0.4 + pulse * 0.6;
            spawnEdgeBurst(energy);
            if (energy > 0.7) spawnCornerDrips(energy);
            nextBeat = (0.5 + Math.random() * 0.7) / Math.max(0.25, cometRate);
          }

          if (glitterDensity > 0 && pulse > 0.55) spawnGlitterRing(pulse);

          c.globalCompositeOperation = "lighter";

          const decay = Math.pow(0.986, dt * 60);
          for (let i = comets.length - 1; i >= 0; i--) {
            const cm = comets[i];
            cm.vx *= decay;
            cm.vy *= decay;
            cm.x += cm.vx * dt;
            cm.y += cm.vy * dt;
            cm.life -= dt * 0.55;
            cm.trail.push({ x: cm.x, y: cm.y });
            if (cm.trail.length > TRAIL_LEN) cm.trail.shift();
            if (cm.life <= 0) {
              comets.splice(i, 1);
              continue;
            }
            const ch = paletteHue(mode, hue, hue2, cm.t);
            for (let j = 1; j < cm.trail.length; j++) {
              const p0 = cm.trail[j - 1];
              const p1 = cm.trail[j];
              const frac = j / cm.trail.length;
              const a = frac * cm.life * 0.6;
              c.strokeStyle = `hsla(${ch}, 92%, 64%, ${a})`;
              c.lineWidth = 1.3 * frac + 0.3;
              c.beginPath();
              c.moveTo(p0.x, p0.y);
              c.lineTo(p1.x, p1.y);
              c.stroke();
            }
          }

          for (let i = glitters.length - 1; i >= 0; i--) {
            const g = glitters[i];
            g.life -= dt * 2.2;
            if (g.life <= 0) {
              glitters.splice(i, 1);
              continue;
            }
            c.fillStyle = `rgba(255,255,255,${0.8 * g.life})`;
            c.fillRect(g.x, g.y, 1.6, 1.6);
          }

          if (spiralOn && pulse > 0.35) drawSpiral(c, pulse * 0.9, t);

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [cometRate, glitterDensity, spiralOn, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
