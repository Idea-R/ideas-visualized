"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type Weather =
  | "rain"
  | "snow"
  | "sandstorm"
  | "volcanic_ash"
  | "void_particles"
  | "crystal_shimmer"
  | "plague_spores"
  | "underwater_bubbles"
  | "fireflies"
  | "falling_leaves";

// Per-frame velocities in the source were authored for ~60fps; scale to px/sec.
const FR = 60;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
  spin: number; // phase used for twinkle / sway / wing motion
}

function makeParticle(): Particle {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, alpha: 1, spin: 0 };
}

// Each weather's signature colour, used when Color mode is "signature".
const SIGNATURE: Record<Weather, { h: number; s: number; l: number }> = {
  rain: { h: 210, s: 25, l: 65 },
  snow: { h: 210, s: 20, l: 96 },
  sandstorm: { h: 38, s: 45, l: 62 },
  volcanic_ash: { h: 18, s: 70, l: 52 },
  void_particles: { h: 272, s: 65, l: 55 },
  crystal_shimmer: { h: 192, s: 90, l: 66 },
  plague_spores: { h: 92, s: 60, l: 45 },
  underwater_bubbles: { h: 202, s: 75, l: 75 },
  fireflies: { h: 96, s: 90, l: 60 },
  falling_leaves: { h: 78, s: 45, l: 48 },
};

/** Initialise one particle for a weather type. Velocities returned in px/sec. */
function initParticle(
  p: Particle,
  type: Weather,
  w: number,
  h: number,
  scale: number
): void {
  p.x = Math.random() * w;
  p.y = Math.random() * h;
  p.vx = 0;
  p.vy = 0;
  p.life = 0;
  p.maxLife = (60 + Math.random() * 120) / FR;
  p.size = 2 * scale;
  p.alpha = 0.5 + Math.random() * 0.5;
  p.spin = Math.random() * Math.PI * 2;

  switch (type) {
    case "rain":
      p.vy = (4 + Math.random() * 3) * FR;
      p.vx = -1 * FR;
      p.size = 1 * scale;
      break;
    case "snow":
      p.vy = (0.5 + Math.random()) * FR;
      p.vx = (Math.random() * 0.5 - 0.25) * FR;
      p.size = (2 + Math.random() * 2) * scale;
      break;
    case "sandstorm":
      p.vx = (3 + Math.random() * 2) * FR;
      p.vy = (Math.random() - 0.5) * FR;
      p.alpha = 0.3;
      break;
    case "volcanic_ash":
      p.vy = (-0.5 - Math.random()) * FR;
      p.vx = (Math.random() - 0.5) * FR;
      p.size = (1 + Math.random() * 2) * scale;
      break;
    case "void_particles":
      p.vx = (Math.random() * 2 - 1) * FR;
      p.vy = (Math.random() * 2 - 1) * FR;
      p.size = (1 + Math.random() * 3) * scale;
      break;
    case "crystal_shimmer":
      p.vx = 0;
      p.vy = 0;
      p.size = 1 * scale;
      p.alpha = Math.random();
      break;
    case "plague_spores":
      p.vy = (-0.3 - Math.random() * 0.5) * FR;
      p.vx = (Math.random() - 0.5) * FR;
      p.size = (2 + Math.random() * 3) * scale;
      break;
    case "underwater_bubbles":
      p.vy = (-1 - Math.random()) * FR;
      p.vx = (Math.random() * 0.3 - 0.15) * FR;
      p.size = (2 + Math.random() * 4) * scale;
      break;
    case "fireflies":
      p.vx = (Math.random() - 0.5) * FR;
      p.vy = (Math.random() - 0.5) * FR;
      p.size = 2 * scale;
      break;
    case "falling_leaves":
      p.vy = (0.5 + Math.random()) * FR;
      p.vx = (0.5 + Math.random()) * FR;
      p.size = (3 + Math.random() * 3) * scale;
      break;
    default: {
      const _exhaustive: never = type;
      void _exhaustive;
    }
  }
}

export function DungeonWeather({ params }: { params: EffectProps }) {
  const weather = String(params.weather ?? "rain") as Weather;
  const density = Number(params.density);
  const speed = Number(params.speed);
  const wind = Number(params.wind);
  const colorMode = String(params.colorMode ?? "signature");
  const { hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const scale = Math.max(1, Math.min(width, height) / 360);
      const cap = 800;
      const target = Math.min(
        cap,
        Math.max(24, Math.round((density * width * height) / 4500))
      );
      const pool = new Pool<Particle>(cap, makeParticle);
      for (let i = 0; i < target; i++) {
        pool.spawn((p) => initParticle(p, weather, width, height, scale));
      }

      const sig = SIGNATURE[weather];
      const tinted = colorMode !== "signature";
      const mode = colorMode as ColorMode;

      // Resolve a particle's hue/colour respecting the signature-or-tint choice.
      const colorAt = (t: number, light: number, alpha: number): string => {
        if (tinted) {
          return `hsla(${paletteHue(mode, hue, hue2, t)}, 90%, ${light}%, ${alpha})`;
        }
        return `hsla(${sig.h}, ${sig.s}%, ${Math.min(98, sig.l + (light - 60))}%, ${alpha})`;
      };

      const windPx = wind * 90;

      return {
        clearMode: "full",
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          pool.update((p) => {
            p.x += (p.vx * speed + windPx) * dt;
            p.y += p.vy * speed * dt;
            p.life += dt;
            if (p.x > width) p.x = 0;
            else if (p.x < 0) p.x = width;
            if (p.y > height) p.y = 0;
            else if (p.y < 0) p.y = height;
            if (p.life >= p.maxLife) {
              initParticle(p, weather, width, height, scale);
            }
            return true;
          });

          pool.forEach((p) => {
            const fadeIn = Math.min(1, p.life / 0.35);
            const fadeOut = Math.min(1, (p.maxLife - p.life) / 0.35);
            const baseA = p.alpha * fadeIn * fadeOut;
            const ft = (p.x / width + p.y / height) * 0.5;

            switch (weather) {
              case "rain": {
                c.strokeStyle = colorAt(ft, 70, baseA);
                c.lineWidth = Math.max(1, p.size);
                c.beginPath();
                c.moveTo(p.x, p.y);
                c.lineTo(p.x - windPx * 0.012, p.y + p.size * 6);
                c.stroke();
                break;
              }
              case "snow": {
                const sway = Math.sin(t * 1.5 + p.spin) * p.size * 1.5;
                c.fillStyle = colorAt(ft, 92, baseA);
                c.beginPath();
                c.arc(p.x + sway, p.y, p.size, 0, Math.PI * 2);
                c.fill();
                break;
              }
              case "sandstorm": {
                c.fillStyle = colorAt(ft, 60, baseA * 0.8);
                c.fillRect(p.x, p.y, p.size * 3, p.size);
                break;
              }
              case "volcanic_ash": {
                c.fillStyle = colorAt(0.2, 52, baseA);
                c.beginPath();
                c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                c.fill();
                break;
              }
              case "void_particles": {
                c.globalCompositeOperation = "lighter";
                c.fillStyle = colorAt(ft, 58, baseA);
                c.beginPath();
                c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                c.fill();
                c.globalCompositeOperation = "source-over";
                break;
              }
              case "crystal_shimmer": {
                const tw = Math.abs(Math.sin(p.life * 6 + p.spin));
                c.fillStyle = colorAt(ft, 70, baseA * tw);
                const s = p.size * (1.5 + tw * 2.5);
                c.fillRect(p.x - s / 2, p.y - s / 2, s, s);
                break;
              }
              case "plague_spores": {
                c.fillStyle = colorAt(ft, 45, baseA * 0.7);
                c.beginPath();
                c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                c.fill();
                break;
              }
              case "underwater_bubbles": {
                c.strokeStyle = colorAt(ft, 80, baseA);
                c.lineWidth = Math.max(1, p.size * 0.3);
                c.beginPath();
                c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                c.stroke();
                break;
              }
              case "fireflies": {
                const glow = 0.5 + 0.5 * Math.sin(t * 3 + p.spin);
                c.globalCompositeOperation = "lighter";
                const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
                g.addColorStop(0, colorAt(ft, 70, baseA * glow));
                g.addColorStop(1, colorAt(ft, 60, 0));
                c.fillStyle = g;
                c.beginPath();
                c.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
                c.fill();
                c.globalCompositeOperation = "source-over";
                break;
              }
              case "falling_leaves": {
                const rot = p.life * 2 + p.spin;
                c.save();
                c.translate(p.x, p.y);
                c.rotate(rot);
                c.fillStyle = colorAt(ft, 48, baseA);
                c.fillRect(-p.size * 0.6, -p.size * 0.4, p.size * 1.2, p.size * 0.8);
                c.restore();
                break;
              }
              default: {
                const _exhaustive: never = weather;
                void _exhaustive;
              }
            }
          });

          c.globalAlpha = 1;
        },
      };
    },
    [weather, density, speed, wind, colorMode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
