"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type SpellKind = "portal" | "chain-lightning" | "rune-circle";

const MAX_NODES = 6;

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

interface Portal {
  x: number;
  y: number;
  age: number;
  maxLife: number;
  radius: number;
  dir: number; // ±1 spin direction
  hueBase: number;
  emit: number; // spark emission accumulator
}

function makePortal(): Portal {
  return { x: 0, y: 0, age: 0, maxLife: 1, radius: 1, dir: 1, hueBase: 0, emit: 0 };
}

interface Bolt {
  pts: Float32Array; // packed x,y anchor pairs
  count: number;
  age: number;
  maxLife: number;
  amp: number;
  hueBase: number;
}

function makeBolt(): Bolt {
  return {
    pts: new Float32Array(MAX_NODES * 2),
    count: 0,
    age: 0,
    maxLife: 1,
    amp: 8,
    hueBase: 0,
  };
}

interface Rune {
  x: number;
  y: number;
  age: number;
  maxLife: number;
  radius: number; // target radius
  dir: number;
  glyphs: number;
  hueBase: number;
}

function makeRune(): Rune {
  return { x: 0, y: 0, age: 0, maxLife: 1, radius: 1, dir: 1, glyphs: 12, hueBase: 0 };
}

// Stable pseudo-random in [0,1] from a scalar seed (deterministic crackle).
function hash(seed: number): number {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export function ArcaneSpells({ params }: { params: EffectProps }) {
  const spell = String(params.spell ?? "portal") as SpellKind;
  const density = Number(params.density);
  const speed = Number(params.speed);
  const size = Number(params.size);
  const autoCast = Boolean(params.autoCast);
  const { mode, hue, hue2 } = readPalette(params);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const sparks = new Pool<Spark>(2400, makeSpark);
      const portals = new Pool<Portal>(6, makePortal);
      const bolts = new Pool<Bolt>(24, makeBolt);
      const runes = new Pool<Rune>(16, makeRune);

      // Persistent chain-lightning nodes: the points the bolts arc between.
      // Kept on screen between arcs so a single static frame is never empty.
      const chainNodes = new Float32Array(MAX_NODES * 2);
      let chainCount = 0;
      let chainHue = 0;

      const baseR = Math.min(width, height) * 0.28 * size;

      const burstSparks = (
        cx: number,
        cy: number,
        n: number,
        spread: number,
        hueBase: number
      ) => {
        for (let i = 0; i < n; i++) {
          sparks.spawn((s) => {
            const a = Math.random() * Math.PI * 2;
            const sp = spread * (0.3 + Math.random() * 0.9);
            s.x = cx;
            s.y = cy;
            s.vx = Math.cos(a) * sp;
            s.vy = Math.sin(a) * sp;
            s.life = 1;
            s.maxLife = 0.5 + Math.random() * 0.7;
            s.size = 1 + Math.random() * 1.6;
            s.hue = hueBase + (Math.random() - 0.5) * 36;
          });
        }
      };

      const castPortal = (cx: number, cy: number) => {
        portals.spawn((p) => {
          p.x = cx;
          p.y = cy;
          p.age = 0;
          p.maxLife = 2.8 + Math.random() * 0.6;
          p.radius = baseR * (0.85 + Math.random() * 0.25);
          p.dir = Math.random() < 0.5 ? 1 : -1;
          p.hueBase = paletteHue(mode, hue, hue2, 0.2);
          p.emit = 0;
        });
        burstSparks(cx, cy, Math.round(18 * density), 90, paletteHue(mode, hue, hue2, 0.5));
      };

      const castBolt = (cx: number, cy: number) => {
        bolts.spawn((b) => {
          const nodes = Math.max(3, Math.min(MAX_NODES, 3 + Math.round(density * 2)));
          b.count = nodes;
          b.age = 0;
          b.maxLife = 0.85 + Math.random() * 0.4;
          b.amp = baseR * 0.14;
          b.hueBase = paletteHue(mode, hue, hue2, 0.5);
          let px = cx;
          let py = cy;
          let ang = Math.random() * Math.PI * 2;
          const step = baseR * 0.55;
          const margin = baseR * 0.2;
          for (let i = 0; i < nodes; i++) {
            b.pts[i * 2] = px;
            b.pts[i * 2 + 1] = py;
            ang += (Math.random() - 0.5) * 1.7;
            px += Math.cos(ang) * step;
            py += Math.sin(ang) * step;
            // Reflect off the canvas edges so the whole arc stays on-screen.
            if (px < margin || px > width - margin) {
              ang = Math.PI - ang;
              px = Math.max(margin, Math.min(width - margin, px));
            }
            if (py < margin || py > height - margin) {
              ang = -ang;
              py = Math.max(margin, Math.min(height - margin, py));
            }
          }
          chainNodes.set(b.pts.subarray(0, b.count * 2));
          chainCount = b.count;
          chainHue = b.hueBase;
        });
        burstSparks(cx, cy, Math.round(10 * density), 70, paletteHue(mode, hue, hue2, 0.7));
      };

      const castRune = (cx: number, cy: number) => {
        runes.spawn((r) => {
          r.x = cx;
          r.y = cy;
          r.age = 0;
          r.maxLife = 1.8 + Math.random() * 0.4;
          r.radius = baseR * (1.1 + Math.random() * 0.2);
          r.dir = Math.random() < 0.5 ? 1 : -1;
          r.glyphs = Math.max(6, Math.round(12 * density));
          r.hueBase = paletteHue(mode, hue, hue2, 0.3);
        });
        burstSparks(cx, cy, Math.round(14 * density), 60, paletteHue(mode, hue, hue2, 0.6));
      };

      const cast = (cx: number, cy: number) => {
        switch (spell) {
          case "portal":
            castPortal(cx, cy);
            break;
          case "chain-lightning":
            castBolt(cx, cy);
            break;
          case "rune-circle":
            castRune(cx, cy);
            break;
          default: {
            const _exhaustive: never = spell;
            void _exhaustive;
          }
        }
      };

      // Cast around the canvas center (never the pointer), so the effect
      // animates with zero user input (gallery preview / static screenshots).
      const autoPoint = (): [number, number] => [
        width * 0.5 + (Math.random() - 0.5) * width * 0.12,
        height * 0.5 + (Math.random() - 0.5) * height * 0.12,
      ];

      // Recast faster than each spell's lifetime so a frame is never empty.
      const nextInterval = () => {
        const base =
          spell === "chain-lightning" ? 0.45 : spell === "rune-circle" ? 1 : 1.4;
        return (base + Math.random() * 0.35) / Math.max(0.2, speed);
      };
      let autoTimer = nextInterval();

      // Seed one cast at center immediately so the very first rendered frame
      // already shows the spell (covers reduced-motion single-frame renders).
      if (autoCast) cast(width / 2, height / 2);

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") cast(x, y);
        },
        draw: (c, dt, t) => {
          if (autoCast) {
            autoTimer -= dt;
            if (autoTimer <= 0) {
              autoTimer = nextInterval();
              const [px, py] = autoPoint();
              cast(px, py);
            }
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          c.globalCompositeOperation = "lighter";

          // --- Portals: swirling vortex (ported from renderPortalSwirl) ---
          portals.update((p) => {
            p.age += dt * speed;
            return p.age < p.maxLife;
          });
          portals.forEach((p) => {
            const fadeIn = Math.min(1, p.age / 0.3);
            const fadeOut = Math.min(1, (p.maxLife - p.age) / 0.6);
            const amp = fadeIn * fadeOut;
            const rot = p.age * 3.2 * p.dir;

            // Central glow core.
            const core = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 0.7);
            core.addColorStop(0, `hsla(${p.hueBase}, 95%, 70%, ${0.5 * amp})`);
            core.addColorStop(1, `hsla(${p.hueBase}, 95%, 50%, 0)`);
            c.fillStyle = core;
            c.beginPath();
            c.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
            c.fill();

            // Spiral arms drawn as dots spiralling inward.
            const arms = 3;
            const pts = 18;
            for (let arm = 0; arm < arms; arm++) {
              for (let k = 0; k < pts; k++) {
                const frac = k / pts;
                const ang =
                  rot + arm * ((Math.PI * 2) / arms) + frac * Math.PI * 1.7;
                const rr = p.radius * frac;
                const hx = p.x + Math.cos(ang) * rr;
                const hy = p.y + Math.sin(ang) * rr;
                c.globalAlpha = amp * (1 - frac * 0.45);
                c.fillStyle = `hsl(${paletteHue(mode, hue, hue2, frac)}, 95%, 65%)`;
                const ds = 1.4 + (1 - frac) * 2.2;
                c.beginPath();
                c.arc(hx, hy, ds, 0, Math.PI * 2);
                c.fill();
              }
            }

            // Outer rotating ring of glints.
            const ring = 14;
            for (let i = 0; i < ring; i++) {
              const a = -rot * 0.6 + (i / ring) * Math.PI * 2;
              const hx = p.x + Math.cos(a) * p.radius;
              const hy = p.y + Math.sin(a) * p.radius;
              c.globalAlpha = amp * 0.9;
              c.fillStyle = `hsl(${paletteHue(mode, hue, hue2, i / ring)}, 95%, 72%)`;
              c.beginPath();
              c.arc(hx, hy, 1.8, 0, Math.PI * 2);
              c.fill();
            }

            // Continuous inward sparkle emission.
            p.emit += dt * 40 * density;
            while (p.emit >= 1) {
              p.emit -= 1;
              const a = Math.random() * Math.PI * 2;
              const r = p.radius * (0.8 + Math.random() * 0.3);
              sparks.spawn((s) => {
                s.x = p.x + Math.cos(a) * r;
                s.y = p.y + Math.sin(a) * r;
                const tang = a + Math.PI * 0.5 * p.dir;
                const sp = 40 + Math.random() * 50;
                s.vx = Math.cos(tang) * sp - Math.cos(a) * 30;
                s.vy = Math.sin(tang) * sp - Math.sin(a) * 30;
                s.life = 1;
                s.maxLife = 0.5 + Math.random() * 0.5;
                s.size = 1 + Math.random() * 1.4;
                s.hue = paletteHue(mode, hue, hue2, Math.random());
              });
            }
          });

          // --- Chain lightning: jagged arcs between persistent glowing nodes ---
          // Persistent nodes keep the effect visible between (brief) arcs.
          if (chainCount > 0) {
            const orbR = baseR * 0.13;
            for (let n = 0; n < chainCount; n++) {
              const ox = chainNodes[n * 2];
              const oy = chainNodes[n * 2 + 1];
              const pulse = 0.55 + 0.45 * Math.sin(t * 7 + n * 1.3);
              const g = c.createRadialGradient(ox, oy, 0, ox, oy, orbR);
              g.addColorStop(0, `hsla(${chainHue}, 95%, 75%, ${0.85 * pulse})`);
              g.addColorStop(1, `hsla(${chainHue}, 95%, 55%, 0)`);
              c.globalAlpha = 1;
              c.fillStyle = g;
              c.beginPath();
              c.arc(ox, oy, orbR, 0, Math.PI * 2);
              c.fill();
              c.globalAlpha = pulse;
              c.fillStyle = `hsl(${chainHue}, 95%, 82%)`;
              c.beginPath();
              c.arc(ox, oy, 2.4, 0, Math.PI * 2);
              c.fill();
            }
          }

          bolts.update((b) => {
            b.age += dt * speed;
            return b.age < b.maxLife;
          });
          bolts.forEach((b) => {
            const lifeT = b.age / b.maxLife;
            const alpha = Math.max(0, 1 - lifeT);
            const flick = Math.floor(b.age * 34);
            const seg = 5;

            const stroke = (wScale: number, light: number, aMul: number) => {
              c.globalAlpha = alpha * aMul;
              c.strokeStyle = `hsl(${b.hueBase}, 95%, ${light}%)`;
              c.lineWidth = b.amp * 0.22 * wScale;
              c.beginPath();
              c.moveTo(b.pts[0], b.pts[1]);
              for (let n = 0; n < b.count - 1; n++) {
                const ax = b.pts[n * 2];
                const ay = b.pts[n * 2 + 1];
                const bx = b.pts[(n + 1) * 2];
                const by = b.pts[(n + 1) * 2 + 1];
                const dx = bx - ax;
                const dy = by - ay;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;
                for (let s = 1; s <= seg; s++) {
                  const st = s / seg;
                  const off =
                    s === seg
                      ? 0
                      : (hash(n * 13.1 + s * 7.7 + flick * 3.3) - 0.5) *
                        b.amp *
                        2 *
                        (1 - lifeT * 0.5);
                  c.lineTo(ax + dx * st + nx * off, ay + dy * st + ny * off);
                }
              }
              c.stroke();
            };

            stroke(3.2, 55, 0.4); // soft outer glow
            stroke(1, 92, 1); // bright core

            // Node impact flashes.
            c.fillStyle = "#ffffff";
            for (let n = 0; n < b.count; n++) {
              c.globalAlpha = alpha * 0.9;
              c.beginPath();
              c.arc(b.pts[n * 2], b.pts[n * 2 + 1], (1 - lifeT) * b.amp * 0.6 + 1, 0, Math.PI * 2);
              c.fill();
            }
          });

          // --- Rune circle: expanding glyph ring (floor iris equivalent) ---
          runes.update((r) => {
            r.age += dt * speed;
            return r.age < r.maxLife;
          });
          runes.forEach((r) => {
            const lifeT = r.age / r.maxLife;
            const grow = easeOutCubic(Math.min(1, lifeT * 1.2));
            const radius = r.radius * grow;
            const alpha = Math.max(0, 1 - lifeT) * Math.min(1, lifeT * 6);
            const rot = r.age * 1.6 * r.dir;

            // Main ring.
            c.globalAlpha = alpha;
            c.strokeStyle = `hsl(${r.hueBase}, 90%, 64%)`;
            c.lineWidth = 2.5;
            c.beginPath();
            c.arc(r.x, r.y, radius, 0, Math.PI * 2);
            c.stroke();

            // Inner counter-rotating ring.
            c.globalAlpha = alpha * 0.8;
            c.strokeStyle = `hsl(${paletteHue(mode, hue, hue2, 0.7)}, 90%, 68%)`;
            c.lineWidth = 1.5;
            c.beginPath();
            c.arc(r.x, r.y, radius * 0.72, 0, Math.PI * 2);
            c.stroke();

            // Rotating glyph ticks around the ring.
            for (let i = 0; i < r.glyphs; i++) {
              const a = rot + (i / r.glyphs) * Math.PI * 2;
              const inner = radius * 0.86;
              const outer = radius * 1.04;
              c.globalAlpha = alpha;
              c.strokeStyle = `hsl(${paletteHue(mode, hue, hue2, i / r.glyphs)}, 95%, 70%)`;
              c.lineWidth = 2;
              c.beginPath();
              c.moveTo(r.x + Math.cos(a) * inner, r.y + Math.sin(a) * inner);
              c.lineTo(r.x + Math.cos(a) * outer, r.y + Math.sin(a) * outer);
              c.stroke();
            }

            // Counter-rotating inner glyph dots.
            const dots = Math.max(4, Math.round(r.glyphs * 0.6));
            for (let i = 0; i < dots; i++) {
              const a = -rot * 1.4 + (i / dots) * Math.PI * 2;
              const rr = radius * 0.72;
              c.globalAlpha = alpha * 0.9;
              c.fillStyle = `hsl(${r.hueBase}, 95%, 72%)`;
              c.beginPath();
              c.arc(r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr, 2, 0, Math.PI * 2);
              c.fill();
            }

            // Bright center sigil flash early on.
            if (lifeT < 0.35) {
              const f = (0.35 - lifeT) / 0.35;
              const g = c.createRadialGradient(r.x, r.y, 0, r.x, r.y, radius * 0.4);
              g.addColorStop(0, `hsla(${r.hueBase}, 95%, 75%, ${0.6 * f})`);
              g.addColorStop(1, `hsla(${r.hueBase}, 95%, 60%, 0)`);
              c.globalAlpha = 1;
              c.fillStyle = g;
              c.beginPath();
              c.arc(r.x, r.y, radius * 0.4, 0, Math.PI * 2);
              c.fill();
            }
          });

          // --- Shared sparks ---
          sparks.update((s) => {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vx *= 0.97;
            s.vy *= 0.97;
            s.life -= dt / s.maxLife;
            return s.life > 0;
          });
          sparks.forEach((s) => {
            const a = Math.max(0, s.life);
            c.globalAlpha = a;
            c.fillStyle = `hsl(${s.hue}, 95%, 68%)`;
            c.beginPath();
            c.arc(s.x, s.y, s.size * (0.5 + a * 0.8), 0, Math.PI * 2);
            c.fill();
          });

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [spell, density, speed, size, autoCast, mode, hue, hue2]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
