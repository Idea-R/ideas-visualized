"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
}

interface Pulse {
  from: number;
  to: number;
  t: number;
  speed: number;
  life: number;
}

export function NeuralNet({ params }: { params: EffectProps }) {
  const count = Math.max(8, Math.round(Number(params.count ?? 48)));
  const linkDist = Number(params.linkDist ?? 150);
  const pulseRate = Number(params.pulseRate ?? 1.2);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const linkDist2 = linkDist * linkDist;
      const nodes: Node[] = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 1.6 + Math.random() * 2.2,
          hue: paletteHue(mode, hue, hue2, count > 1 ? i / count : 0),
        });
      }

      const pulses: Pulse[] = [];
      const maxPulses = 24;
      let spawnAcc = 0;

      // Pick a node within link distance of `from`, optionally excluding `avoid`.
      const pickNeighbor = (from: number, avoid: number): number => {
        const candidates: number[] = [];
        const a = nodes[from];
        for (let i = 0; i < count; i++) {
          if (i === from || i === avoid) continue;
          const dx = a.x - nodes[i].x;
          const dy = a.y - nodes[i].y;
          if (dx * dx + dy * dy < linkDist2) candidates.push(i);
        }
        if (candidates.length === 0) return -1;
        return candidates[(Math.random() * candidates.length) | 0];
      };

      return {
        clearMode: "full",
        draw: (c, dt) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          const step = Math.min(2, dt * 60);

          for (const n of nodes) {
            n.x += n.vx * step;
            n.y += n.vy * step;
            if (n.x < 0 || n.x > width) {
              n.vx *= -1;
              n.x = Math.max(0, Math.min(width, n.x));
            }
            if (n.y < 0 || n.y > height) {
              n.vy *= -1;
              n.y = Math.max(0, Math.min(height, n.y));
            }
          }

          c.globalCompositeOperation = "lighter";

          // Synapse lines.
          c.lineWidth = 1;
          for (let i = 0; i < count; i++) {
            const a = nodes[i];
            for (let j = i + 1; j < count; j++) {
              const b = nodes[j];
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 >= linkDist2) continue;
              const opacity = (1 - Math.sqrt(d2) / linkDist) * 0.35;
              c.globalAlpha = opacity;
              c.strokeStyle = `hsl(${a.hue}, 90%, 60%)`;
              c.beginPath();
              c.moveTo(a.x, a.y);
              c.lineTo(b.x, b.y);
              c.stroke();
            }
          }

          // Spawn new pulses at the configured rate.
          if (pulseRate > 0) {
            spawnAcc += dt * pulseRate;
            while (spawnAcc >= 1 && pulses.length < maxPulses) {
              spawnAcc -= 1;
              const from = (Math.random() * count) | 0;
              const to = pickNeighbor(from, -1);
              if (to >= 0) {
                pulses.push({ from, to, t: 0, speed: 0.6 + Math.random() * 0.8, life: 4 + ((Math.random() * 4) | 0) });
              }
            }
            if (spawnAcc > 4) spawnAcc = 0;
          }

          // Advance + draw traveling pulses (chain along links).
          for (let i = pulses.length - 1; i >= 0; i--) {
            const p = pulses[i];
            p.t += p.speed * dt;
            if (p.t >= 1) {
              const next = pickNeighbor(p.to, p.from);
              if (next >= 0 && p.life > 0) {
                p.from = p.to;
                p.to = next;
                p.t -= 1;
                p.life -= 1;
              } else {
                pulses.splice(i, 1);
                continue;
              }
            }
            const a = nodes[p.from];
            const b = nodes[p.to];
            const px = a.x + (b.x - a.x) * p.t;
            const py = a.y + (b.y - a.y) * p.t;
            const ph = a.hue;
            c.globalAlpha = 0.9;
            c.fillStyle = `hsl(${ph}, 100%, 75%)`;
            c.beginPath();
            c.arc(px, py, 2.6, 0, Math.PI * 2);
            c.fill();
            const g = c.createRadialGradient(px, py, 0, px, py, 12);
            g.addColorStop(0, `hsla(${ph}, 100%, 75%, 0.6)`);
            g.addColorStop(1, `hsla(${ph}, 100%, 75%, 0)`);
            c.fillStyle = g;
            c.beginPath();
            c.arc(px, py, 12, 0, Math.PI * 2);
            c.fill();
          }

          // Sharp nodes with a tight glow.
          for (const n of nodes) {
            const g = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 3);
            g.addColorStop(0, `hsla(${n.hue}, 95%, 65%, 0.5)`);
            g.addColorStop(1, `hsla(${n.hue}, 95%, 65%, 0)`);
            c.globalAlpha = 1;
            c.fillStyle = g;
            c.beginPath();
            c.arc(n.x, n.y, n.size * 3, 0, Math.PI * 2);
            c.fill();

            c.globalAlpha = 0.95;
            c.fillStyle = `hsl(${n.hue}, 100%, 80%)`;
            c.beginPath();
            c.arc(n.x, n.y, n.size, 0, Math.PI * 2);
            c.fill();
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [count, linkDist, pulseRate, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
