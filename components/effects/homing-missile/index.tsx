"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface TrailPoint {
  x: number;
  y: number;
}

interface Missile {
  x: number;
  y: number;
  angle: number;
  speed: number;
  hue: number;
  /** Index into the drifting motes array; -1 when homing the pointer. */
  moteIdx: number;
  usePointer: boolean;
  trail: TrailPoint[];
  trailMax: number;
  alive: boolean;
}

function makeMissile(): Missile {
  return {
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    hue: 0,
    moteIdx: 0,
    usePointer: false,
    trail: [],
    trailMax: 24,
    alive: true,
  };
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

function makeSpark(): Spark {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0 };
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  speed: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeRing(): Ring {
  return { x: 0, y: 0, radius: 0, speed: 0, life: 0, maxLife: 1, hue: 0 };
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function HomingMissile({ params }: { params: EffectProps }) {
  const count = Math.max(1, Math.round(Number(params.count ?? 2)));
  const rate = Number(params.rate ?? 1);
  const speed = Number(params.speed ?? 1);
  const agility = Number(params.agility ?? 1);
  const trailLen = Math.max(6, Math.round(Number(params.trail ?? 24)));
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const missiles = new Pool<Missile>(48, makeMissile);
      const sparks = new Pool<Spark>(1400, makeSpark);
      const rings = new Pool<Ring>(40, makeRing);

      const MOTE_COUNT = 5;
      const motes: Mote[] = Array.from({ length: MOTE_COUNT }, () => ({
        x: 40 + Math.random() * Math.max(1, width - 80),
        y: 40 + Math.random() * Math.max(1, height - 80),
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
      }));

      const pointer = { x: width * 0.5, y: height * 0.5, active: false, life: 0 };
      let autoTimer = 0;
      let seeded = false;
      let launchIndex = 0;

      const targetFor = (m: Missile) => {
        if (m.usePointer) return { x: pointer.x, y: pointer.y };
        const mote = motes[m.moteIdx] ?? motes[0];
        return { x: mote.x, y: mote.y };
      };

      const launch = (toPointer: boolean, seedTrail = false) => {
        missiles.spawn((m) => {
          // Start just outside a random edge, aimed roughly inward.
          const edge = Math.floor(Math.random() * 4);
          let x = 0;
          let y = 0;
          if (edge === 0) {
            x = Math.random() * width;
            y = -20;
          } else if (edge === 1) {
            x = width + 20;
            y = Math.random() * height;
          } else if (edge === 2) {
            x = Math.random() * width;
            y = height + 20;
          } else {
            x = -20;
            y = Math.random() * height;
          }

          m.x = x;
          m.y = y;
          m.usePointer = toPointer && pointer.active;
          m.moteIdx = Math.floor(Math.random() * MOTE_COUNT);
          const tgt = targetFor(m);
          m.angle = Math.atan2(tgt.y - y, tgt.x - x);
          m.speed = (190 + Math.random() * 70) * speed;
          m.hue =
            paletteHue(mode, hue, hue2, (launchIndex++ % 6) / 6) +
            (Math.random() - 0.5) * 16;
          m.trailMax = trailLen;
          m.alive = true;
          m.trail.length = 0;

          if (seedTrail) {
            // Push it inward and lay down a partial trail behind it so the
            // scene looks alive on the very first frame.
            const fwd = 90 + Math.random() * 140;
            m.x += Math.cos(m.angle) * fwd;
            m.y += Math.sin(m.angle) * fwd;
            const back = Math.min(m.trailMax, 8 + Math.floor(Math.random() * 8));
            for (let k = back; k > 0; k--) {
              const d = (k / back) * fwd;
              m.trail.push({
                x: m.x - Math.cos(m.angle) * d,
                y: m.y - Math.sin(m.angle) * d,
              });
            }
          }
        });
      };

      const launchBatch = (toPointer: boolean) => {
        for (let i = 0; i < count; i++) launch(toPointer);
      };

      const explode = (x: number, y: number, h: number) => {
        const sparkCount = 18 + Math.round(Math.random() * 10);
        for (let i = 0; i < sparkCount; i++) {
          sparks.spawn((sp) => {
            const a = Math.random() * Math.PI * 2;
            const v = 70 + Math.random() * 240;
            sp.x = x;
            sp.y = y;
            sp.vx = Math.cos(a) * v;
            sp.vy = Math.sin(a) * v;
            sp.size = 1 + Math.random() * 2;
            sp.life = 1;
            sp.maxLife = 0.4 + Math.random() * 0.5;
            sp.hue = h + (Math.random() - 0.5) * 36;
          });
        }
        rings.spawn((r) => {
          r.x = x;
          r.y = y;
          r.radius = 3;
          r.speed = 220 + Math.random() * 90;
          r.life = 1;
          r.maxLife = 0.6 + Math.random() * 0.25;
          r.hue = h;
        });
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") {
            pointer.x = x;
            pointer.y = y;
            pointer.active = true;
            pointer.life = 2.6;
            missiles.forEach((m) => {
              m.usePointer = true;
            });
            launch(true);
          } else if (type === "move" && pointer.active) {
            pointer.x = x;
            pointer.y = y;
          }
        },
        draw: (c, dt) => {
          if (!seeded) {
            for (let i = 0; i < Math.min(3, Math.max(2, count)); i++) {
              launch(false, true);
            }
            seeded = true;
          }

          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = (1.6 + Math.random() * 1.4) / Math.max(0.25, rate);
            launchBatch(pointer.active);
          }

          if (pointer.active) {
            pointer.life -= dt;
            if (pointer.life <= 0) {
              pointer.active = false;
              missiles.forEach((m) => {
                m.usePointer = false;
              });
            }
          }

          // Drift the target motes and bounce them off the edges.
          for (const mote of motes) {
            mote.x += mote.vx * dt;
            mote.y += mote.vy * dt;
            if (mote.x < 24 || mote.x > width - 24) mote.vx *= -1;
            if (mote.y < 24 || mote.y > height - 24) mote.vy *= -1;
            mote.x = Math.max(24, Math.min(width - 24, mote.x));
            mote.y = Math.max(24, Math.min(height - 24, mote.y));
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          const maxTurn = 2.4 * agility * dt;

          missiles.update((m) => {
            const tgt = targetFor(m);
            const desired = Math.atan2(tgt.y - m.y, tgt.x - m.x);
            // Turn-rate limited steering so paths curve instead of snapping.
            let delta = ((desired - m.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            delta = Math.max(-maxTurn, Math.min(maxTurn, delta));
            m.angle += delta;

            m.x += Math.cos(m.angle) * m.speed * dt;
            m.y += Math.sin(m.angle) * m.speed * dt;

            m.trail.push({ x: m.x, y: m.y });
            if (m.trail.length > m.trailMax) m.trail.shift();

            const dx = tgt.x - m.x;
            const dy = tgt.y - m.y;
            if (dx * dx + dy * dy < 16 * 16) {
              explode(m.x, m.y, m.hue);
              return false;
            }
            // Retire if it wanders far off the field.
            if (
              m.x < -120 ||
              m.x > width + 120 ||
              m.y < -120 ||
              m.y > height + 120
            ) {
              return false;
            }
            return true;
          });

          c.globalCompositeOperation = "lighter";

          // Trails + lock-on lines + missile bodies.
          missiles.forEach((m) => {
            const tgt = targetFor(m);

            // Dashed lock-on line to the aim point.
            c.globalAlpha = 0.22;
            c.strokeStyle = `hsl(${m.hue}, 95%, 68%)`;
            c.lineWidth = 1;
            c.setLineDash([5, 6]);
            c.beginPath();
            c.moveTo(m.x, m.y);
            c.lineTo(tgt.x, tgt.y);
            c.stroke();
            c.setLineDash([]);

            // Tapered fading trail.
            const t = m.trail;
            if (t.length > 1) {
              c.lineCap = "round";
              for (let i = 1; i < t.length; i++) {
                const f = i / t.length;
                c.globalAlpha = f * f * 0.85;
                c.strokeStyle = `hsl(${m.hue + (1 - f) * 24}, 96%, ${
                  55 + f * 18
                }%)`;
                c.lineWidth = 0.6 + f * 3.4;
                c.beginPath();
                c.moveTo(t[i - 1].x, t[i - 1].y);
                c.lineTo(t[i].x, t[i].y);
                c.stroke();
              }
            }

            // Glowing nose: soft halo + bright core.
            const halo = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, 14);
            halo.addColorStop(0, `hsla(${m.hue}, 100%, 75%, 0.9)`);
            halo.addColorStop(1, `hsla(${m.hue}, 100%, 60%, 0)`);
            c.globalAlpha = 1;
            c.fillStyle = halo;
            c.beginPath();
            c.arc(m.x, m.y, 14, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = `hsl(${m.hue}, 100%, 92%)`;
            c.beginPath();
            c.arc(m.x, m.y, 2.4, 0, Math.PI * 2);
            c.fill();
          });

          c.lineCap = "butt";

          // Impact rings.
          rings.update((r) => {
            r.radius += r.speed * dt;
            r.life -= dt / r.maxLife;
            return r.life > 0;
          });
          rings.forEach((r) => {
            const a = Math.max(0, r.life);
            c.globalAlpha = a * a * 0.7;
            c.strokeStyle = `hsl(${r.hue}, 95%, 68%)`;
            c.lineWidth = 1 + a * 2.5;
            c.beginPath();
            c.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            c.stroke();
          });

          // Impact sparks.
          sparks.update((sp) => {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.vx *= 0.93;
            sp.vy *= 0.93;
            sp.vy += 30 * dt;
            sp.life -= dt / sp.maxLife;
            return sp.life > 0;
          });
          sparks.forEach((sp) => {
            const a = Math.max(0, sp.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${sp.hue}, 96%, 70%)`;
            c.beginPath();
            c.arc(sp.x, sp.y, sp.size * (0.4 + a * 0.8), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [count, rate, speed, agility, trailLen, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
