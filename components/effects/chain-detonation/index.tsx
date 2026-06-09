"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import { Pool } from "@/lib/effects/pool";
import type { EffectProps } from "@/lib/effects/types";

interface Node {
  x: number;
  y: number;
  at: number;
  done: boolean;
  hueT: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  hueT: number;
}

interface Frag {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hueT: number;
}

export function ChainDetonation({ params }: { params: EffectProps }) {
  const chainLength = Math.max(2, Math.round(Number(params.chainLength)));
  const blastPower = Number(params.blastPower);
  const linkIntensity = Number(params.linkIntensity);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const minDim = Math.min(width, height);
      const jumpBase = minDim * 0.16;
      const jumpRange = minDim * 0.14;
      const margin = minDim * 0.08;

      const fragments = new Pool<Frag>(600, () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        max: 1,
        size: 1,
        hueT: 0,
      }));
      const rings = new Pool<Ring>(80, () => ({
        x: 0,
        y: 0,
        r: 0,
        maxR: 0,
        life: 0,
        hueT: 0,
      }));

      let nodes: Node[] = [];
      let screenGlow = 0;
      let autoTimer = 0;
      const autoInterval = 2.8;

      const detonate = (node: Node) => {
        node.done = true;
        rings.spawn((r) => {
          r.x = node.x;
          r.y = node.y;
          r.r = 0;
          r.maxR = (60 + blastPower * 36) * (0.7 + Math.random() * 0.3);
          r.life = 1;
          r.hueT = node.hueT;
        });
        const fragCount = Math.round(8 + blastPower * 5);
        for (let i = 0; i < fragCount; i++) {
          fragments.spawn((f) => {
            const ang = Math.random() * Math.PI * 2;
            const sp = (60 + Math.random() * 160) * (0.6 + blastPower * 0.18);
            f.x = node.x;
            f.y = node.y;
            f.vx = Math.cos(ang) * sp;
            f.vy = Math.sin(ang) * sp;
            f.max = 0.5 + Math.random() * 0.6;
            f.life = f.max;
            f.size = 1.4 + Math.random() * 2.2;
            f.hueT = node.hueT;
          });
        }
        screenGlow = Math.min(1, screenGlow + 0.45);
      };

      const newChain = (ox: number, oy: number, now: number) => {
        nodes = [];
        let x = ox;
        let y = oy;
        for (let i = 0; i < chainLength; i++) {
          nodes.push({
            x,
            y,
            at: now + i * 0.13,
            done: false,
            hueT: chainLength > 1 ? i / (chainLength - 1) : 0,
          });
          const ang = Math.random() * Math.PI * 2;
          const dist = jumpBase + Math.random() * jumpRange;
          x = Math.max(margin, Math.min(width - margin, x + Math.cos(ang) * dist));
          y = Math.max(margin, Math.min(height - margin, y + Math.sin(ang) * dist));
        }
      };

      // Jagged electric arc between two points (additive glow already on).
      const electricArc = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        hueT: number,
        intensity: number
      ) => {
        const segments = 9;
        const perp = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
        const maxOffset = (10 + linkIntensity * 14) * intensity;
        const hueVal = paletteHue(mode, hue, hue2, hueT);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        for (let i = 1; i <= segments; i++) {
          const p = i / segments;
          const bx = x1 + (x2 - x1) * p;
          const by = y1 + (y2 - y1) * p;
          const off =
            i === segments ? 0 : (Math.random() - 0.5) * maxOffset;
          ctx.lineTo(bx + Math.cos(perp) * off, by + Math.sin(perp) * off);
        }
        ctx.strokeStyle = `hsl(${hueVal}, 90%, 60%)`;
        ctx.lineWidth = (1.4 + linkIntensity * 1.6) * intensity;
        ctx.shadowColor = `hsl(${hueVal}, 90%, 60%)`;
        ctx.shadowBlur = 12 * intensity;
        ctx.stroke();
        // Bright white core.
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 1 * intensity;
        ctx.shadowBlur = 0;
        ctx.stroke();
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") {
            newChain(x, y, performance.now() / 1000);
            autoTimer = 0;
          }
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          autoTimer += dt;
          if (autoTimer >= autoInterval) {
            autoTimer = 0;
            newChain(
              width * (0.25 + Math.random() * 0.5),
              height * (0.25 + Math.random() * 0.5),
              t
            );
          }

          for (const n of nodes) {
            if (!n.done && t >= n.at) detonate(n);
          }

          screenGlow = Math.max(0, screenGlow - dt * 1.4);

          rings.update((r) => {
            r.r += (r.maxR / 0.6) * dt;
            r.life -= dt * 1.6;
            return r.life > 0 && r.r < r.maxR * 1.2;
          });
          fragments.update((f) => {
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            f.vx *= 0.96;
            f.vy = f.vy * 0.96 + 40 * dt;
            f.life -= dt;
            return f.life > 0;
          });

          // Screen-edge glow flash.
          if (screenGlow > 0.001) {
            const hueVal = paletteHue(mode, hue, hue2, 0.5);
            const grad = c.createRadialGradient(
              width / 2,
              height / 2,
              0,
              width / 2,
              height / 2,
              Math.max(width, height) / 2
            );
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(0.7, "rgba(0,0,0,0)");
            grad.addColorStop(1, `hsla(${hueVal}, 90%, 55%, ${screenGlow * 0.45})`);
            c.fillStyle = grad;
            c.fillRect(0, 0, width, height);
          }

          c.globalCompositeOperation = "lighter";

          // Electric links between chained blast points.
          for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i];
            const b = nodes[i + 1];
            if (!a.done) continue;
            // Full-strength link once both ends fired; a reaching arc to the
            // not-yet-detonated next node hints at the propagation.
            const intensity = b.done ? 1 : 0.5;
            electricArc(a.x, a.y, b.x, b.y, (a.hueT + b.hueT) / 2, intensity);
          }

          // Expanding shock rings.
          rings.forEach((r) => {
            const hueVal = paletteHue(mode, hue, hue2, r.hueT);
            const a = Math.max(0, r.life);
            c.strokeStyle = `hsla(${hueVal}, 90%, 62%, ${a})`;
            c.lineWidth = 2 + blastPower * 0.8;
            c.shadowColor = `hsl(${hueVal}, 90%, 62%)`;
            c.shadowBlur = 16;
            c.beginPath();
            c.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            c.stroke();
            c.strokeStyle = `rgba(255,255,255,${a * 0.6})`;
            c.lineWidth = 1.4;
            c.shadowBlur = 0;
            c.beginPath();
            c.arc(r.x, r.y, r.r * 0.82, 0, Math.PI * 2);
            c.stroke();
          });

          // Fragments.
          fragments.forEach((f) => {
            const a = Math.max(0, f.life / f.max);
            const hueVal = paletteHue(mode, hue, hue2, f.hueT);
            c.fillStyle = `hsla(${hueVal}, 95%, 66%, ${a})`;
            c.shadowColor = `hsl(${hueVal}, 95%, 66%)`;
            c.shadowBlur = 8;
            c.beginPath();
            c.arc(f.x, f.y, f.size * a, 0, Math.PI * 2);
            c.fill();
          });

          // Bright blast cores at detonated nodes (briefly).
          for (const n of nodes) {
            if (!n.done) continue;
            const hueVal = paletteHue(mode, hue, hue2, n.hueT);
            c.fillStyle = `hsl(${hueVal}, 100%, 85%)`;
            c.shadowColor = `hsl(${hueVal}, 100%, 70%)`;
            c.shadowBlur = 18;
            c.beginPath();
            c.arc(n.x, n.y, 3 + blastPower * 0.5, 0, Math.PI * 2);
            c.fill();
          }

          c.shadowBlur = 0;
          c.globalCompositeOperation = "source-over";
        },
        cleanup: () => {
          fragments.clear();
          rings.clear();
        },
      };
    },
    [chainLength, blastPower, linkIntensity, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
