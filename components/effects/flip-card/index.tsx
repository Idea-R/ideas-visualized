"use client";

import { useEffect, useRef } from "react";
import { paletteHue, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type FlipAxis = "y" | "x";
type Trigger = "click" | "hover";

// Three gradient stops, mirroring tilt-card's palette logic: Single warms the
// sweep, Dual blends hue→hue2, Rainbow spreads +120/+240.
function gradientStops(
  mode: ColorMode,
  hue: number,
  hue2: number
): [string, string, string] {
  const h2 =
    mode === "dual"
      ? paletteHue("dual", hue, hue2, 0.5)
      : mode === "rainbow"
      ? (hue + 120) % 360
      : (hue + 60) % 360;
  const h3 =
    mode === "dual"
      ? hue2
      : mode === "rainbow"
      ? (hue + 240) % 360
      : (hue + 300) % 360;
  return [
    `hsl(${hue} 90% 60%)`,
    `hsl(${h2} 90% 55%)`,
    `hsl(${h3} 90% 55%)`,
  ];
}

export function FlipCard({ params }: { params: EffectProps }) {
  const maxTilt = Number(params.maxTilt);
  const glare = Number(params.glare);
  const flipAxis = String(params.flipAxis ?? "y") as FlipAxis;
  const trigger = String(params.trigger ?? "click") as Trigger;
  const frontText = String(params.frontText ?? "IDEAS");
  const backText = String(params.backText ?? "VISUALIZED");
  const hue = Number(params.hue);
  const colorMode = String(params.colorMode ?? "single") as ColorMode;
  const hue2 = Number(params.hue2 ?? hue);

  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const glareFrontRef = useRef<HTMLDivElement>(null);
  const glareBackRef = useRef<HTMLDivElement>(null);

  // Persisted across effect re-runs so param tweaks don't snap the card.
  const target = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, active: 0 });
  const cur = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, active: 0 });
  // Flip animation: cur is the displayed degrees; we ease cur from→to over dur.
  const flip = useRef({ cur: 0, from: 0, to: 0, t: Infinity, dur: 0.7 });
  // Monotonic forward target so repeated triggers keep flipping the same way.
  const flipTargetDeg = useRef(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    const halo = haloRef.current;
    const glareFront = glareFrontRef.current;
    const glareBack = glareBackRef.current;
    if (!wrap || !card) return;

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const startFlip = () => {
      flipTargetDeg.current += 180;
      flip.current.from = flip.current.cur;
      flip.current.to = flipTargetDeg.current;
      flip.current.t = 0;
    };

    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      target.current.ry = (px - 0.5) * maxTilt * 2;
      target.current.rx = -(py - 0.5) * maxTilt * 2;
      target.current.gx = px * 100;
      target.current.gy = py * 100;
      target.current.active = 1;
    };
    const onEnter = () => {
      if (trigger === "hover") startFlip();
    };
    const onLeave = () => {
      target.current.rx = 0;
      target.current.ry = 0;
      target.current.gx = 50;
      target.current.gy = 50;
      target.current.active = 0;
      if (trigger === "hover") startFlip();
    };
    const onDown = () => {
      if (trigger === "click") startFlip();
    };

    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointerleave", onLeave);
    wrap.addEventListener("pointerdown", onDown);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const easeInOut = (p: number) =>
      p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

    let raf = 0;
    let last = performance.now();
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const t = reduce ? 1 : 0.12;
      const c = cur.current;
      const g = target.current;
      c.rx = lerp(c.rx, g.rx, t);
      c.ry = lerp(c.ry, g.ry, t);
      c.gx = lerp(c.gx, g.gx, t);
      c.gy = lerp(c.gy, g.gy, t);
      c.active = lerp(c.active, g.active, t);

      // --- Flip rotation: eased rAF interpolation (snap when reduced) -------
      const f = flip.current;
      if (f.t < f.dur) {
        f.t += reduce ? f.dur : dt;
        const p = Math.min(1, f.t / f.dur);
        f.cur = lerp(f.from, f.to, easeInOut(p));
      } else {
        f.cur = f.to;
      }
      const flipDeg = f.cur;

      // Compose tilt with the flip on the chosen axis.
      const rx = c.rx + (flipAxis === "x" ? flipDeg : 0);
      const ry = c.ry + (flipAxis === "x" ? 0 : flipDeg);
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;

      const glareBg = `radial-gradient(circle at ${c.gx}% ${c.gy}%, rgba(255,255,255,${
        0.55 * glare
      }) 0%, rgba(255,255,255,${0.12 * glare}) 18%, rgba(255,255,255,0) 55%)`;
      if (glareFront) {
        glareFront.style.background = glareBg;
        glareFront.style.opacity = String(c.active);
      }
      if (glareBack) {
        glareBack.style.background = glareBg;
        glareBack.style.opacity = String(c.active);
      }

      if (halo) {
        halo.style.opacity = String(0.4 + c.active * 0.45);
        halo.style.transform = `translate(${c.ry * 0.4}px, ${-c.rx * 0.4}px)`;
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("pointerdown", onDown);
    };
  }, [maxTilt, glare, flipAxis, trigger, hue, hue2, colorMode]);

  // Front uses the canonical sweep; back shifts toward hue2 (or +180 in single)
  // so the flip reveals an obviously different tone.
  const [f1, f2, f3] = gradientStops(colorMode, hue, hue2);
  const backBase = colorMode === "single" ? (hue + 180) % 360 : hue2;
  const [b1, b2, b3] = gradientStops(colorMode, backBase, hue);

  const haloColor = `hsl(${hue} 90% 60%)`;
  const backRotation =
    flipAxis === "x" ? "rotateX(180deg)" : "rotateY(180deg)";

  // Shared classes for a face's clipped gradient surface + 3D positioning.
  const faceClass =
    "absolute inset-0 overflow-hidden rounded-3xl border border-white/15 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]";

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#05060a] p-8">
      <div
        ref={wrapRef}
        className="relative cursor-pointer select-none"
        style={{ perspective: "1000px" }}
      >
        <div
          ref={haloRef}
          aria-hidden
          className="pointer-events-none absolute -inset-8 rounded-[2.5rem] blur-3xl"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${haloColor}, transparent 70%)`,
          }}
        />
        <div
          ref={cardRef}
          className="relative h-72 w-56 will-change-transform sm:h-80 sm:w-64"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* FRONT face */}
          <div
            className={faceClass}
            style={{
              background: `linear-gradient(135deg, ${f1}, ${f2} 45%, ${f3})`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.20), rgba(255,255,255,0) 42%, rgba(0,0,0,0.28))",
              }}
            />
            <div
              ref={glareFrontRef}
              className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay"
            />
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/70">
                Showcase
              </span>
              <span
                className="text-2xl font-extrabold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-3xl"
                style={{ whiteSpace: "pre-line" }}
              >
                {frontText}
              </span>
            </div>
          </div>
          {/* BACK face — pre-rotated 180° about the flip axis. */}
          <div
            className={faceClass}
            style={{
              background: `linear-gradient(135deg, ${b1}, ${b2} 45%, ${b3})`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: backRotation,
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.20), rgba(255,255,255,0) 42%, rgba(0,0,0,0.28))",
              }}
            />
            <div
              ref={glareBackRef}
              className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay"
            />
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/70">
                Showcase
              </span>
              <span
                className="text-2xl font-extrabold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-3xl"
                style={{ whiteSpace: "pre-line" }}
              >
                {backText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
