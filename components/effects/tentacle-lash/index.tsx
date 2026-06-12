"use client";

import { useCanvas2D } from "../useCanvas2D";
import { Pool } from "@/lib/effects/pool";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type Phase = "out" | "hold" | "retract";

interface Tentacle {
  ox: number;
  oy: number;
  tx: number;
  ty: number;
  cx: number;
  cy: number;
  phase: Phase;
  t: number;
  outDur: number;
  holdDur: number;
  retractDur: number;
  width: number;
  hue: number;
  wobblePhase: number;
  wobbleDir: number;
}

function makeTentacle(): Tentacle {
  return {
    ox: 0,
    oy: 0,
    tx: 0,
    ty: 0,
    cx: 0,
    cy: 0,
    phase: "out",
    t: 0,
    outDur: 0.3,
    holdDur: 0.6,
    retractDur: 0.4,
    width: 14,
    hue: 285,
    wobblePhase: 0,
    wobbleDir: 1,
  };
}

interface Prey {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
}

function makePrey(): Prey {
  return { x: 0, y: 0, vx: 0, vy: 0, hue: 285 };
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function TentacleLash({ params }: { params: EffectProps }) {
  const { mode, hue, hue2 } = readPalette(params);
  const thickness = Number(params.thickness ?? 16);
  const wobble = Number(params.wobble ?? 1);
  const lashSpeed = Math.max(0.2, Number(params.lashSpeed ?? 1));
  const curveAmt = Number(params.curve ?? 0.35);
  const showSuckers = Boolean(params.suckers ?? true);

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      const tentacles = new Pool<Tentacle>(40, makeTentacle);
      const prey = new Pool<Prey>(12, makePrey);
      let autoTimer = 0;
      let seeded = false;

      const seedPrey = () => {
        const n = 5;
        for (let i = 0; i < n; i++) {
          prey.spawn((p) => {
            p.x = width * (0.2 + Math.random() * 0.6);
            p.y = height * (0.2 + Math.random() * 0.6);
            const a = Math.random() * Math.PI * 2;
            const v = 18 + Math.random() * 34;
            p.vx = Math.cos(a) * v;
            p.vy = Math.sin(a) * v;
            p.hue = paletteHue(mode, hue, hue2, Math.random());
          });
        }
      };

      // Origin on the nearest screen edge to a given target point.
      const lashTo = (tx: number, ty: number, t: number) => {
        const dl = tx;
        const dr = width - tx;
        const dt = ty;
        const db = height - ty;
        const m = Math.min(dl, dr, dt, db);
        let ox = tx;
        let oy = ty;
        if (m === dl) ox = 0;
        else if (m === dr) ox = width;
        else if (m === dt) oy = 0;
        else oy = height;

        tentacles.spawn((tn) => {
          tn.ox = ox;
          tn.oy = oy;
          tn.tx = tx;
          tn.ty = ty;
          const mx = (ox + tx) / 2;
          const my = (oy + ty) / 2;
          const dx = tx - ox;
          const dy = ty - oy;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const dir = Math.random() < 0.5 ? -1 : 1;
          tn.cx = mx + nx * len * curveAmt * dir;
          tn.cy = my + ny * len * curveAmt * dir;
          tn.phase = "out";
          tn.t = 0;
          tn.outDur = (0.18 + len / 2600) / lashSpeed;
          tn.holdDur = 0.45 + Math.random() * 0.4;
          tn.retractDur = (0.3 + len / 3200) / lashSpeed;
          tn.width = thickness * (0.8 + Math.random() * 0.5);
          tn.hue = paletteHue(mode, hue, hue2, t);
          tn.wobblePhase = Math.random() * Math.PI * 2;
          tn.wobbleDir = dir;
        });
      };

      const autoLash = () => {
        if (prey.count === 0) return;
        const idx = Math.floor(Math.random() * prey.count);
        let chosen: Prey | null = null;
        let i = 0;
        prey.forEach((p) => {
          if (i === idx) chosen = p;
          i++;
        });
        if (chosen) lashTo((chosen as Prey).x, (chosen as Prey).y, Math.random());
      };

      const drawTentacle = (c: CanvasRenderingContext2D, tn: Tentacle, now: number) => {
        let uEnd = 1;
        let alpha = 1;
        if (tn.phase === "out") {
          uEnd = easeOutCubic(Math.min(1, tn.t / tn.outDur));
          alpha = Math.min(1, tn.t / (tn.outDur * 0.5));
        } else if (tn.phase === "hold") {
          uEnd = 1;
          // Yoyo-pulse the alpha, echoing the source tween (alpha 1 <-> 0.3, repeat 3).
          const k = tn.t / tn.holdDur;
          alpha = 0.55 + 0.45 * Math.cos(k * Math.PI * 6);
        } else if (tn.phase === "retract") {
          const k = Math.min(1, tn.t / tn.retractDur);
          uEnd = 1 - easeOutCubic(k);
          alpha = 1 - k;
        }
        if (uEnd <= 0.01 || alpha <= 0.01) return;

        const steps = 30;
        const wobbleSpeed = 6 + wobble * 3;
        const wobbleAmp = tn.width * 1.4 * wobble;

        const spineX: number[] = [];
        const spineY: number[] = [];
        const leftX: number[] = [];
        const leftY: number[] = [];
        const rightX: number[] = [];
        const rightY: number[] = [];

        for (let i = 0; i <= steps; i++) {
          const u = (i / steps) * uEnd;
          const mu = 1 - u;
          // Quadratic bezier point.
          const bx = mu * mu * tn.ox + 2 * mu * u * tn.cx + u * u * tn.tx;
          const by = mu * mu * tn.oy + 2 * mu * u * tn.cy + u * u * tn.ty;
          // Tangent for the normal direction.
          const dxu = 2 * mu * (tn.cx - tn.ox) + 2 * u * (tn.tx - tn.cx);
          const dyu = 2 * mu * (tn.cy - tn.oy) + 2 * u * (tn.ty - tn.cy);
          const tl = Math.hypot(dxu, dyu) || 1;
          const nx = -dyu / tl;
          const ny = dxu / tl;
          // Animated sine wobble, stronger toward the tip.
          const wob =
            Math.sin(u * 9 + now * wobbleSpeed * tn.wobbleDir + tn.wobblePhase) *
            wobbleAmp *
            u;
          const px = bx + nx * wob;
          const py = by + ny * wob;
          spineX.push(px);
          spineY.push(py);
          // Taper thick at the base to a point at the tip.
          const w = tn.width * Math.pow(1 - u / Math.max(uEnd, 0.001), 0.9) * 0.5 + 0.6;
          leftX.push(px + nx * w);
          leftY.push(py + ny * w);
          rightX.push(px - nx * w);
          rightY.push(py - ny * w);
        }

        const baseColor = `hsla(${Math.round(tn.hue)}, 90%, 55%, ${alpha})`;
        const glowColor = `hsla(${Math.round(tn.hue)}, 95%, 68%, ${alpha})`;

        // Body ribbon.
        c.globalCompositeOperation = "lighter";
        c.globalAlpha = 1;
        c.beginPath();
        c.moveTo(leftX[0], leftY[0]);
        for (let i = 1; i <= steps; i++) c.lineTo(leftX[i], leftY[i]);
        for (let i = steps; i >= 0; i--) c.lineTo(rightX[i], rightY[i]);
        c.closePath();
        c.fillStyle = baseColor;
        c.fill();

        // Bright spine highlight.
        c.strokeStyle = glowColor;
        c.lineWidth = Math.max(1, tn.width * 0.22);
        c.lineCap = "round";
        c.lineJoin = "round";
        c.beginPath();
        c.moveTo(spineX[0], spineY[0]);
        for (let i = 1; i <= steps; i++) c.lineTo(spineX[i], spineY[i]);
        c.stroke();

        // Suckers along the spine.
        if (showSuckers) {
          c.fillStyle = `hsla(${Math.round(tn.hue + 18)}, 85%, 78%, ${alpha * 0.9})`;
          for (let i = 2; i < steps; i += 3) {
            const u = i / steps;
            const r = tn.width * 0.18 * (1 - u) + 0.5;
            c.beginPath();
            c.arc(spineX[i], spineY[i], r, 0, Math.PI * 2);
            c.fill();
          }
        }

        // Grab flare at the tip during the hold.
        if (tn.phase === "hold") {
          const tipX = spineX[steps];
          const tipY = spineY[steps];
          const flare = 0.5 + 0.5 * Math.cos(tn.t / tn.holdDur * Math.PI * 6);
          c.globalAlpha = alpha;
          c.fillStyle = `hsla(${Math.round(tn.hue)}, 95%, 72%, ${0.6})`;
          c.beginPath();
          c.arc(tipX, tipY, tn.width * (0.6 + flare * 0.8), 0, Math.PI * 2);
          c.fill();
        }

        c.globalAlpha = 1;
        c.globalCompositeOperation = "source-over";
        c.lineCap = "butt";
        c.lineJoin = "miter";
      };

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down") lashTo(x, y, Math.random());
        },
        draw: (c, dt, now) => {
          if (!seeded) {
            seedPrey();
            // Seed one tentacle mid-lash so it looks alive immediately.
            lashTo(width * 0.62, height * 0.45, 0.5);
            tentacles.forEach((tn) => {
              tn.phase = "hold";
              tn.t = tn.holdDur * 0.3;
            });
            seeded = true;
          }

          autoTimer -= dt;
          if (autoTimer <= 0) {
            autoTimer = 1.4 + Math.random() * 1.6;
            autoLash();
          }

          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          // Drift the prey, bouncing softly off the edges.
          prey.update((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < 30 || p.x > width - 30) p.vx *= -1;
            if (p.y < 30 || p.y > height - 30) p.vy *= -1;
            p.x = Math.max(30, Math.min(width - 30, p.x));
            p.y = Math.max(30, Math.min(height - 30, p.y));
            return true;
          });
          c.globalCompositeOperation = "lighter";
          prey.forEach((p) => {
            const pulse = 0.6 + 0.4 * Math.sin(now * 2 + p.x);
            c.globalAlpha = 0.5 * pulse;
            c.fillStyle = `hsl(${Math.round(p.hue)}, 80%, 70%)`;
            c.beginPath();
            c.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
            c.fill();
          });
          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";

          tentacles.update((tn) => {
            tn.t += dt;
            if (tn.phase === "out" && tn.t >= tn.outDur) {
              tn.phase = "hold";
              tn.t = 0;
            } else if (tn.phase === "hold" && tn.t >= tn.holdDur) {
              tn.phase = "retract";
              tn.t = 0;
            } else if (tn.phase === "retract" && tn.t >= tn.retractDur) {
              return false;
            }
            return true;
          });
          tentacles.forEach((tn) => drawTentacle(c, tn, now));
        },
      };
    },
    [mode, hue, hue2, thickness, wobble, lashSpeed, curveAmt, showSuckers]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
