"use client";

import { paletteColor, paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";
import { useCanvas2D } from "../useCanvas2D";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  t: number; // palette factor in [0,1], by index
  bright: number; // transient brightness boost (pulse), decays to 0
}

export function NexusCard({ params }: { params: EffectProps }) {
  const nodeCount = Math.max(30, Math.min(160, Math.round(Number(params.nodeCount) || 90)));
  const linkDistance = Math.max(60, Math.min(220, Number(params.linkDistance) || 130));
  const speed = Math.max(0.2, Math.min(3, Number(params.speed) || 1));
  const nexusPull = Math.max(0, Math.min(1, Number(params.nexusPull) ?? 0.4));
  const showCard = Boolean(params.showCard);
  const cardTitle = String(params.cardTitle ?? "NEXUS");
  const { mode, hue, hue2 } = readPalette(params);

  const canvasRef = useCanvas2D(
    (ctx, size) => {
      let { width, height } = size;
      const linkDist2 = linkDistance * linkDistance;
      // Radius around the card / cursor anchors where nodes get "wired in".
      const nexusRadius = Math.max(linkDistance * 1.4, Math.min(width, height) * 0.42);
      const nexusRadius2 = nexusRadius * nexusRadius;

      // Pointer attractor (in CSS px). Inactive until first move.
      const pointer = { x: -9999, y: -9999, active: false };
      // Brief ripple emitted on pointer down.
      const ripple = { x: 0, y: 0, t: 0, active: false };

      // Pooled nodes — allocated once, recycled forever.
      const nodes: Node[] = [];
      for (let i = 0; i < nodeCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (12 + Math.random() * 26) * speed;
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          size: 1.3 + Math.random() * 2.1,
          t: nodeCount > 1 ? i / (nodeCount - 1) : 0,
          bright: 0,
        });
      }

      const cardAnchor = () => ({ x: width / 2, y: height / 2 });

      return {
        clearMode: "full" as const,
        onPointer: (x, y, type) => {
          if (type === "move") {
            pointer.x = x;
            pointer.y = y;
            pointer.active = true;
          } else if (type === "down") {
            pointer.x = x;
            pointer.y = y;
            pointer.active = true;
            ripple.x = x;
            ripple.y = y;
            ripple.t = 0;
            ripple.active = true;
          } else if (type === "leave") {
            pointer.active = false;
          }
        },
        draw: (c, dt, time) => {
          // Track live size in case the canvas resized between setups.
          width = size.width;
          height = size.height;

          const card = cardAnchor();
          const anchors: { x: number; y: number; w: number }[] = [];
          // Card is always an anchor; pointer is a stronger anchor when active.
          if (showCard) anchors.push({ x: card.x, y: card.y, w: 1 });
          if (pointer.active) anchors.push({ x: pointer.x, y: pointer.y, w: 1.25 });

          // Advance the ripple lifetime.
          if (ripple.active) {
            ripple.t += dt;
            if (ripple.t > 0.9) ripple.active = false;
          }
          const rippleRadius = ripple.active ? ripple.t * 520 : 0;

          // --- Integrate node motion -------------------------------------
          for (const n of nodes) {
            // Gentle pull toward nearby anchors (the "wired-in" gravity).
            for (const a of anchors) {
              const dx = a.x - n.x;
              const dy = a.y - n.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < nexusRadius2 && d2 > 1) {
                const d = Math.sqrt(d2);
                const fall = 1 - d / nexusRadius; // 1 at center, 0 at edge
                const force = nexusPull * a.w * fall * 60;
                n.vx += (dx / d) * force * dt;
                n.vy += (dy / d) * force * dt;
              }
            }

            // Light damping keeps pulled nodes from accelerating forever.
            n.vx *= 0.992;
            n.vy *= 0.992;

            n.x += n.vx * dt;
            n.y += n.vy * dt;

            // Bounce off bounds.
            if (n.x < 0) {
              n.x = 0;
              n.vx = Math.abs(n.vx);
            } else if (n.x > width) {
              n.x = width;
              n.vx = -Math.abs(n.vx);
            }
            if (n.y < 0) {
              n.y = 0;
              n.vy = Math.abs(n.vy);
            } else if (n.y > height) {
              n.y = height;
              n.vy = -Math.abs(n.vy);
            }

            // Ripple boost: nodes near the expanding ring flare briefly.
            if (ripple.active) {
              const rdx = n.x - ripple.x;
              const rdy = n.y - ripple.y;
              const rd = Math.hypot(rdx, rdy);
              if (Math.abs(rd - rippleRadius) < 60) {
                n.bright = Math.min(1, n.bright + 0.9);
              }
            }
            // Decay transient brightness.
            n.bright *= 0.94;
          }

          c.globalCompositeOperation = "lighter";

          // --- Node-to-node constellation links --------------------------
          c.lineWidth = 1;
          for (let i = 0; i < nodeCount; i++) {
            const a = nodes[i];
            for (let j = i + 1; j < nodeCount; j++) {
              const b = nodes[j];
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 >= linkDist2) continue;
              const d = Math.sqrt(d2);
              const proximity = 1 - d / linkDistance;
              const la = proximity * 0.4 + Math.max(a.bright, b.bright) * 0.3;
              if (la <= 0.01) continue;
              c.globalAlpha = Math.min(1, la);
              c.strokeStyle = paletteColor(mode, hue, hue2, (a.t + b.t) * 0.5, 90, 60);
              c.beginPath();
              c.moveTo(a.x, a.y);
              c.lineTo(b.x, b.y);
              c.stroke();
            }
          }

          // --- Brighter connector lines from anchors to nearby nodes ------
          c.lineWidth = 1.4;
          for (const a of anchors) {
            for (const n of nodes) {
              const dx = a.x - n.x;
              const dy = a.y - n.y;
              const d2 = dx * dx + dy * dy;
              if (d2 >= nexusRadius2) continue;
              const d = Math.sqrt(d2);
              const fall = 1 - d / nexusRadius;
              const la = fall * fall * 0.7 * a.w;
              if (la <= 0.02) continue;
              c.globalAlpha = Math.min(1, la);
              c.strokeStyle = paletteColor(mode, hue, hue2, n.t, 100, 68);
              c.beginPath();
              c.moveTo(a.x, a.y);
              c.lineTo(n.x, n.y);
              c.stroke();
              // Light the wired node.
              n.bright = Math.max(n.bright, fall * 0.6);
            }
          }

          // --- Nodes ------------------------------------------------------
          for (const n of nodes) {
            const pulse = 1 + Math.sin(time * 2.4 + n.t * 9) * 0.18;
            const glow = 0.55 + n.bright * 0.45;
            const r = n.size * pulse * (1 + n.bright * 0.6);
            const col = paletteColor(mode, hue, hue2, n.t, 100, 66);
            const colHi = paletteColor(mode, hue, hue2, n.t, 100, 84);
            c.globalAlpha = glow;
            c.fillStyle = col;
            c.beginPath();
            c.arc(n.x, n.y, r, 0, Math.PI * 2);
            c.fill();
            c.globalAlpha = glow * 0.6;
            c.fillStyle = colHi;
            c.beginPath();
            c.arc(n.x, n.y, r * 0.5, 0, Math.PI * 2);
            c.fill();
          }

          // --- Soft halo behind the card anchor --------------------------
          if (showCard) {
            const haloR = nexusRadius * 0.5;
            const grad = c.createRadialGradient(card.x, card.y, 0, card.x, card.y, haloR);
            const haloHue = Math.round(paletteHue(mode, hue, hue2, 0.5));
            grad.addColorStop(0, `hsla(${haloHue}, 100%, 60%, 0.16)`);
            grad.addColorStop(1, `hsla(${haloHue}, 100%, 60%, 0)`);
            c.globalAlpha = 1;
            c.fillStyle = grad;
            c.beginPath();
            c.arc(card.x, card.y, haloR, 0, Math.PI * 2);
            c.fill();
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [nodeCount, linkDistance, speed, nexusPull, showCard, mode, hue, hue2]
  );

  // Palette-derived gradient stops for the glassy card surface.
  const h1 = Math.round(paletteHue(mode, hue, hue2, 0));
  const hMid = Math.round(paletteHue(mode, hue, hue2, 0.5));
  const h3 = Math.round(paletteHue(mode, hue, hue2, 1));

  return (
    <div className="relative h-full w-full bg-[#05060a]">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
      {showCard && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="relative overflow-hidden rounded-2xl border border-white/15 px-7 py-6 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/10 backdrop-blur-md"
            style={{
              background: `linear-gradient(135deg, hsla(${h1}, 85%, 55%, 0.22), hsla(${hMid}, 85%, 55%, 0.12) 45%, hsla(${h3}, 85%, 55%, 0.22))`,
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 42%, rgba(0,0,0,0.30))",
              }}
            />
            <div className="relative flex flex-col items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/60">
                Asset
              </span>
              <span className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                {cardTitle}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
                Wired into the nexus
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
