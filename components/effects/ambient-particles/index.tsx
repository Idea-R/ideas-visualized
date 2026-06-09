"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  hue: number;
}

export function AmbientParticles({ params }: { params: EffectProps }) {
  const density = Number(params.density);
  const linkDist = Number(params.linkDist);
  const force = Number(params.force);
  const attract = String(params.mode) === "attract";
  const { mode: colorMode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const count = Math.max(
        12,
        Math.floor((width * height) / (16000 / density))
      );
      // Hue per node spread across the field: t = index / count. Rainbow paints
      // a full spectrum, Dual blends hue→hue2, Single keeps one hue.
      const nodes: Node[] = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        hue: paletteHue(colorMode, hue, hue2, count > 1 ? i / (count - 1) : 0),
      }));
      const linkHue = paletteHue(colorMode, hue, hue2, 0.5);
      const mouse = { x: -9999, y: -9999 };

      return {
        onPointer: (x, y, type) => {
          if (type === "leave") {
            mouse.x = -9999;
            mouse.y = -9999;
          } else {
            mouse.x = x;
            mouse.y = y;
          }
        },
        draw: (c, dt, t) => {
          // Harness clears each frame (clearMode "full") — crisp, no ghosting.
          for (const n of nodes) {
            n.x += n.vx * dt * 60;
            n.y += n.vy * dt * 60;
            if (n.x < 0 || n.x > width) n.vx *= -1;
            if (n.y < 0 || n.y > height) n.vy *= -1;

            const dx = n.x - mouse.x;
            const dy = n.y - mouse.y;
            const d = Math.hypot(dx, dy);
            if (d < 150 && d > 0.01) {
              const f = ((attract ? -1 : 1) * force * (150 - d)) / 150;
              n.x += (dx / d) * f;
              n.y += (dy / d) * f;
            }
          }

          // links
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const a = nodes[i];
              const b = nodes[j];
              const d = Math.hypot(a.x - b.x, a.y - b.y);
              if (d < linkDist) {
                const alpha = (1 - d / linkDist) * 0.4;
                const grad = c.createLinearGradient(a.x, a.y, b.x, b.y);
                // Endpoints fade toward each node's hue; in Single mode both
                // collapse to the same hue (the midpoint), so links stay solid.
                grad.addColorStop(
                  0,
                  `hsla(${colorMode === "single" ? linkHue : a.hue}, 85%, 65%, ${alpha})`
                );
                grad.addColorStop(
                  1,
                  `hsla(${colorMode === "single" ? linkHue : b.hue}, 85%, 65%, ${alpha})`
                );
                c.strokeStyle = grad;
                c.lineWidth = 1;
                c.beginPath();
                c.moveTo(a.x, a.y);
                c.lineTo(b.x, b.y);
                c.stroke();
              }
            }
          }

          // glow nodes
          for (const n of nodes) {
            const pulse = 0.6 + 0.4 * Math.sin(t * 2 + n.phase);
            const r = n.r * (1 + pulse * 0.5);
            const grad = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
            grad.addColorStop(0, `hsla(${n.hue}, 90%, 80%, ${0.7 * pulse})`);
            grad.addColorStop(1, `hsla(${n.hue}, 90%, 80%, 0)`);
            c.fillStyle = grad;
            c.beginPath();
            c.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
            c.fill();
          }
        },
      };
    },
    [density, linkDist, force, attract, colorMode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
