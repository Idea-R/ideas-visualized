"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

/** A single laid-down tread cleat (one perpendicular bar on one track line). */
interface Tread {
  x: number;
  y: number;
  angle: number;
  life: number;
  maxLife: number;
  hue: number;
}

function makeTread(): Tread {
  return { x: 0, y: 0, angle: 0, life: 0, maxLife: 1, hue: 0 };
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

function makeDust(): Dust {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0 };
}

export function TankTreads({ params }: { params: EffectProps }) {
  const speed = Number(params.speed ?? 70);
  const turnRate = Number(params.turnRate ?? 1.6);
  const fade = Number(params.fade ?? 9);
  const dustAmount = Number(params.dust ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const treads = new Pool<Tread>(1200, makeTread);
      const dust = new Pool<Dust>(1400, makeDust);

      // Track gauge (distance between the two parallel track lines).
      const gauge = 18;
      const segGap = 11; // distance traveled between cleats
      const cleatLen = 13; // length of a cleat (perpendicular to travel)
      const cleatWidth = 4.5; // thickness along travel

      const tank = {
        x: width * 0.5,
        y: height * 0.5,
        angle: Math.random() * Math.PI * 2,
        wander: Math.random() * Math.PI * 2,
        throttle: 0,
      };

      const pointer = { x: 0, y: 0, active: false };
      let seeded = false;
      let distSinceLay = 0;
      let wanderTimer = 0;
      const TWO_PI = Math.PI * 2;

      const layAt = (cx: number, cy: number, ang: number) => {
        const t = (cx / width + cy / height) * 0.5;
        const cleatHue = paletteHue(mode, hue, hue2, t);
        const nx = Math.cos(ang + Math.PI / 2);
        const ny = Math.sin(ang + Math.PI / 2);
        for (const side of [-1, 1]) {
          treads.spawn((tr) => {
            tr.x = cx + nx * gauge * side;
            tr.y = cy + ny * gauge * side;
            tr.angle = ang;
            tr.life = 1;
            tr.maxLife = fade * (0.85 + Math.random() * 0.3);
            tr.hue = cleatHue;
          });
        }
        // Faint kicked-up dust behind the treads.
        const dustCount = Math.round((Math.random() < 0.6 ? 1 : 0) * dustAmount * 2);
        for (let i = 0; i < dustCount; i++) {
          dust.spawn((d) => {
            const spread = (Math.random() - 0.5) * gauge * 2.4;
            d.x = cx + nx * spread - Math.cos(ang) * 6;
            d.y = cy + ny * spread - Math.sin(ang) * 6;
            const back = -ang + (Math.random() - 0.5) * 0.8;
            const v = 6 + Math.random() * 18;
            d.vx = Math.cos(back) * v - Math.cos(ang) * 4;
            d.vy = Math.sin(back) * v - Math.sin(ang) * 4;
            d.size = 2 + Math.random() * 4;
            d.life = 1;
            d.maxLife = 0.8 + Math.random() * 1.1;
            d.hue = cleatHue;
          });
        }
      };

      const burst = (cx: number, cy: number, ang: number) => {
        tank.throttle = 1;
        const n = Math.round(18 + dustAmount * 22);
        for (let i = 0; i < n; i++) {
          dust.spawn((d) => {
            const a = ang + Math.PI + (Math.random() - 0.5) * 1.6;
            const v = 40 + Math.random() * 150;
            d.x = cx - Math.cos(ang) * 10;
            d.y = cy - Math.sin(ang) * 10;
            d.vx = Math.cos(a) * v;
            d.vy = Math.sin(a) * v;
            d.size = 3 + Math.random() * 7;
            d.life = 1;
            d.maxLife = 0.7 + Math.random() * 0.9;
            d.hue = paletteHue(mode, hue, hue2, Math.random());
          });
        }
      };

      // Advance the tank one step and lay cleats along the way.
      const advance = (dt: number, lay: boolean) => {
        wanderTimer -= dt;
        if (wanderTimer <= 0) {
          wanderTimer = 0.5 + Math.random() * 1.2;
          tank.wander += (Math.random() - 0.5) * 1.4;
        }

        let target = tank.wander;
        if (pointer.active) {
          target = Math.atan2(pointer.y - tank.y, pointer.x - tank.x);
        }
        // Steer the heading toward the target by the shortest arc.
        let diff = ((target - tank.angle + Math.PI) % TWO_PI) - Math.PI;
        if (diff < -Math.PI) diff += TWO_PI;
        const maxTurn = turnRate * dt;
        tank.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

        const v = speed * (1 + tank.throttle * 0.9);
        tank.throttle = Math.max(0, tank.throttle - dt * 1.6);
        const step = v * dt;
        tank.x += Math.cos(tank.angle) * step;
        tank.y += Math.sin(tank.angle) * step;

        // Wrap with a soft margin so the nub keeps roaming.
        const m = 30;
        if (tank.x < -m) tank.x += width + m * 2;
        if (tank.x > width + m) tank.x -= width + m * 2;
        if (tank.y < -m) tank.y += height + m * 2;
        if (tank.y > height + m) tank.y -= height + m * 2;

        if (lay) {
          distSinceLay += step;
          while (distSinceLay >= segGap) {
            distSinceLay -= segGap;
            layAt(tank.x, tank.y, tank.angle);
          }
        }
      };

      const drawTank = (c: CanvasRenderingContext2D) => {
        const bodyHue = paletteHue(mode, hue, hue2, 0.5);
        c.save();
        c.translate(tank.x, tank.y);
        c.rotate(tank.angle);
        // Hull.
        c.fillStyle = `hsl(${bodyHue}, 28%, 30%)`;
        c.strokeStyle = `hsl(${bodyHue}, 35%, 18%)`;
        c.lineWidth = 1.5;
        c.beginPath();
        c.rect(-11, -9, 22, 18);
        c.fill();
        c.stroke();
        // Turret.
        c.fillStyle = `hsl(${bodyHue}, 30%, 38%)`;
        c.beginPath();
        c.arc(0, 0, 6, 0, TWO_PI);
        c.fill();
        // Barrel.
        c.fillStyle = `hsl(${bodyHue}, 35%, 22%)`;
        c.fillRect(4, -1.6, 16, 3.2);
        c.restore();
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "leave") {
            pointer.active = false;
            return;
          }
          pointer.x = x;
          pointer.y = y;
          pointer.active = true;
          if (type === "down") burst(tank.x, tank.y, tank.angle);
        },
        draw: (c, dt) => {
          if (!seeded) {
            seeded = true;
            // Pre-lay a trail so the screen looks alive on the first frame.
            const preSteps = 220;
            const preDt = 1 / 60;
            for (let i = 0; i < preSteps; i++) advance(preDt, true);
            // Age the pre-laid trail so it reads as a fading gradient.
            treads.forEach((tr) => {
              tr.life -= 0.55;
            });
            treads.update((tr) => tr.life > 0);
          }

          advance(dt, true);

          c.fillStyle = "#07080c";
          c.fillRect(0, 0, width, height);

          // Treads: dark neutral imprints, faintly tinted by hue.
          treads.update((tr) => {
            tr.life -= dt / tr.maxLife;
            return tr.life > 0;
          });
          treads.forEach((tr) => {
            const a = Math.max(0, tr.life);
            c.save();
            c.translate(tr.x, tr.y);
            c.rotate(tr.angle);
            c.globalAlpha = a * 0.5;
            c.fillStyle = `hsl(${tr.hue}, 22%, 9%)`;
            c.fillRect(-cleatWidth / 2, -cleatLen / 2, cleatWidth, cleatLen);
            c.restore();
          });

          // Dust: soft fading puffs behind the treads.
          c.globalCompositeOperation = "lighter";
          dust.update((d) => {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vx *= 0.92;
            d.vy *= 0.92;
            d.life -= dt / d.maxLife;
            return d.life > 0;
          });
          dust.forEach((d) => {
            const a = Math.max(0, d.life);
            c.globalAlpha = a * a * 0.28;
            c.fillStyle = `hsl(${d.hue}, 30%, 55%)`;
            c.beginPath();
            c.arc(d.x, d.y, d.size * (0.6 + (1 - a) * 1.6), 0, TWO_PI);
            c.fill();
          });
          c.globalCompositeOperation = "source-over";
          c.globalAlpha = 1;

          drawTank(c);
        },
      };
    },
    [speed, turnRate, fade, dustAmount, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
