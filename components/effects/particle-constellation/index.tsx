"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface CParticle {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  progress: number;
  delay: number;
  alpha: number;
  size: number;
  hue: number;
  pulse: number;
}

type ShapeName = "triangle" | "hexagon" | "star" | "spiral";

const SHAPES: ShapeName[] = ["triangle", "hexagon", "star", "spiral"];

// All generators return normalized points roughly within [-0.5, 0.5].
function polygonVertices(sides: number, radius: number, rot: number) {
  const v: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    v.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
  }
  return v;
}

function starVertices(spikes: number, outer: number, inner: number, rot: number) {
  const v: { x: number; y: number }[] = [];
  const total = spikes * 2;
  for (let i = 0; i < total; i++) {
    const a = rot + (i / total) * Math.PI * 2;
    const r = i % 2 === 0 ? outer : inner;
    v.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return v;
}

// Evenly distribute `count` points along the perimeter of a closed polygon.
function distributeClosed(verts: { x: number; y: number }[], count: number) {
  const n = verts.length;
  const segs: { ax: number; ay: number; bx: number; by: number; len: number }[] =
    [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, len });
    total += len;
  }
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    let d = (i / count) * total;
    for (let s = 0; s < segs.length; s++) {
      const seg = segs[s];
      if (d <= seg.len || s === segs.length - 1) {
        const t = seg.len > 0 ? d / seg.len : 0;
        pts.push({
          x: seg.ax + (seg.bx - seg.ax) * t,
          y: seg.ay + (seg.by - seg.ay) * t,
        });
        break;
      }
      d -= seg.len;
    }
  }
  return pts;
}

function generateShapePoints(shape: ShapeName, count: number) {
  const rot = -Math.PI / 2; // point shapes "up"
  switch (shape) {
    case "triangle":
      return distributeClosed(polygonVertices(3, 0.5, rot), count);
    case "hexagon":
      return distributeClosed(polygonVertices(6, 0.5, rot), count);
    case "star":
      return distributeClosed(starVertices(5, 0.5, 0.22, rot), count);
    case "spiral": {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0;
        const angle = rot + t * Math.PI * 6; // 3 full rotations
        const radius = t * 0.55;
        pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      return pts;
    }
  }
}

const HOLD_DUR = 2.6;
const SCATTER_DUR = 1.3;

export function ParticleConstellation({ params }: { params: EffectProps }) {
  const shape = String(params.shape);
  const count = Math.max(40, Math.round(Number(params.points)));
  const links = Boolean(params.links);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.7;
      const linkDist = Math.min(width, height) * 0.16;
      const linkDist2 = linkDist * linkDist;

      // Fixed array, sized once. Re-formations reuse these same objects.
      const particles: CParticle[] = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: 0,
          y: 0,
          sx: 0,
          sy: 0,
          tx: 0,
          ty: 0,
          vx: 0,
          vy: 0,
          progress: 0,
          delay: 0,
          alpha: 0,
          size: 1.2 + Math.random() * 1.6,
          hue: paletteHue(mode, hue, hue2, count > 1 ? i / count : 0) + (Math.random() * 16 - 8),
          pulse: Math.random() * Math.PI * 2,
        });
      }

      let phase: "form" | "hold" | "scatter" = "form";
      let timer = 0;
      let shapeIndex = 0;

      const activeShape = (): ShapeName =>
        shape === "cycle"
          ? SHAPES[shapeIndex % SHAPES.length]
          : (shape as ShapeName);

      const beginForm = () => {
        const pts = generateShapePoints(activeShape(), count);
        const border = Math.floor(Math.random() * 4); // 0=top 1=right 2=bottom 3=left
        for (let i = 0; i < count; i++) {
          const p = particles[i];
          const offset = (Math.random() - 0.5) * 0.7;
          let sx = 0;
          let sy = 0;
          switch (border) {
            case 0:
              sx = width * (0.5 + offset);
              sy = -30;
              break;
            case 1:
              sx = width + 30;
              sy = height * (0.5 + offset);
              break;
            case 2:
              sx = width * (0.5 + offset);
              sy = height + 30;
              break;
            default:
              sx = -30;
              sy = height * (0.5 + offset);
              break;
          }
          p.sx = sx;
          p.sy = sy;
          p.x = sx;
          p.y = sy;
          p.tx = cx + pts[i].x * scale;
          p.ty = cy + pts[i].y * scale;
          p.vx = 0;
          p.vy = 0;
          p.progress = 0;
          p.delay = Math.random() * 0.6;
          p.alpha = 0;
        }
        phase = "form";
        timer = 0;
      };

      const beginScatter = () => {
        for (const p of particles) {
          const ang =
            Math.atan2(p.ty - cy, p.tx - cx) + (Math.random() - 0.5) * 0.8;
          const sp = 120 + Math.random() * 220;
          p.x = p.tx;
          p.y = p.ty;
          p.vx = Math.cos(ang) * sp;
          p.vy = Math.sin(ang) * sp;
          p.alpha = 1;
        }
        phase = "scatter";
        timer = 0;
      };

      const goNext = () => {
        if (shape === "cycle") shapeIndex++;
        beginForm();
      };

      beginForm();

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") goNext();
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          timer += dt;

          if (phase === "form") {
            let allDone = true;
            for (const p of particles) {
              if (p.delay > 0) {
                p.delay -= dt;
                allDone = false;
                continue;
              }
              if (p.progress < 1) {
                p.progress = Math.min(1, p.progress + dt * 0.9);
                const ease = 1 - Math.pow(1 - p.progress, 3);
                p.x = p.sx + (p.tx - p.sx) * ease;
                p.y = p.sy + (p.ty - p.sy) * ease;
                p.alpha = p.progress;
                if (p.progress < 1) allDone = false;
              } else {
                p.x = p.tx;
                p.y = p.ty;
                p.alpha = 1;
              }
            }
            if (allDone) {
              phase = "hold";
              timer = 0;
            }
          } else if (phase === "hold") {
            for (const p of particles) {
              p.x = p.tx;
              p.y = p.ty;
              p.alpha = 1;
            }
            if (timer > HOLD_DUR) beginScatter();
          } else {
            for (const p of particles) {
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.vx *= 0.99;
              p.vy *= 0.99;
              p.alpha -= dt * 0.9;
            }
            if (timer > SCATTER_DUR) goNext();
          }

          c.globalCompositeOperation = "lighter";

          // Constellation connecting lines between nearby formed particles.
          if (links && phase !== "scatter") {
            c.lineWidth = 1;
            for (let i = 0; i < count; i++) {
              const a = particles[i];
              if (a.alpha <= 0.05) continue;
              for (let j = i + 1; j < count; j++) {
                const b = particles[j];
                if (b.alpha <= 0.05) continue;
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 >= linkDist2) continue;
                const la =
                  (1 - Math.sqrt(d2) / linkDist) *
                  0.5 *
                  Math.min(a.alpha, b.alpha);
                if (la <= 0.01) continue;
                c.globalAlpha = la;
                c.strokeStyle = `hsl(${hue}, 90%, 62%)`;
                c.beginPath();
                c.moveTo(a.x, a.y);
                c.lineTo(b.x, b.y);
                c.stroke();
              }
            }
          }

          const pulsing = phase !== "scatter";
          for (const p of particles) {
            const a = Math.max(0, p.alpha);
            if (a <= 0) continue;
            const pulse = pulsing ? 1 + Math.sin(t * 3 + p.pulse) * 0.25 : 1;
            const r = p.size * pulse;
            c.globalAlpha = a * 0.9;
            c.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
            c.beginPath();
            c.arc(p.x, p.y, r, 0, Math.PI * 2);
            c.fill();
            c.globalAlpha = a * 0.5;
            c.fillStyle = `hsl(${p.hue}, 100%, 82%)`;
            c.beginPath();
            c.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2);
            c.fill();
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [shape, count, links, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
