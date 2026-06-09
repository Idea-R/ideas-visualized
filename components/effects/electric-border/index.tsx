"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

// Cheap hash-based value noise (ported from the source's random/noise2D pair).
function random(x: number): number {
  return (Math.sin(x * 12.9898) * 43758.5453) % 1;
}

function noise2D(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const a = random(i + j * 57);
  const b = random(i + 1 + j * 57);
  const c = random(i + (j + 1) * 57);
  const d = random(i + 1 + (j + 1) * 57);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}

function octavedNoise(
  x: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  baseAmplitude: number,
  baseFrequency: number,
  time: number,
  seed: number
): number {
  let y = 0;
  let amplitude = baseAmplitude;
  let frequency = baseFrequency;
  for (let i = 0; i < octaves; i++) {
    y += amplitude * noise2D(frequency * x + seed * 100, time * frequency * 0.3);
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return y;
}

function cornerPoint(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  arcLength: number,
  progress: number
): { x: number; y: number } {
  const angle = startAngle + progress * arcLength;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

// Map t in [0,1] to a point traveling clockwise around a rounded rectangle.
function roundedRectPoint(
  t: number,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number
): { x: number; y: number } {
  const sw = width - 2 * radius;
  const sh = height - 2 * radius;
  const arc = (Math.PI * radius) / 2;
  const perim = 2 * sw + 2 * sh + 4 * arc;
  let d = t * perim;
  let acc = 0;

  if (d <= acc + sw) return { x: left + radius + (d - acc) / sw * sw, y: top };
  acc += sw;
  if (d <= acc + arc)
    return cornerPoint(left + width - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2, (d - acc) / arc);
  acc += arc;
  if (d <= acc + sh) return { x: left + width, y: top + radius + ((d - acc) / sh) * sh };
  acc += sh;
  if (d <= acc + arc)
    return cornerPoint(left + width - radius, top + height - radius, radius, 0, Math.PI / 2, (d - acc) / arc);
  acc += arc;
  if (d <= acc + sw) return { x: left + width - radius - ((d - acc) / sw) * sw, y: top + height };
  acc += sw;
  if (d <= acc + arc)
    return cornerPoint(left + radius, top + height - radius, radius, Math.PI / 2, Math.PI / 2, (d - acc) / arc);
  acc += arc;
  if (d <= acc + sh) return { x: left, y: top + height - radius - ((d - acc) / sh) * sh };
  acc += sh;
  return cornerPoint(left + radius, top + radius, radius, Math.PI, Math.PI / 2, (d - acc) / arc);
}

export function ElectricBorder({ params }: { params: EffectProps }) {
  const intensity = Number(params.intensity ?? 1);
  const chaos = Number(params.chaos ?? 0.12);
  const speed = Number(params.speed ?? 1);
  const cornerRadius = Number(params.radius ?? 28);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const left = width * 0.15;
      const top = height * 0.15;
      const w = width * 0.7;
      const h = height * 0.7;
      const maxRadius = Math.min(w, h) / 2;
      const radius = Math.max(0, Math.min(cornerRadius, maxRadius));
      const displacement = Math.min(w, h) * 0.1 * intensity;

      const octaves = 10;
      const lacunarity = 1.6;
      const gain = 0.7;
      const frequency = 10;

      const perim = 2 * (w + h) + 2 * Math.PI * radius;
      const sampleCount = Math.max(80, Math.floor(perim / 6));

      const xs = new Float32Array(sampleCount + 1);
      const ys = new Float32Array(sampleCount + 1);
      const hues = new Float32Array(sampleCount + 1);

      let time = 0;

      const passes = [
        { width: 7 * intensity, alpha: 0.07 },
        { width: 3.4 * intensity, alpha: 0.16 },
        { width: 1.4, alpha: 0.95 },
      ];

      return {
        clearMode: "full",
        draw: (c) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          time += (1 / 60) * speed;

          for (let i = 0; i <= sampleCount; i++) {
            const progress = i / sampleCount;
            const p = roundedRectPoint(progress, left, top, w, h, radius);
            const xn = octavedNoise(progress * 8, octaves, lacunarity, gain, chaos, frequency, time, 0);
            const yn = octavedNoise(progress * 8, octaves, lacunarity, gain, chaos, frequency, time, 1);
            xs[i] = p.x + xn * displacement;
            ys[i] = p.y + yn * displacement;
            hues[i] = paletteHue(mode, hue, hue2, progress);
          }

          c.globalCompositeOperation = "lighter";
          c.lineCap = "round";
          c.lineJoin = "round";

          for (const pass of passes) {
            c.lineWidth = pass.width;
            c.globalAlpha = pass.alpha;
            for (let i = 0; i < sampleCount; i++) {
              c.strokeStyle = `hsl(${hues[i]}, 100%, ${pass.width > 4 ? 60 : 78}%)`;
              c.beginPath();
              c.moveTo(xs[i], ys[i]);
              c.lineTo(xs[i + 1], ys[i + 1]);
              c.stroke();
            }
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [intensity, chaos, speed, cornerRadius, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
