"use client";

import { useCanvas2D } from "../useCanvas2D";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  brightness: number;
  pulseSpeed: number;
  pulsePhase: number;
  depth: number; // 0=far 1=near
  t: number; // palette factor [0,1]
}

interface Nebula {
  x: number;
  y: number;
  rx: number;
  ry: number;
  angle: number;
  alpha: number;
  t: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
}

const BASE_AREA = 240_000;

export function StarField({ params }: { params: EffectProps }) {
  const density = Number(params.density ?? 70);
  const twinkleSpeed = Number(params.twinkleSpeed ?? 1);
  const shootRate = Number(params.shootRate ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const area = width * height;
      const count = Math.max(20, Math.min(500, Math.round((density * area) / BASE_AREA)));

      const stars: Star[] = [];
      for (let i = 0; i < count; i++) {
        const depth = Math.random();
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 9 * (0.3 + depth * 0.7),
          vy: (Math.random() - 0.5) * 9 * (0.3 + depth * 0.7),
          radius: (0.8 + Math.random() * 1.5) * (0.4 + depth * 0.8),
          brightness: 0.2 + Math.random() * 0.6 + depth * 0.2,
          pulseSpeed: 0.5 + Math.random() * 2,
          pulsePhase: Math.random() * Math.PI * 2,
          depth,
          t: Math.random(),
        });
      }

      const nebulae: Nebula[] = Array.from({ length: 4 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        rx: 80 + Math.random() * 160,
        ry: 50 + Math.random() * 100,
        angle: Math.random() * Math.PI,
        alpha: 0.04 + Math.random() * 0.05,
        t: Math.random(),
      }));

      const shooters: ShootingStar[] = [];
      let shootCooldown = 1.5;

      const mouse = { x: -9999, y: -9999 };
      let lastMouseX = -9999;
      let rippleX = 0;
      let rippleY = 0;
      let rippleRadius = 0;
      let rippleAlpha = 0;

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
          if (Math.abs(x - lastMouseX) > 40) {
            rippleX = x;
            rippleY = y;
            rippleRadius = 0;
            rippleAlpha = 0.32;
            lastMouseX = x;
          }
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          // ── Nebula colour washes ──
          for (const neb of nebulae) {
            const nh = paletteHue(mode, hue, hue2, neb.t);
            c.save();
            c.translate(neb.x, neb.y);
            c.rotate(neb.angle);
            const grad = c.createRadialGradient(0, 0, 0, 0, 0, neb.rx);
            grad.addColorStop(0, `hsla(${nh}, 80%, 60%, ${neb.alpha})`);
            grad.addColorStop(0.6, `hsla(${nh}, 80%, 55%, ${neb.alpha * 0.3})`);
            grad.addColorStop(1, "transparent");
            c.fillStyle = grad;
            c.beginPath();
            c.ellipse(0, 0, neb.rx, neb.ry, 0, 0, Math.PI * 2);
            c.fill();
            c.restore();
          }

          // ── Mouse ripple ──
          if (rippleAlpha > 0.01) {
            rippleRadius += dt * 180;
            rippleAlpha *= Math.pow(0.4, dt);
            c.globalAlpha = 1;
            c.beginPath();
            c.arc(rippleX, rippleY, rippleRadius, 0, Math.PI * 2);
            c.strokeStyle = `hsla(${paletteHue(mode, hue, hue2, 0.5)}, 90%, 70%, ${rippleAlpha})`;
            c.lineWidth = 1;
            c.stroke();
          }

          // ── Stars: update ──
          for (const s of stars) {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            if (s.x < -20) s.x = width + 20;
            if (s.x > width + 20) s.x = -20;
            if (s.y < -20) s.y = height + 20;
            if (s.y > height + 20) s.y = -20;

            if (s.depth > 0.4 && mouse.x > -9000) {
              const dx = mouse.x - s.x;
              const dy = mouse.y - s.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 200 && dist > 10) {
                const force = 0.6 * s.depth;
                s.vx += (dx / dist) * force;
                s.vy += (dy / dist) * force;
              }
            }
            s.vx *= Math.pow(0.85, dt * 60 / 60);
            s.vy *= Math.pow(0.85, dt * 60 / 60);
          }

          // ── Stars: draw with twinkle ──
          for (const s of stars) {
            const pulse = Math.sin(t * s.pulseSpeed * twinkleSpeed + s.pulsePhase) * 0.3 + 0.7;
            const r = s.radius * pulse;
            const a = s.brightness * pulse;
            const sh = paletteHue(mode, hue, hue2, s.t);

            if (s.depth > 0.3) {
              const grad = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 5);
              grad.addColorStop(0, `hsla(${sh}, 90%, 70%, ${a * 0.3})`);
              grad.addColorStop(1, "transparent");
              c.fillStyle = grad;
              c.beginPath();
              c.arc(s.x, s.y, r * 5, 0, Math.PI * 2);
              c.fill();
            }

            if (s.depth > 0.7 && s.brightness > 0.6) {
              c.strokeStyle = `hsla(${sh}, 90%, 80%, ${a * 0.15})`;
              c.lineWidth = 0.5;
              const flare = r * 8;
              c.beginPath();
              c.moveTo(s.x - flare, s.y);
              c.lineTo(s.x + flare, s.y);
              c.moveTo(s.x, s.y - flare);
              c.lineTo(s.x, s.y + flare);
              c.stroke();
            }

            c.globalAlpha = 1;
            c.fillStyle = `hsla(${sh}, 90%, 88%, ${a})`;
            c.beginPath();
            c.arc(s.x, s.y, r, 0, Math.PI * 2);
            c.fill();
          }

          // ── Shooting stars (explicit trail history) ──
          shootCooldown -= dt;
          if (shootCooldown <= 0 && shootRate > 0) {
            const angle = Math.PI * 0.15 + Math.random() * 0.3;
            const speed = (360 + Math.random() * 360);
            shooters.push({
              x: Math.random() * width * 0.8,
              y: Math.random() * height * 0.3,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0,
              maxLife: 0.5 + Math.random() * 0.5,
              trail: [],
            });
            shootCooldown = (1.2 + Math.random() * 2.5) / shootRate;
          }

          for (let i = shooters.length - 1; i >= 0; i--) {
            const ss = shooters[i];
            ss.life += dt;
            ss.x += ss.vx * dt;
            ss.y += ss.vy * dt;
            ss.trail.push({ x: ss.x, y: ss.y });
            if (ss.trail.length > 22) ss.trail.shift();

            if (ss.life > ss.maxLife) {
              shooters.splice(i, 1);
              continue;
            }

            const fade = 1 - ss.life / ss.maxLife;
            const sh = paletteHue(mode, hue, hue2, 0.85);
            if (ss.trail.length > 1) {
              for (let k = 1; k < ss.trail.length; k++) {
                const seg = k / ss.trail.length; // 0 tail → 1 head
                const a = seg * fade * 0.7;
                if (a <= 0.01) continue;
                c.globalAlpha = 1;
                c.strokeStyle = `hsla(${sh}, 80%, 88%, ${a})`;
                c.lineWidth = 1.6 * seg * fade;
                c.beginPath();
                c.moveTo(ss.trail[k - 1].x, ss.trail[k - 1].y);
                c.lineTo(ss.trail[k].x, ss.trail[k].y);
                c.stroke();
              }
            }
            c.fillStyle = `hsla(${sh}, 60%, 95%, ${fade})`;
            c.beginPath();
            c.arc(ss.x, ss.y, 2 * fade, 0, Math.PI * 2);
            c.fill();
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [density, twinkleSpeed, shootRate, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
