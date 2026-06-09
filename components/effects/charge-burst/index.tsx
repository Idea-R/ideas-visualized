"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteColor, readPalette, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  t: number; // palette factor 0..1
}

interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  max: number;
  t: number;
  width: number;
}

interface Intake {
  x: number;
  y: number;
  angle: number;
  radius: number;
  speed: number;
  life: number;
  max: number;
  t: number;
}

// Charge milestones. Releasing inside the sweet-spot window pays a power bonus;
// holding past it makes the charge unstable (weaker, scattered burst).
const SWEET_MIN = 0.85;
const SWEET_MAX = 1.0;
const OVERLOAD = 1.35; // forced auto-release if held this long

function makeParticle(): Particle {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, t: 0 };
}
function makeRing(): Ring {
  return { x: 0, y: 0, r: 0, maxR: 1, life: 0, max: 1, t: 0, width: 2 };
}
function makeIntake(): Intake {
  return { x: 0, y: 0, angle: 0, radius: 0, speed: 0, life: 0, max: 1, t: 0 };
}

export function ChargeBurst({ params }: { params: EffectProps }) {
  const chargeTime = Number(params.chargeTime ?? 1.2);
  const burstSize = Math.round(Number(params.burstSize ?? 140));
  const spread = Number(params.spread ?? 1);
  const gravity = Number(params.gravity ?? 0.4);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const particles = new Pool<Particle>(2000, makeParticle);
      const rings = new Pool<Ring>(24, makeRing);
      const intake = new Pool<Intake>(400, makeIntake);

      let charging = false;
      let charge = 0;
      let cx = width * 0.5;
      let cy = height * 0.5;
      let intakeAcc = 0;

      // Idle autoplay so the gallery preview stays alive without interaction.
      let idle = 0;
      let auto = false;
      let autoReleaseAt = 0;

      const tipColor = (t: number, light = 62) =>
        paletteColor(mode as ColorMode, hue, hue2, t, 100, light);

      const startCharge = (x: number, y: number) => {
        charging = true;
        charge = 0;
        cx = x;
        cy = y;
      };

      const release = () => {
        if (!charging) return;
        charging = false;

        // Power profile by release timing.
        let power: number;
        let chaos: number;
        let bonus = false;
        if (charge >= SWEET_MIN && charge <= SWEET_MAX) {
          power = 1.25; // sweet-spot bonus
          chaos = 0;
          bonus = true;
        } else if (charge > SWEET_MAX) {
          power = 0.5; // overcharged + unstable
          chaos = 1;
        } else {
          power = charge; // partial charge → partial power
          chaos = 0;
        }

        const n = Math.round(burstSize * (0.3 + power));
        const baseSpeed = (120 + power * 520) * (Math.max(width, height) / 600);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
          const jitter = chaos
            ? (Math.random() - 0.5) * 3
            : (Math.random() - 0.5) * 0.6 * spread;
          const ang = a + jitter;
          const sp = baseSpeed * (0.4 + Math.random() * 0.6) * (1 + chaos * 0.5);
          particles.spawn((p) => {
            p.x = cx;
            p.y = cy;
            p.vx = Math.cos(ang) * sp;
            p.vy = Math.sin(ang) * sp;
            p.max = 0.6 + Math.random() * 0.8;
            p.life = p.max;
            p.size = 1.5 + Math.random() * (2.5 + power * 3);
            p.t = chaos ? Math.random() : (i / n + Math.random() * 0.1) % 1;
          });
        }

        // Shock ring(s): an extra crisp ring on a clean sweet-spot release.
        const ringCount = bonus ? 2 : 1;
        for (let r = 0; r < ringCount; r++) {
          rings.spawn((ring) => {
            ring.x = cx;
            ring.y = cy;
            ring.r = 6 + r * 14;
            ring.maxR = (90 + power * 220) * (1 + r * 0.3);
            ring.max = 0.45 + power * 0.3;
            ring.life = ring.max;
            ring.t = r === 0 ? 0.5 : 0.0;
            ring.width = bonus ? 3 : 2;
          });
        }
        charge = 0;
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") {
            auto = false;
            idle = 0;
            startCharge(x, y);
          } else if (type === "move") {
            idle = 0;
            if (charging) {
              cx = x;
              cy = y;
            }
          } else if (type === "up") {
            if (!auto) release();
          } else if (type === "leave") {
            if (charging && !auto) release();
          }
        },
        draw: (c, dt, time) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // ---- Idle autoplay director ----
          if (!charging && particles.count === 0) idle += dt;
          else idle = 0;
          if (idle > 1.6 && !charging) {
            auto = true;
            startCharge(
              width * (0.25 + Math.random() * 0.5),
              height * (0.3 + Math.random() * 0.4)
            );
            // Bias autoplay toward a satisfying sweet-spot release.
            autoReleaseAt =
              Math.random() < 0.6
                ? SWEET_MIN + Math.random() * (SWEET_MAX - SWEET_MIN)
                : 0.4 + Math.random() * 0.9;
            idle = 0;
          }

          // ---- Charging ----
          if (charging) {
            charge += dt / Math.max(0.2, chargeTime);
            if (auto && charge >= autoReleaseAt) release();
            else if (charge >= OVERLOAD) release(); // forced overload release
          }

          if (charging) {
            const overcharged = charge > SWEET_MAX;
            const inSweet = charge >= SWEET_MIN && charge <= SWEET_MAX;
            const cl = Math.min(charge, 1);

            // Instability shake once overcharged.
            const shake = overcharged ? (charge - SWEET_MAX) * 14 : 0;
            const dx = overcharged ? (Math.random() - 0.5) * shake : 0;
            const dy = overcharged ? (Math.random() - 0.5) * shake : 0;
            const px = cx + dx;
            const py = cy + dy;

            // Intake sparks spiral inward to "gather" energy.
            intakeAcc += dt * (40 + cl * 120);
            while (intakeAcc >= 1) {
              intakeAcc -= 1;
              intake.spawn((s) => {
                s.angle = Math.random() * Math.PI * 2;
                s.radius = 70 + Math.random() * 90;
                s.speed = 90 + Math.random() * 120 + cl * 120;
                s.max = 0.6;
                s.life = s.max;
                s.t = Math.random();
                s.x = px + Math.cos(s.angle) * s.radius;
                s.y = py + Math.sin(s.angle) * s.radius;
              });
            }

            const coreR = 6 + cl * 26 + (inSweet ? Math.sin(time * 30) * 3 : 0);
            const glow = c.createRadialGradient(px, py, 0, px, py, coreR * 3.2);
            const coreCol = overcharged ? tipColor(Math.random(), 70) : tipColor(cl, 70);
            glow.addColorStop(0, tipColor(cl, 92));
            glow.addColorStop(0.4, coreCol);
            glow.addColorStop(1, "rgba(0,0,0,0)");
            c.globalCompositeOperation = "lighter";
            c.fillStyle = glow;
            c.beginPath();
            c.arc(px, py, coreR * 3.2, 0, Math.PI * 2);
            c.fill();

            // Charge progress arc (loading ring) around a telegraph radius.
            const telR = 34 + cl * 54;
            c.lineWidth = 3;
            c.strokeStyle = "rgba(255,255,255,0.12)";
            c.beginPath();
            c.arc(px, py, telR, 0, Math.PI * 2);
            c.stroke();
            c.strokeStyle = tipColor(cl, 65);
            c.lineCap = "round";
            c.beginPath();
            c.arc(px, py, telR, -Math.PI / 2, -Math.PI / 2 + cl * Math.PI * 2);
            c.stroke();

            // Sweet-spot flash ring.
            if (inSweet) {
              const pulse = 0.5 + 0.5 * Math.sin(time * 26);
              c.strokeStyle = `rgba(255,255,255,${0.4 + pulse * 0.5})`;
              c.lineWidth = 2 + pulse * 2;
              c.beginPath();
              c.arc(px, py, telR + 6, 0, Math.PI * 2);
              c.stroke();
            }

            // Unstable jagged ring.
            if (overcharged) {
              c.strokeStyle = `rgba(255,${120 + Math.random() * 80},80,0.7)`;
              c.lineWidth = 2;
              c.beginPath();
              const spikes = 16;
              for (let i = 0; i <= spikes; i++) {
                const ang = (i / spikes) * Math.PI * 2;
                const rr = telR + 8 + Math.random() * 12;
                const xx = px + Math.cos(ang) * rr;
                const yy = py + Math.sin(ang) * rr;
                if (i === 0) c.moveTo(xx, yy);
                else c.lineTo(xx, yy);
              }
              c.stroke();
            }
            c.globalCompositeOperation = "source-over";
          }

          // ---- Intake sparks ----
          c.globalCompositeOperation = "lighter";
          intake.update((s) => {
            s.life -= dt;
            if (s.life <= 0) return false;
            s.radius -= s.speed * dt;
            if (s.radius <= 4) return false;
            s.x = cx + Math.cos(s.angle) * s.radius;
            s.y = cy + Math.sin(s.angle) * s.radius;
            s.angle += dt * 2.4; // curve inward
            const a = s.life / s.max;
            c.fillStyle = paletteColor(mode as ColorMode, hue, hue2, s.t, 100, 70);
            c.globalAlpha = a;
            c.beginPath();
            c.arc(s.x, s.y, 1.6 * a + 0.6, 0, Math.PI * 2);
            c.fill();
            return true;
          });
          c.globalAlpha = 1;

          // ---- Shock rings ----
          rings.update((ring) => {
            ring.life -= dt;
            if (ring.life <= 0) return false;
            const k = 1 - ring.life / ring.max;
            ring.r = ring.r + (ring.maxR - ring.r) * Math.min(1, dt * 6);
            const a = ring.life / ring.max;
            c.strokeStyle = paletteColor(mode as ColorMode, hue, hue2, ring.t, 100, 68);
            c.globalAlpha = a * 0.9;
            c.lineWidth = ring.width * (1 - k * 0.6);
            c.beginPath();
            c.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
            c.stroke();
            return true;
          });
          c.globalAlpha = 1;

          // ---- Burst particles ----
          const drag = Math.pow(0.12, dt); // velocity damping per second
          const g = gravity * 600;
          particles.update((p) => {
            p.life -= dt;
            if (p.life <= 0) return false;
            p.vx *= drag;
            p.vy = p.vy * drag + g * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const a = Math.max(0, p.life / p.max);
            c.fillStyle = paletteColor(mode as ColorMode, hue, hue2, p.t, 100, 62);
            c.globalAlpha = a;
            c.beginPath();
            c.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2);
            c.fill();
            return true;
          });
          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";

          // Hint text when fully idle.
          if (!charging && particles.count === 0 && !auto) {
            c.fillStyle = "rgba(255,255,255,0.35)";
            c.font = "13px ui-sans-serif, system-ui, sans-serif";
            c.textAlign = "center";
            c.fillText("click and hold to charge — release at the peak", width / 2, height - 22);
            c.textAlign = "left";
          }
        },
        cleanup: () => {
          particles.clear();
          rings.clear();
          intake.clear();
        },
      };
    },
    [chargeTime, burstSize, spread, gravity, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
