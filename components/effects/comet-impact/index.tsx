"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

const MAX_TRAIL = 40; // hard cap; the `trail` param selects how many we keep

interface Comet {
  x: number;
  y: number;
  cx: number; // impact target
  cy: number;
  angle: number;
  radius: number;
  angVel: number;
  radVel: number;
  wobblePhase: number;
  life: number;
  size: number;
  hue: number;
  // Explicit history-buffer trail (oldest..newest in [0, trailN)).
  tx: Float32Array;
  ty: Float32Array;
  trailN: number;
}

function makeComet(): Comet {
  return {
    x: 0,
    y: 0,
    cx: 0,
    cy: 0,
    angle: 0,
    radius: 0,
    angVel: 0,
    radVel: 0,
    wobblePhase: 0,
    life: 1,
    size: 8,
    hue: 200,
    tx: new Float32Array(MAX_TRAIL),
    ty: new Float32Array(MAX_TRAIL),
    trailN: 0,
  };
}

interface Ring {
  x: number;
  y: number;
  progress: number;
  base: number; // base radius scale
  life: number;
  hue: number;
}

function makeRing(): Ring {
  return { x: 0, y: 0, progress: 0, base: 80, life: 1, hue: 200 };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number; // converge target
  ty: number;
  angle: number;
  angVel: number;
  life: number;
  size: number;
  hue: number;
}

function makeParticle(): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    angle: 0,
    angVel: 0,
    life: 1,
    size: 2,
    hue: 200,
  };
}

interface Flash {
  x: number;
  y: number;
  life: number;
  size: number;
  hue: number;
}

function makeFlash(): Flash {
  return { x: 0, y: 0, life: 1, size: 60, hue: 200 };
}

export function CometImpact({ params }: { params: EffectProps }) {
  const spiral = Number(params.spiral);
  const trail = Math.max(2, Math.min(MAX_TRAIL, Math.round(Number(params.trail))));
  const converge = Boolean(params.converge);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const comets = new Pool<Comet>(16, makeComet);
      const rings = new Pool<Ring>(48, makeRing);
      const particles = new Pool<Particle>(900, makeParticle);
      const flashes = new Pool<Flash>(24, makeFlash);

      let elapsed = 0;
      let autoTimer = 0.8;

      const launchComet = (tx: number, ty: number) => {
        comets.spawn((cm) => {
          cm.cx = tx;
          cm.cy = ty;

          // Start just outside a random screen edge.
          const edge = Math.floor(Math.random() * 4);
          if (edge === 0) {
            cm.x = Math.random() * width;
            cm.y = -50;
          } else if (edge === 1) {
            cm.x = width + 50;
            cm.y = Math.random() * height;
          } else if (edge === 2) {
            cm.x = Math.random() * width;
            cm.y = height + 50;
          } else {
            cm.x = -50;
            cm.y = Math.random() * height;
          }

          const dx = cm.x - cm.cx;
          const dy = cm.y - cm.cy;
          cm.radius = Math.max(20, Math.hypot(dx, dy));
          cm.angle = Math.atan2(dy, dx);
          // `spiral` scales how fast it sweeps around as it falls inward.
          cm.angVel = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6) * spiral;
          cm.radVel = -(140 + Math.random() * 80);
          cm.wobblePhase = Math.random() * Math.PI * 2;
          cm.life = 1;
          cm.size = 6 + Math.random() * 6;
          // Each comet (and its whole chain) gets one palette hue.
          const chargeT = Math.random();
          cm.hue = paletteHue(mode, hue, hue2, chargeT) + (Math.random() - 0.5) * 24;
          cm.trailN = 0;
        });
      };

      const impact = (x: number, y: number, h: number) => {
        flashes.spawn((f) => {
          f.x = x;
          f.y = y;
          f.life = 1;
          f.size = 70 + Math.random() * 30;
          f.hue = h;
        });

        if (!converge) return;

        rings.spawn((r) => {
          r.x = x;
          r.y = y;
          r.progress = 0;
          r.base = 70 + Math.random() * 30;
          r.life = 1;
          r.hue = h;
        });

        const count = 22 + Math.floor(Math.random() * 14);
        for (let i = 0; i < count; i++) {
          particles.spawn((p) => {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            const r = 80 + Math.random() * 90;
            const sx = x + Math.cos(a) * r;
            const sy = y + Math.sin(a) * r;
            const dist = Math.max(1, Math.hypot(x - sx, y - sy));
            const speed = 200 + Math.random() * 150;
            p.x = sx;
            p.y = sy;
            p.tx = x;
            p.ty = y;
            p.vx = ((x - sx) / dist) * speed;
            p.vy = ((y - sy) / dist) * speed;
            p.angle = Math.atan2(y - sy, x - sx);
            p.angVel = (Math.random() - 0.5) * 8 * (0.4 + spiral);
            p.life = 1;
            p.size = 2 + Math.random() * 3;
            // Spread converging particles around the ring so Rainbow fans out.
            p.hue = paletteHue(mode, hue, hue2, a / (Math.PI * 2)) + (Math.random() - 0.5) * 20;
          });
        }
      };

      return {
        clearMode: "full" as const,
        onPointer: (x, y, type) => {
          if (type === "down") launchComet(x, y);
        },
        draw: (c, dt, t) => {
          elapsed += dt;

          // Auto-launch with a ramping cadence (slow at first, quickening).
          autoTimer -= dt;
          if (autoTimer <= 0) {
            const ramp = Math.min(1, elapsed / 25);
            autoTimer = (1.7 - ramp * 1.0) + Math.random() * (1.0 - ramp * 0.6);
            launchComet(width * 0.5, height * 0.5);
          }

          // Opaque stage (full clear leaves the canvas transparent).
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";
          c.lineCap = "round";

          // --- Comets: spiral inward toward their target ---
          comets.update((cm) => {
            cm.angle += cm.angVel * dt;
            cm.radius = Math.max(8, cm.radius + cm.radVel * dt);

            const targetX = cm.cx + Math.cos(cm.angle) * cm.radius;
            const targetY = cm.cy + Math.sin(cm.angle) * cm.radius;
            const ease = Math.min(1, 10 * dt);
            cm.x += (targetX - cm.x) * ease;
            cm.y += (targetY - cm.y) * ease;

            const wobble = Math.sin(t * 3 + cm.wobblePhase) * 18;
            cm.x += Math.cos(cm.angle + Math.PI / 2) * wobble * dt;
            cm.y += Math.sin(cm.angle + Math.PI / 2) * wobble * dt;

            // Push current position into the history buffer.
            if (cm.trailN < trail) {
              cm.tx[cm.trailN] = cm.x;
              cm.ty[cm.trailN] = cm.y;
              cm.trailN++;
            } else {
              for (let i = 0; i < trail - 1; i++) {
                cm.tx[i] = cm.tx[i + 1];
                cm.ty[i] = cm.ty[i + 1];
              }
              cm.tx[trail - 1] = cm.x;
              cm.ty[trail - 1] = cm.y;
            }

            if (cm.radius < 40) cm.life -= dt * 1.5;
            if (cm.radius <= 12) {
              impact(cm.x, cm.y, cm.hue);
              return false;
            }
            return cm.life > 0;
          });

          comets.forEach((cm) => {
            // Fading history trail drawn as connected segments.
            for (let i = 1; i < cm.trailN; i++) {
              const a = (i / cm.trailN) * Math.max(0, cm.life) * 0.85;
              if (a <= 0) continue;
              c.strokeStyle = `hsla(${cm.hue}, 95%, 62%, ${a})`;
              c.lineWidth = cm.size * (a + 0.3) * 1.4;
              c.beginPath();
              c.moveTo(cm.tx[i - 1], cm.ty[i - 1]);
              c.lineTo(cm.tx[i], cm.ty[i]);
              c.stroke();
            }

            const la = Math.max(0, cm.life);
            // Glowing head.
            c.fillStyle = `hsla(${cm.hue}, 95%, 60%, ${la * 0.95})`;
            c.beginPath();
            c.arc(cm.x, cm.y, cm.size, 0, Math.PI * 2);
            c.fill();
            // White-hot core.
            c.fillStyle = `rgba(255,255,255,${la * 0.9})`;
            c.beginPath();
            c.arc(cm.x, cm.y, cm.size * 0.5, 0, Math.PI * 2);
            c.fill();
          });

          // --- Shockwave rings ---
          rings.update((r) => {
            r.progress += dt * 2.2;
            r.life = Math.max(0, 1 - r.progress * 1.1);
            return r.life > 0 && r.progress < 1;
          });
          rings.forEach((r) => {
            const radius = r.base * 0.4 + r.progress * r.base * 2.4;
            const grad = c.createRadialGradient(r.x, r.y, radius * 0.8, r.x, r.y, radius);
            grad.addColorStop(0, `hsla(${r.hue}, 100%, 65%, 0)`);
            grad.addColorStop(0.7, `hsla(${r.hue}, 100%, 65%, ${r.life * 0.6})`);
            grad.addColorStop(1, `hsla(${r.hue}, 100%, 70%, 0)`);
            c.globalAlpha = r.life * 0.85;
            c.strokeStyle = grad;
            c.lineWidth = 4 + r.progress * 8;
            c.beginPath();
            c.arc(r.x, r.y, radius, 0, Math.PI * 2);
            c.stroke();

            c.globalAlpha = r.life * 0.9;
            c.strokeStyle = `hsla(${r.hue}, 100%, 75%, ${r.life})`;
            c.lineWidth = 2;
            c.beginPath();
            c.arc(r.x, r.y, radius * 0.9, 0, Math.PI * 2);
            c.stroke();
            c.globalAlpha = 1;
          });

          // --- Converging particles spiral into the impact point ---
          particles.update((p) => {
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 5) {
              const pull = 300 + Math.max(0, 50 - dist) * 10;
              const ang = Math.atan2(dy, dx);
              p.vx += Math.cos(ang) * pull * dt;
              p.vy += Math.sin(ang) * pull * dt;
              p.angle += p.angVel * dt;
              const spin = Math.min(15, dist * 0.1);
              p.vx += Math.cos(p.angle + Math.PI / 2) * spin * dt * 50;
              p.vy += Math.sin(p.angle + Math.PI / 2) * spin * dt * 50;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= (dist < 10 ? 5 : 0.3) * dt;
            return p.life > 0;
          });
          particles.forEach((p) => {
            const a = Math.max(0, p.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
            c.beginPath();
            c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = "#ffffff";
            c.beginPath();
            c.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
            c.fill();
            c.globalAlpha = 1;
          });

          // --- Central impact flash ---
          flashes.update((f) => {
            f.life -= dt * 3.2;
            return f.life > 0;
          });
          flashes.forEach((f) => {
            const a = Math.max(0, f.life);
            const radius = f.size * (1 + (1 - a) * 1.5);
            const grad = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
            grad.addColorStop(0, `rgba(255,255,255,${a * 0.9})`);
            grad.addColorStop(0.4, `hsla(${f.hue}, 100%, 70%, ${a * 0.7})`);
            grad.addColorStop(1, `hsla(${f.hue}, 100%, 60%, 0)`);
            c.fillStyle = grad;
            c.beginPath();
            c.arc(f.x, f.y, radius, 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [spiral, trail, converge, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
