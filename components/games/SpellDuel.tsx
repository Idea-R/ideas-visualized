"use client";

import { useRef } from "react";
import { useCanvas2D } from "@/components/effects/useCanvas2D";
import { Pool } from "@/lib/effects/pool";

/**
 * Live "spell duel" showcase: the wizard sprite channels a spell from his staff
 * that flies across and detonates against the skeleton's shield, deflecting
 * energy back toward the caster. Spell types cycle for variety. Click to fire.
 *
 * The canvas overlays the two PNG sprites and clears transparently, so the
 * sprites stay visible underneath while the effect draws additive glow on top.
 * Emission (staff tip) and target (shield) are measured from the live sprite
 * positions every frame, so it stays aligned at any size.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  drag: number;
  grav: number;
}

function makeParticle(): Particle {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 0, drag: 0.92, grav: 0 };
}

interface Ring {
  x: number;
  y: number;
  r: number;
  speed: number;
  life: number;
  maxLife: number;
  hue: number;
  width: number;
}

function makeRing(): Ring {
  return { x: 0, y: 0, r: 0, speed: 0, life: 0, maxLife: 1, hue: 0, width: 2 };
}

const SPELLS = [
  { name: "Arcane", hue: 268, hue2: 300 },
  { name: "Fireball", hue: 18, hue2: 44 },
  { name: "Frostbolt", hue: 195, hue2: 220 },
  { name: "Stormcall", hue: 52, hue2: 275 },
  { name: "Venom", hue: 110, hue2: 80 },
] as const;

export function SpellDuel() {
  const wizardRef = useRef<HTMLImageElement>(null);
  const skeletonRef = useRef<HTMLImageElement>(null);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const trail = new Pool<Particle>(1400, makeParticle);
      const sparks = new Pool<Particle>(2600, makeParticle);
      const motes = new Pool<Particle>(400, makeParticle);
      const rings = new Pool<Ring>(64, makeRing);

      const CHARGE = 0.55;
      const FLY = 0.62;
      const COOL = 0.7;

      let spellIdx = 0;
      let phase: "charge" | "fly" | "cool" = "charge";
      let pt = 0;
      let flareT = 0; // shield impact flare timer
      let flareHue = 0;
      const proj = { x: 0, y: 0 };
      let seeded = false;

      const ease = (t: number) => 1 - Math.pow(1 - t, 2.2);

      // Staff-tip and shield anchors measured from the live sprite layout.
      const anchors = () => {
        const cr = ctx.canvas.getBoundingClientRect();
        const w = wizardRef.current?.getBoundingClientRect();
        const s = skeletonRef.current?.getBoundingClientRect();
        const staff =
          w && w.width > 0
            ? { x: w.left - cr.left + 0.7 * w.width, y: w.top - cr.top + 0.12 * w.height }
            : { x: width * 0.26, y: height * 0.2 };
        const shield =
          s && s.width > 0
            ? { x: s.left - cr.left + 0.16 * s.width, y: s.top - cr.top + 0.5 * s.height }
            : { x: width * 0.66, y: height * 0.55 };
        return { staff, shield };
      };

      const spawnTrail = (x: number, y: number, hue: number, hue2: number) => {
        for (let i = 0; i < 3; i++) {
          trail.spawn((p) => {
            p.x = x + (Math.random() - 0.5) * 8;
            p.y = y + (Math.random() - 0.5) * 8;
            p.vx = (Math.random() - 0.5) * 40;
            p.vy = (Math.random() - 0.5) * 40;
            p.life = 1;
            p.maxLife = 0.3 + Math.random() * 0.4;
            p.size = 2 + Math.random() * 3.5;
            p.hue = Math.random() < 0.5 ? hue : hue2;
            p.drag = 0.9;
            p.grav = 0;
          });
        }
      };

      const detonate = (sx: number, sy: number, staffX: number, staffY: number, hue: number, hue2: number) => {
        flareT = 1;
        flareHue = hue;
        // Direction back toward the caster = "away from the skeleton".
        const back = Math.atan2(staffY - sy, staffX - sx);

        rings.spawn((r) => {
          r.x = sx; r.y = sy; r.r = 6; r.speed = 360; r.life = 1; r.maxLife = 0.5; r.hue = hue; r.width = 4;
        });
        rings.spawn((r) => {
          r.x = sx; r.y = sy; r.r = 2; r.speed = 230; r.life = 1; r.maxLife = 0.7; r.hue = hue2; r.width = 2;
        });

        const n = 84;
        for (let i = 0; i < n; i++) {
          sparks.spawn((p) => {
            // Bias the spray into the wizard-facing hemisphere (deflection).
            const a = back + (Math.random() - 0.5) * 2.2;
            const v = 120 + Math.random() * 440;
            p.x = sx;
            p.y = sy;
            p.vx = Math.cos(a) * v;
            p.vy = Math.sin(a) * v - 90; // upward kick
            p.life = 1;
            p.maxLife = 0.4 + Math.random() * 0.7;
            p.size = 1.5 + Math.random() * 3;
            p.hue = Math.random() < 0.5 ? hue : hue2;
            p.drag = 0.93;
            p.grav = 480;
          });
        }
        // A few embers that linger and fall.
        for (let i = 0; i < 16; i++) {
          sparks.spawn((p) => {
            const a = back + (Math.random() - 0.5) * 2.6;
            const v = 60 + Math.random() * 160;
            p.x = sx; p.y = sy;
            p.vx = Math.cos(a) * v;
            p.vy = Math.sin(a) * v;
            p.life = 1;
            p.maxLife = 0.9 + Math.random() * 0.8;
            p.size = 1 + Math.random() * 2;
            p.hue = hue;
            p.drag = 0.96;
            p.grav = 360;
          });
        }
      };

      const beginShot = () => {
        phase = "charge";
        pt = 0;
      };

      return {
        clearMode: "full", // transparent clear keeps the sprites visible
        onPointer: (x, y, type) => {
          if (type === "down") {
            spellIdx = Math.floor(Math.random() * SPELLS.length);
            phase = "charge";
            pt = CHARGE * 0.65; // quick wind-up on demand
          }
        },
        draw: (c, dt) => {
          const { staff, shield } = anchors();
          const spell = SPELLS[spellIdx];
          const { hue, hue2 } = spell;

          if (!seeded) {
            seeded = true;
            // Seed a lively static frame: a fresh detonation plus a mid-flight bolt.
            detonate(shield.x, shield.y, staff.x, staff.y, hue, hue2);
            phase = "fly";
            pt = FLY * 0.55;
            const tf = ease(pt / FLY);
            proj.x = staff.x + (shield.x - staff.x) * tf;
            proj.y = staff.y + (shield.y - staff.y) * tf - Math.sin(Math.PI * (pt / FLY)) * 60;
            for (let i = 0; i < 30; i++) {
              const k = i / 30;
              spawnTrail(staff.x + (proj.x - staff.x) * k, staff.y + (proj.y - staff.y) * k, hue, hue2);
            }
          }

          c.globalCompositeOperation = "lighter";

          // ---- Phase logic ----
          pt += dt;
          if (phase === "charge") {
            // Gather motes spiralling into the staff tip.
            if (Math.random() < 0.7) {
              motes.spawn((p) => {
                const a = Math.random() * Math.PI * 2;
                const rad = 26 + Math.random() * 40;
                p.x = staff.x + Math.cos(a) * rad;
                p.y = staff.y + Math.sin(a) * rad;
                p.vx = 0; p.vy = 0;
                p.life = 1;
                p.maxLife = CHARGE;
                p.size = 1.5 + Math.random() * 2.5;
                p.hue = Math.random() < 0.5 ? hue : hue2;
                p.drag = 1; p.grav = 0;
              });
            }
            const cg = Math.min(1, pt / CHARGE);
            const glowR = 6 + cg * 22;
            const g = c.createRadialGradient(staff.x, staff.y, 0, staff.x, staff.y, glowR);
            g.addColorStop(0, `hsla(${hue2}, 100%, 80%, ${0.9 * cg})`);
            g.addColorStop(1, `hsla(${hue}, 100%, 55%, 0)`);
            c.fillStyle = g;
            c.beginPath();
            c.arc(staff.x, staff.y, glowR, 0, Math.PI * 2);
            c.fill();
            if (pt >= CHARGE) {
              phase = "fly";
              pt = 0;
              proj.x = staff.x;
              proj.y = staff.y;
            }
          } else if (phase === "fly") {
            const tf = Math.min(1, pt / FLY);
            const e = ease(tf);
            proj.x = staff.x + (shield.x - staff.x) * e;
            proj.y = staff.y + (shield.y - staff.y) * e - Math.sin(Math.PI * tf) * 60;
            spawnTrail(proj.x, proj.y, hue, hue2);

            // Channel beam from the staff to the bolt, fading as it flies.
            // Guarded to only draw toward the bolt (rightward) with finite coords.
            const beamA = (1 - tf) * 0.6;
            if (
              beamA > 0.04 &&
              Number.isFinite(proj.x) &&
              Number.isFinite(proj.y) &&
              proj.x > staff.x + 2
            ) {
              const grad = c.createLinearGradient(staff.x, staff.y, proj.x, proj.y);
              grad.addColorStop(0, `hsla(${hue2}, 100%, 86%, ${beamA})`);
              grad.addColorStop(0.6, `hsla(${hue}, 100%, 68%, ${beamA * 0.5})`);
              grad.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
              c.strokeStyle = grad;
              c.lineWidth = 2 + (1 - tf) * 3;
              c.lineCap = "round";
              c.beginPath();
              c.moveTo(staff.x, staff.y);
              c.lineTo(proj.x, proj.y);
              c.stroke();
            }

            if (tf >= 1) {
              detonate(shield.x, shield.y, staff.x, staff.y, hue, hue2);
              phase = "cool";
              pt = 0;
            }
          } else {
            // cool
            if (pt >= COOL) {
              spellIdx = (spellIdx + 1) % SPELLS.length;
              beginShot();
            }
          }

          // ---- Motes (charge gather) ----
          motes.update((p) => {
            p.life -= dt / p.maxLife;
            // pull toward staff tip
            p.x += (staff.x - p.x) * Math.min(1, dt * 6);
            p.y += (staff.y - p.y) * Math.min(1, dt * 6);
            return p.life > 0;
          });
          motes.forEach((p) => {
            const a = Math.max(0, p.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${p.hue}, 100%, 72%)`;
            c.beginPath();
            c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            c.fill();
          });
          c.globalAlpha = 1;

          // ---- Trail ----
          trail.update((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.life -= dt / p.maxLife;
            return p.life > 0;
          });
          trail.forEach((p) => {
            const a = Math.max(0, p.life);
            c.globalAlpha = a * a;
            c.fillStyle = `hsl(${p.hue}, 100%, 68%)`;
            c.beginPath();
            c.arc(p.x, p.y, p.size * (0.4 + a * 0.8), 0, Math.PI * 2);
            c.fill();
          });
          c.globalAlpha = 1;

          // ---- Projectile core (during fly) ----
          if (phase === "fly") {
            const coreR = 10;
            const g = c.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, coreR * 2.4);
            g.addColorStop(0, `hsla(${hue2}, 100%, 92%, 1)`);
            g.addColorStop(0.4, `hsla(${hue}, 100%, 62%, 0.85)`);
            g.addColorStop(1, `hsla(${hue}, 100%, 55%, 0)`);
            c.fillStyle = g;
            c.beginPath();
            c.arc(proj.x, proj.y, coreR * 2.4, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = `hsl(${hue2}, 100%, 96%)`;
            c.beginPath();
            c.arc(proj.x, proj.y, coreR * 0.5, 0, Math.PI * 2);
            c.fill();
          }

          // ---- Rings (shockwave) ----
          rings.update((r) => {
            r.r += r.speed * dt;
            r.life -= dt / r.maxLife;
            return r.life > 0;
          });
          rings.forEach((r) => {
            const a = Math.max(0, r.life);
            c.globalAlpha = a * a;
            c.strokeStyle = `hsl(${r.hue}, 100%, 70%)`;
            c.lineWidth = r.width * (0.4 + a);
            c.beginPath();
            c.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            c.stroke();
          });
          c.globalAlpha = 1;

          // ---- Shield flare (impact bloom hugging the shield) ----
          if (flareT > 0) {
            flareT -= dt / 0.45;
            const a = Math.max(0, flareT);
            const fr = 30 + (1 - a) * 30;
            const g = c.createRadialGradient(shield.x, shield.y, 0, shield.x, shield.y, fr);
            g.addColorStop(0, `hsla(${flareHue}, 100%, 90%, ${a * 0.9})`);
            g.addColorStop(0.5, `hsla(${flareHue}, 100%, 65%, ${a * 0.5})`);
            g.addColorStop(1, `hsla(${flareHue}, 100%, 55%, 0)`);
            c.fillStyle = g;
            c.beginPath();
            c.arc(shield.x, shield.y, fr, 0, Math.PI * 2);
            c.fill();
          }

          // ---- Impact sparks ----
          sparks.update((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.grav * dt;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.life -= dt / p.maxLife;
            return p.life > 0;
          });
          sparks.forEach((p) => {
            const a = Math.max(0, p.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${p.hue}, 100%, 68%)`;
            c.beginPath();
            c.arc(p.x, p.y, p.size * (0.5 + a * 0.6), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.lineCap = "butt";
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    []
  );

  return (
    <div className="panel relative w-full overflow-hidden">
      {/* arena backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 120%, rgba(124,92,255,0.16), transparent 60%)," +
            "radial-gradient(80% 60% at 50% -10%, rgba(24,224,216,0.08), transparent 60%)," +
            "linear-gradient(180deg, #070912, #05060a)",
        }}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden />

      <div className="relative aspect-[16/8] min-h-[300px] w-full">
        {/* sprites */}
        <img
          ref={wizardRef}
          src="/sprites/wizard.png"
          alt="Wizard"
          draggable={false}
          className="pointer-events-none absolute bottom-0 left-[1%] z-10 h-[94%] w-auto select-none drop-shadow-[0_0_24px_rgba(80,120,255,0.25)] sm:left-[4%]"
        />
        <img
          ref={skeletonRef}
          src="/sprites/skeleton.png"
          alt="Skeleton knight"
          draggable={false}
          className="pointer-events-none absolute bottom-0 right-[1%] z-10 h-[96%] w-auto select-none drop-shadow-[0_0_24px_rgba(200,160,60,0.18)] sm:right-[3%]"
        />
        {/* effect canvas on top */}
        <div className="absolute inset-0 z-20">
          <canvas ref={ref} className="h-full w-full cursor-crosshair" />
        </div>

        {/* captions */}
        <div className="pointer-events-none absolute left-4 top-3 z-30">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-2">
            Live Spell Duel
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Spells channel from the staff and detonate on the shield. Click to fire.
          </p>
        </div>
      </div>
    </div>
  );
}
