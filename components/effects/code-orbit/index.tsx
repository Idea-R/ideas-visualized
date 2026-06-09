"use client";

import { useEffect, useRef } from "react";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

const SNIPPETS = [
  "const ai = new Intelligence();",
  "if (idea.isValid()) {",
  "return solve(puzzle);",
  "async function dream() {",
  "let creativity = Infinity;",
  "while (learning) {",
  "evolve();",
  "const magic = code + passion;",
  "function inspire() {",
  "return community.share();",
  "const future = await build();",
  "export default App;",
  "useEffect(() => {});",
  "await fetch(url);",
  "map((x) => x * 2)",
  "=> { return true; }",
  "npm run build",
  'git commit -m "ship"',
];

interface Block {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  anchorX: number;
  anchorY: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  depth: number;
  breathingPhase: number;
  driftAngle: number;
  driftSpeed: number;
}

export function CodeOrbit({ params }: { params: EffectProps }) {
  const tokenCount = Math.max(0, Math.round(Number(params.tokens ?? 28)));
  const driftSpeed = Number(params.drift ?? 1);
  const ripple = Number(params.ripple ?? 1);
  const { mode, hue, hue2 } = readPalette(params);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = container.clientWidth || 1;
    let h = container.clientHeight || 1;

    const RIPPLE_RADIUS = 200;
    const GENTLE_FORCE = 0.6 * ripple;
    const DAMPING = 0.98;
    const ORBITAL_SPEED = 0.0008;
    const BREATHING = 0.003;

    const mouse = { x: -9999, y: -9999, moving: false };
    let moveTimeout: ReturnType<typeof setTimeout> | undefined;

    const setTransform = (b: Block, extraScale = 1) => {
      const scale = (0.8 + b.depth * 0.4) * extraScale;
      b.el.style.transform = `translate(${b.x}px, ${b.y}px) scale(${scale})`;
    };

    const makeBlock = (): Block => {
      const el = document.createElement("span");
      el.textContent = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
      el.style.position = "absolute";
      el.style.left = "0";
      el.style.top = "0";
      el.style.whiteSpace = "nowrap";
      el.style.fontFamily =
        "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      el.style.pointerEvents = "none";
      el.style.willChange = "transform";

      const depth = Math.random();
      el.style.fontSize = `${10 + depth * 8}px`;
      const colHue = paletteHue(mode, hue, hue2, depth);
      el.style.color = `hsla(${colHue}, 90%, ${60 + depth * 15}%, ${
        0.25 + depth * 0.5
      })`;
      el.style.textShadow = `0 0 ${6 + depth * 10}px hsla(${colHue}, 90%, 60%, ${
        0.3 * depth
      })`;

      const cx = w / 2;
      const cy = h / 2;
      const orbitR0 = Math.min(w, h) * (0.15 + Math.random() * 0.35);
      const orbitA0 = Math.random() * Math.PI * 2;
      const anchorX = cx + Math.cos(orbitA0) * orbitR0;
      const anchorY = cy + Math.sin(orbitA0) * orbitR0;

      container.appendChild(el);

      const b: Block = {
        el,
        x: anchorX,
        y: anchorY,
        vx: 0,
        vy: 0,
        anchorX,
        anchorY,
        orbitRadius: 20 + Math.random() * 60,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: ORBITAL_SPEED * (0.5 + Math.random()) * driftSpeed,
        depth,
        breathingPhase: Math.random() * Math.PI * 2,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: 0.1 + Math.random() * 0.2,
      };
      setTransform(b);
      return b;
    };

    const blocks: Block[] = [];
    for (let i = 0; i < tokenCount; i++) blocks.push(makeBlock());

    const onMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.moving = true;
      if (moveTimeout) clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        mouse.moving = false;
      }, 180);
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      mouse.moving = false;
    };

    const ro = new ResizeObserver(() => {
      w = container.clientWidth || 1;
      h = container.clientHeight || 1;
    });
    ro.observe(container);

    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const tick = () => {
      for (const b of blocks) {
        b.orbitAngle += b.orbitSpeed;
        const orbitX = b.anchorX + Math.cos(b.orbitAngle) * b.orbitRadius;
        const orbitY = b.anchorY + Math.sin(b.orbitAngle) * b.orbitRadius;

        b.breathingPhase += BREATHING;
        const breathing = 1 + Math.sin(b.breathingPhase) * 0.05;

        b.driftAngle += b.driftSpeed * 0.005 * driftSpeed;
        const driftX = Math.cos(b.driftAngle) * 15;
        const driftY = Math.sin(b.driftAngle) * 15;

        const targetX = orbitX + driftX;
        const targetY = orbitY + driftY;

        const dx = mouse.x - b.x;
        const dy = mouse.y - b.y;
        const dist = Math.hypot(dx, dy);

        let extraScale = 1;
        if (dist < RIPPLE_RADIUS && mouse.moving) {
          const strength = (RIPPLE_RADIUS - dist) / RIPPLE_RADIUS;
          const ang = Math.atan2(dy, dx);
          const push = strength * GENTLE_FORCE;
          b.vx -= Math.cos(ang) * push;
          b.vy -= Math.sin(ang) * push;
          if (dist < RIPPLE_RADIUS * 0.3) extraScale = breathing * 1.12;
          else if (dist < RIPPLE_RADIUS * 0.7) extraScale = breathing;
        } else {
          const attraction = 0.003;
          b.vx += (targetX - b.x) * attraction;
          b.vy += (targetY - b.y) * attraction;
        }

        b.vx *= DAMPING;
        b.vy *= DAMPING;
        b.x += b.vx;
        b.y += b.vy;

        const margin = 180;
        if (
          b.x < -margin ||
          b.x > w + margin ||
          b.y < -margin ||
          b.y > h + margin
        ) {
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.min(w, h) * (0.15 + Math.random() * 0.35);
          const a = Math.random() * Math.PI * 2;
          b.anchorX = cx + Math.cos(a) * r;
          b.anchorY = cy + Math.sin(a) * r;
          b.x = b.anchorX;
          b.y = b.anchorY;
          b.vx = 0;
          b.vy = 0;
        }

        setTransform(b, extraScale);
      }
      raf = requestAnimationFrame(tick);
    };

    if (!reduce) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      if (moveTimeout) clearTimeout(moveTimeout);
      for (const b of blocks) b.el.remove();
    };
  }, [tokenCount, driftSpeed, ripple, mode, hue, hue2]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "#05060a" }}
    />
  );
}
