"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  pulsePhase: number;
  pulseSpeed: number;
  t: number; // palette factor [0,1]
}

const BASE_AREA = 240_000;

export function NetworkField({ params }: { params: EffectProps }) {
  const density = Number(params.density ?? 60);
  const linkDistance = Number(params.linkDistance ?? 150);
  const repulsion = Number(params.repulsion ?? 0.15);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const area = width * height;
      const count = Math.max(16, Math.min(400, Math.round((density * area) / BASE_AREA)));
      const linkDist = linkDistance;
      const linkDist2 = linkDist * linkDist;
      const repelDist = Math.max(80, linkDist * 0.8);

      const motes: Mote[] = [];
      for (let i = 0; i < count; i++) {
        motes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.5) * 18,
          radius: Math.random() * 1.8 + 0.6,
          opacity: Math.random() * 0.5 + 0.15,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.6 + Math.random() * 1.2,
          t: Math.random(),
        });
      }

      const mouse = { x: -9999, y: -9999 };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            mouse.x = -9999;
            mouse.y = -9999;
            return;
          }
          mouse.x = x;
          mouse.y = y;
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // ── Update motes ──
          for (const p of motes) {
            if (mouse.x > -9000) {
              const dx = p.x - mouse.x;
              const dy = p.y - mouse.y;
              const dist = Math.hypot(dx, dy);
              if (dist < repelDist && dist > 0.001) {
                const force = ((repelDist - dist) / repelDist) * repulsion;
                p.vx += (dx / dist) * force * 60;
                p.vy += (dy / dist) * force * 60;
              }
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= Math.pow(0.7, dt);
            p.vy *= Math.pow(0.7, dt);

            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            if (p.y > height + 10) p.y = -10;
          }

          c.globalCompositeOperation = "lighter";

          // ── Proximity link lines ──
          c.lineWidth = 0.6;
          for (let i = 0; i < motes.length; i++) {
            const a = motes[i];
            for (let j = i + 1; j < motes.length; j++) {
              const b = motes[j];
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 >= linkDist2) continue;
              const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.18;
              if (alpha <= 0.01) continue;
              const lh = paletteHue(mode, hue, hue2, (a.t + b.t) * 0.5);
              c.globalAlpha = alpha;
              c.strokeStyle = `hsl(${lh}, 80%, 70%)`;
              c.beginPath();
              c.moveTo(a.x, a.y);
              c.lineTo(b.x, b.y);
              c.stroke();
            }
          }

          // ── Mouse link lines ──
          if (mouse.x > -9000) {
            const mDist = Math.max(linkDist * 1.2, 180);
            for (const p of motes) {
              const dx = p.x - mouse.x;
              const dy = p.y - mouse.y;
              const dist = Math.hypot(dx, dy);
              if (dist < mDist) {
                const alpha = (1 - dist / mDist) * 0.22;
                if (alpha <= 0.01) continue;
                c.globalAlpha = alpha;
                c.strokeStyle = `hsl(${paletteHue(mode, hue, hue2, p.t)}, 85%, 72%)`;
                c.lineWidth = 0.9;
                c.beginPath();
                c.moveTo(mouse.x, mouse.y);
                c.lineTo(p.x, p.y);
                c.stroke();
              }
            }
          }

          // ── Draw motes ──
          for (const p of motes) {
            const pulse = Math.sin(p.pulsePhase + t * p.pulseSpeed);
            const alpha = p.opacity * (0.6 + pulse * 0.4);
            const r = p.radius * (0.85 + pulse * 0.15);
            const ph = paletteHue(mode, hue, hue2, p.t);

            const glow = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
            glow.addColorStop(0, `hsla(${ph}, 90%, 68%, ${alpha * 0.5})`);
            glow.addColorStop(1, "transparent");
            c.globalAlpha = 1;
            c.fillStyle = glow;
            c.beginPath();
            c.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = `hsla(${ph}, 90%, 82%, ${alpha})`;
            c.beginPath();
            c.arc(p.x, p.y, r, 0, Math.PI * 2);
            c.fill();
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [density, linkDistance, repulsion, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
