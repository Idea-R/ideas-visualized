"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

// Unit cube: 8 vertices and the 12 edges that connect them.
const VERTS: [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

interface Cube {
  x: number;
  y: number;
  vx: number;
  drift: number;
  driftPhase: number;
  rx: number;
  ry: number;
  rz: number;
  srx: number;
  sry: number;
  srz: number;
  size: number;
  hueT: number;
  pulse: number;
}

export function WireframeCubes({ params }: { params: EffectProps }) {
  const count = Math.max(1, Math.round(Number(params.count)));
  const speed = Number(params.speed);
  const sizeScale = Number(params.size);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      // Camera focal length used for the perspective divide. Vertices nearer
      // the viewer (positive rotated-z) project larger than far ones.
      const focal = 320;

      const reset = (cube: Cube, spawnLeft: boolean) => {
        const base = 22 + Math.random() * 30;
        cube.size = base * sizeScale;
        cube.x = spawnLeft
          ? -cube.size * 2 - Math.random() * width * 0.4
          : Math.random() * width;
        cube.y = height * (0.2 + Math.random() * 0.6);
        cube.vx = (40 + Math.random() * 70) * speed;
        cube.drift = 8 + Math.random() * 22;
        cube.driftPhase = Math.random() * Math.PI * 2;
        cube.rx = Math.random() * Math.PI * 2;
        cube.ry = Math.random() * Math.PI * 2;
        cube.rz = Math.random() * Math.PI * 2;
        cube.srx = (Math.random() - 0.5) * 1.2 * speed;
        cube.sry = (Math.random() - 0.5) * 1.2 * speed;
        cube.srz = (Math.random() - 0.5) * 1.2 * speed;
        cube.hueT = Math.random();
        cube.pulse = Math.random() * Math.PI * 2;
      };

      const cubes: Cube[] = [];
      for (let i = 0; i < count; i++) {
        const cube: Cube = {
          x: 0,
          y: 0,
          vx: 0,
          drift: 0,
          driftPhase: 0,
          rx: 0,
          ry: 0,
          rz: 0,
          srx: 0,
          sry: 0,
          srz: 0,
          size: 0,
          hueT: 0,
          pulse: 0,
        };
        reset(cube, false);
        cubes.push(cube);
      }

      // Scratch buffers reused every frame (no per-frame allocation).
      const px = new Float32Array(8);
      const py = new Float32Array(8);

      return {
        clearMode: "full",
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";
          c.lineCap = "round";

          for (const cube of cubes) {
            cube.x += cube.vx * dt;
            cube.rx += cube.srx * dt;
            cube.ry += cube.sry * dt;
            cube.rz += cube.srz * dt;

            if (cube.x - cube.size * 2 > width) {
              reset(cube, true);
              continue;
            }

            // Time-based pulse replaces the original audio/bass scaling.
            const pulse = 1 + Math.sin(t * 2.4 + cube.pulse) * 0.16;
            const s = (cube.size * pulse) / 2;
            const cx = cube.x;
            const cy =
              cube.y + Math.sin(t * 0.6 + cube.driftPhase) * cube.drift;

            const cosX = Math.cos(cube.rx);
            const sinX = Math.sin(cube.rx);
            const cosY = Math.cos(cube.ry);
            const sinY = Math.sin(cube.ry);
            const cosZ = Math.cos(cube.rz);
            const sinZ = Math.sin(cube.rz);

            for (let i = 0; i < 8; i++) {
              const vx = VERTS[i][0] * s;
              const vy = VERTS[i][1] * s;
              const vz = VERTS[i][2] * s;
              // Rotate X.
              const y1 = vy * cosX - vz * sinX;
              const z1 = vy * sinX + vz * cosX;
              // Rotate Y.
              const x1 = vx * cosY + z1 * sinY;
              const z2 = -vx * sinY + z1 * cosY;
              // Rotate Z.
              const x2 = x1 * cosZ - y1 * sinZ;
              const y2 = x1 * sinZ + y1 * cosZ;
              // Perspective divide.
              const persp = focal / (focal - z2);
              px[i] = cx + x2 * persp;
              py[i] = cy + y2 * persp;
            }

            const hueVal = paletteHue(mode, hue, hue2, cube.hueT);
            c.strokeStyle = `hsl(${hueVal}, 95%, 62%)`;
            c.shadowColor = `hsl(${hueVal}, 95%, 62%)`;
            c.shadowBlur = 10;
            c.lineWidth = 2;

            c.beginPath();
            for (const [a, b] of EDGES) {
              c.moveTo(px[a], py[a]);
              c.lineTo(px[b], py[b]);
            }
            c.stroke();

            // Bright vertex sparks for a crisper "wireframe" feel.
            c.fillStyle = `hsl(${hueVal}, 100%, 80%)`;
            for (let i = 0; i < 8; i++) {
              c.beginPath();
              c.arc(px[i], py[i], 1.6, 0, Math.PI * 2);
              c.fill();
            }
          }

          c.shadowBlur = 0;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [count, speed, sizeScale, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
