"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Star {
  x: number; // world x, offset from warp axis
  y: number; // world y, offset from warp axis
  z: number; // depth toward camera
  px: number; // previous projected screen x (for streaks)
  py: number; // previous projected screen y
  jitter: number; // per-star speed variance
  hueOff: number; // per-star hue jitter
}

function makeStar(): Star {
  return { x: 0, y: 0, z: 1, px: 0, py: 0, jitter: 1, hueOff: 0 };
}

export function WarpField({ params }: { params: EffectProps }) {
  const count = Math.round(Number(params.count));
  const speed = Number(params.speed);
  const { mode, hue, hue2 } = readPalette(params);
  const streaks = Boolean(params.streaks);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const stars = new Pool<Star>(2000, makeStar);
      const focal = Math.max(width, height) * 0.55;
      const maxZ = width * 1.2 + width * 0.2;

      // Steerable warp center: lerps toward the pointer, eases back to middle.
      let cx = width * 0.5;
      let cy = height * 0.5;
      let targetX = width * 0.5;
      let targetY = height * 0.5;

      // Click-and-hold to engage hyperdrive: boost ramps up while the pointer
      // is held and eases back to cruise on release.
      const HYPER = 6;
      let boost = 1;
      let held = false;

      const project = (s: Star) => {
        const sx = (s.x / s.z) * focal + cx;
        const sy = (s.y / s.z) * focal + cy;
        return { sx, sy };
      };

      const respawn = (s: Star) => {
        s.x = (Math.random() - 0.5) * width * 2;
        s.y = (Math.random() - 0.5) * height * 2;
        s.z = Math.random() * width * 1.2 + width * 0.2;
        s.jitter = 0.5 + Math.random() * 1.2;
        s.hueOff = (Math.random() - 0.5) * 50;
        const { sx, sy } = project(s);
        s.px = sx;
        s.py = sy;
      };

      for (let i = 0; i < count; i++) {
        stars.spawn((s) => respawn(s));
      }

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            targetX = width * 0.5;
            targetY = height * 0.5;
            held = false;
            return;
          }
          if (type === "up") {
            held = false;
            return;
          }
          targetX = x;
          targetY = y;
          if (type === "down") held = true;
        },
        draw: (c, dt) => {
          // Opaque stage first (clearMode "full" leaves it transparent).
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Ease the warp center; ramp the hyperdrive boost (fast engage, slow
          // disengage) toward its target.
          cx += (targetX - cx) * Math.min(1, dt * 3);
          cy += (targetY - cy) * Math.min(1, dt * 3);
          const targetBoost = held ? HYPER : 1;
          const ramp = held ? dt * 3.5 : dt * 1.8;
          boost += (targetBoost - boost) * Math.min(1, ramp);

          const zSpeed = focal * speed * boost;

          c.globalCompositeOperation = "lighter";
          c.lineCap = "round";

          stars.forEach((s) => {
            // Record where the star was, then advance it toward the camera.
            const before = project(s);
            s.px = before.sx;
            s.py = before.sy;
            s.z -= zSpeed * s.jitter * dt;
            if (s.z < 1) respawn(s);

            const { sx, sy } = project(s);
            if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) {
              return;
            }

            // Depth factor: 1 near the camera, 0 in the far distance.
            const depth = Math.max(0, Math.min(1, 1 - s.z / maxZ));
            const alpha = 0.25 + depth * 0.75;
            const light = 60 + depth * 40; // whiter as it approaches
            const sat = 90 - depth * 55; // desaturates to white up close
            // Tint by direction around the warp center so Rainbow fans out.
            const dirT = Math.atan2(s.y, s.x) / (Math.PI * 2) + 0.5;
            const starHue = paletteHue(mode, hue, hue2, dirT) + s.hueOff;
            const col = `hsla(${starHue}, ${sat}%, ${light}%, ${alpha})`;

            if (streaks) {
              c.strokeStyle = col;
              c.lineWidth = 0.6 + depth * 2.4;
              c.beginPath();
              c.moveTo(s.px, s.py);
              c.lineTo(sx, sy);
              c.stroke();
            } else {
              c.fillStyle = col;
              c.beginPath();
              c.arc(sx, sy, 0.6 + depth * 2.2, 0, Math.PI * 2);
              c.fill();
            }
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [count, speed, mode, hue, hue2, streaks]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
