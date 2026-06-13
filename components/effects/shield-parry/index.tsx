"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Bolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  len: number;
  width: number;
  hue: number;
  alive: boolean;
}

function makeBolt(): Bolt {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    len: 0,
    width: 0,
    hue: 0,
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

interface Flash {
  angle: number;
  life: number;
  maxLife: number;
  spread: number;
  hue: number;
}

function makeFlash(): Flash {
  return { angle: 0, life: 0, maxLife: 1, spread: 0, hue: 0 };
}

interface Ripple {
  angle: number;
  radius: number;
  speed: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeRipple(): Ripple {
  return { angle: 0, radius: 0, speed: 0, life: 0, maxLife: 1, hue: 0 };
}

export function ShieldParry({ params }: { params: EffectProps }) {
  const incomingRate = Number(params.incomingRate ?? 1);
  const boltSpeed = Number(params.boltSpeed ?? 1);
  const shieldSize = Number(params.shieldSize ?? 1);
  const sparkAmount = Math.max(1, Math.round(Number(params.sparkAmount ?? 20)));
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const bolts = new Pool<Bolt>(120, makeBolt);
      const sparks = new Pool<Spark>(2600, makeSpark);
      const flashes = new Pool<Flash>(40, makeFlash);
      const ripples = new Pool<Ripple>(60, makeRipple);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const shieldR = Math.min(width, height) * 0.18 * shieldSize;

      let autoTimer = 0;
      let seeded = false;
      let facing = 0;
      let lastFacing = 0;
      let shieldGlow = 0;

      // Fire a bolt from a screen point toward the shield center.
      const launchFrom = (sx: number, sy: number) => {
        const a = Math.atan2(cy - sy, cx - sx);
        bolts.spawn((b) => {
          const v = (260 + Math.random() * 140) * boltSpeed;
          b.x = sx;
          b.y = sy;
          b.vx = Math.cos(a) * v;
          b.vy = Math.sin(a) * v;
          b.angle = a;
          b.len = 26 + Math.random() * 22;
          b.width = 2 + Math.random() * 2;
          b.hue = paletteHue(mode, hue, hue2, 0.05);
          b.alive = true;
        });
      };

      // Spawn a bolt from a random screen edge aimed at the center.
      const launchFromEdge = () => {
        const m = 40;
        const side = Math.floor(Math.random() * 4);
        let sx = 0;
        let sy = 0;
        switch (side) {
          case 0:
            sx = -m;
            sy = Math.random() * height;
            break;
          case 1:
            sx = width + m;
            sy = Math.random() * height;
            break;
          case 2:
            sx = Math.random() * width;
            sy = -m;
            break;
          case 3:
            sx = Math.random() * width;
            sy = height + m;
            break;
          default:
            sx = -m;
            sy = Math.random() * height;
            break;
        }
        launchFrom(sx, sy);
      };

      // Resolve a block at a given impact angle (radians, measured from center).
      const block = (angle: number) => {
        facing = angle;
        shieldGlow = 1;
        const px = cx + Math.cos(angle) * shieldR;
        const py = cy + Math.sin(angle) * shieldR;
        const impactHue = paletteHue(mode, hue, hue2, 1);

        flashes.spawn((f) => {
          f.angle = angle;
          f.life = 1;
          f.maxLife = 0.5 + Math.random() * 0.2;
          f.spread = 0.5 + Math.random() * 0.25;
          f.hue = paletteHue(mode, hue, hue2, 0.4);
        });

        ripples.spawn((r) => {
          r.angle = angle;
          r.radius = 0;
          r.speed = shieldR * 3.2;
          r.life = 1;
          r.maxLife = 0.8;
          r.hue = paletteHue(mode, hue, hue2, 0.4);
        });

        // Sparks ricochet/scatter away from the shield surface.
        const count = sparkAmount + Math.floor(Math.random() * sparkAmount * 0.5);
        for (let i = 0; i < count; i++) {
          sparks.spawn((sp) => {
            const a = angle + (Math.random() - 0.5) * 2.4;
            const v = (120 + Math.random() * 360) * boltSpeed;
            sp.x = px;
            sp.y = py;
            sp.vx = Math.cos(a) * v;
            sp.vy = Math.sin(a) * v;
            sp.size = 1 + Math.random() * 2.4;
            sp.life = 1;
            sp.maxLife = 0.4 + Math.random() * 0.6;
            sp.hue = impactHue + (Math.random() - 0.5) * 30;
          });
        }
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") launchFrom(x, y);
        },
        draw: (c, dt) => {
          if (!seeded) {
            // A bolt already mid-flight plus a fading block flash so it reads
            // as a live, defending shield on the very first frame.
            launchFrom(width * 0.86, height * 0.28);
            const seedAngle = Math.atan2(-0.5, -0.8);
            facing = seedAngle;
            shieldGlow = 0.6;
            flashes.spawn((f) => {
              f.angle = seedAngle;
              f.life = 0.55;
              f.maxLife = 0.7;
              f.spread = 0.6;
              f.hue = paletteHue(mode, hue, hue2, 0.4);
            });
            ripples.spawn((r) => {
              r.angle = seedAngle;
              r.radius = shieldR * 0.8;
              r.speed = shieldR * 3.2;
              r.life = 0.7;
              r.maxLife = 0.8;
              r.hue = paletteHue(mode, hue, hue2, 0.4);
            });
            seeded = true;
          }

          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = (1.3 + Math.random() * 1.1) / Math.max(0.2, incomingRate);
            launchFromEdge();
          }

          // Smooth the shield's facing toward the latest impact.
          const da = (((facing - lastFacing) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
          lastFacing += da * Math.min(1, dt * 9);
          shieldGlow = Math.max(0, shieldGlow - dt * 1.8);

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          drawShield(c, cx, cy, shieldR, lastFacing, shieldGlow, mode, hue, hue2);

          // Ripples running across the hex surface from the impact point.
          ripples.update((r) => {
            r.radius += r.speed * dt;
            r.life -= dt / r.maxLife;
            return r.life > 0;
          });
          ripples.forEach((r) => {
            const a = Math.max(0, r.life);
            const ox = cx + Math.cos(r.angle) * shieldR;
            const oy = cy + Math.sin(r.angle) * shieldR;
            c.globalAlpha = a * a * 0.55;
            c.strokeStyle = `hsl(${r.hue}, 95%, 70%)`;
            c.lineWidth = 1 + a * 2;
            c.beginPath();
            c.arc(ox, oy, r.radius, 0, Math.PI * 2);
            c.stroke();
          });

          // Bolts streak inward; convert to a block at the shield surface.
          bolts.update((b) => {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            const dx = b.x - cx;
            const dy = b.y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist <= shieldR) {
              block(Math.atan2(dy, dx));
              return false;
            }
            // Cull bolts that somehow leave the scene without hitting.
            if (
              b.x < -120 ||
              b.x > width + 120 ||
              b.y < -120 ||
              b.y > height + 120
            ) {
              return false;
            }
            return true;
          });
          bolts.forEach((b) => {
            const half = b.len / 2;
            const dx = Math.cos(b.angle);
            const dy = Math.sin(b.angle);
            const grad = c.createLinearGradient(
              b.x - dx * b.len,
              b.y - dy * b.len,
              b.x + dx * half,
              b.y + dy * half
            );
            grad.addColorStop(0, `hsla(${b.hue}, 95%, 65%, 0)`);
            grad.addColorStop(1, `hsla(${b.hue}, 98%, 75%, 1)`);
            c.globalAlpha = 1;
            c.strokeStyle = grad;
            c.lineWidth = b.width;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(b.x - dx * b.len, b.y - dy * b.len);
            c.lineTo(b.x + dx * half, b.y + dy * half);
            c.stroke();
            c.globalAlpha = 0.9;
            c.fillStyle = `hsl(${b.hue}, 98%, 80%)`;
            c.beginPath();
            c.arc(b.x, b.y, b.width * 0.9, 0, Math.PI * 2);
            c.fill();
          });

          // Bright directional block arcs at the impact angle.
          flashes.update((f) => {
            f.life -= dt / f.maxLife;
            return f.life > 0;
          });
          flashes.forEach((f) => {
            const a = Math.max(0, f.life);
            const inner = shieldR * (0.86 + (1 - a) * 0.1);
            const outer = shieldR * (1.18 + (1 - a) * 0.25);
            const layers = 3;
            for (let k = 0; k < layers; k++) {
              const spread = f.spread * (1 + k * 0.4);
              c.globalAlpha = a * a * (0.6 - k * 0.15);
              c.strokeStyle = `hsl(${f.hue}, 100%, ${72 - k * 6}%)`;
              c.lineWidth = (3 + a * 6) * (1 - k * 0.25);
              c.beginPath();
              c.arc(cx, cy, inner + (outer - inner) * 0.5, f.angle - spread, f.angle + spread);
              c.stroke();
            }
            // A hot core line pointing out along the impact normal.
            const hx = cx + Math.cos(f.angle) * outer;
            const hy = cy + Math.sin(f.angle) * outer;
            const ix = cx + Math.cos(f.angle) * inner;
            const iy = cy + Math.sin(f.angle) * inner;
            c.globalAlpha = a;
            c.strokeStyle = `hsl(${f.hue}, 100%, 85%)`;
            c.lineWidth = 2 + a * 3;
            c.beginPath();
            c.moveTo(ix, iy);
            c.lineTo(hx, hy);
            c.stroke();
          });

          // Scattering ricochet sparks.
          sparks.update((sp) => {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.vy += 60 * dt;
            sp.vx *= 0.95;
            sp.vy *= 0.95;
            sp.life -= dt / sp.maxLife;
            return sp.life > 0;
          });
          sparks.forEach((sp) => {
            const a = Math.max(0, sp.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${sp.hue}, 95%, 70%)`;
            c.beginPath();
            c.arc(sp.x, sp.y, sp.size * (0.4 + a * 0.8), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.lineCap = "butt";
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [incomingRate, boltSpeed, shieldSize, sparkAmount, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}

/** Draw the hex-cell energy shield with a localized flare toward `facing`. */
function drawShield(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  facing: number,
  glow: number,
  mode: Parameters<typeof paletteHue>[0],
  hue: number,
  hue2: number
) {
  const baseHue = paletteHue(mode, hue, hue2, 0);

  // Faint hex-cell lattice clipped to the shield disc.
  c.save();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.clip();

  const cell = Math.max(10, r * 0.22);
  const w = cell * 2;
  const h = cell * Math.sqrt(3);
  for (let row = -1; row * (h / 2) < r * 2 + h; row++) {
    const oy = cy - r + row * (h / 2);
    const xOff = row % 2 === 0 ? 0 : w * 0.75;
    for (let col = -1; col * (w * 1.5) < r * 2 + w; col++) {
      const ox = cx - r + xOff + col * (w * 1.5);
      const ang = Math.atan2(oy - cy, ox - cx);
      const da = Math.abs((((ang - facing) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const near = Math.max(0, 1 - da / 1.1);
      c.globalAlpha = 0.05 + near * glow * 0.5;
      c.strokeStyle = `hsl(${baseHue}, 90%, ${60 + near * 20}%)`;
      c.lineWidth = 1;
      hexPath(c, ox, oy, cell * 0.92);
      c.stroke();
    }
  }
  c.restore();

  // Shield rim: a steady ring plus a brightened arc toward the impact.
  c.globalAlpha = 0.3;
  c.strokeStyle = `hsl(${baseHue}, 90%, 60%)`;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.stroke();

  const flareHue = paletteHue(mode, hue, hue2, 0.35);
  const spread = 0.7 + glow * 0.5;
  c.globalAlpha = 0.25 + glow * 0.6;
  c.strokeStyle = `hsl(${flareHue}, 100%, 70%)`;
  c.lineWidth = 3 + glow * 5;
  c.beginPath();
  c.arc(cx, cy, r, facing - spread, facing + spread);
  c.stroke();

  // Soft inner radial wash so the disc reads as energized glass.
  const wash = c.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  wash.addColorStop(0, `hsla(${baseHue}, 90%, 60%, ${0.05 + glow * 0.12})`);
  wash.addColorStop(1, `hsla(${baseHue}, 90%, 60%, 0)`);
  c.globalAlpha = 1;
  c.fillStyle = wash;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fill();
}

function hexPath(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = x + Math.cos(a) * size;
    const py = y + Math.sin(a) * size;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}
