"use client";

import { useEffect, useRef } from "react";
import { paletteHue, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

// Three gradient stops, mirroring flip-card's palette logic: Single warms the
// sweep, Dual blends hue->hue2, Rainbow spreads +120/+240.
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
      : (hue + 50) % 360;
  const h3 =
    mode === "dual"
      ? hue2
      : mode === "rainbow"
      ? (hue + 240) % 360
      : (hue + 300) % 360;
  return [
    `hsl(${hue} 85% 58%)`,
    `hsl(${h2} 85% 52%)`,
    `hsl(${h3} 80% 48%)`,
  ];
}

// Build a left-to-right brush-edge clip polygon for reveal progress p (0..1).
// `softness` controls how ragged/wide the wet edge is; `phase` shimmers it.
function brushClip(p: number, softness: number, phase: number): string {
  const rows = 12;
  const amp = 4 + softness * 16;
  // Sweep a little past the edges so p=0 fully hides and p=1 fully reveals.
  const head = p * (100 + amp * 2) - amp;
  const pts: string[] = ["0% 0%"];
  for (let i = 0; i <= rows; i++) {
    const y = (i / rows) * 100;
    const wobble =
      Math.sin(y * 0.18 + phase) * amp +
      Math.sin(y * 0.07 - phase * 1.7) * amp * 0.5;
    const x = Math.max(0, Math.min(100, head + wobble));
    pts.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  }
  pts.push("0% 100%");
  return `polygon(${pts.join(", ")})`;
}

type Phase = "reveal" | "hold" | "fade" | "gap";

export function WatercolorReveal({ params }: { params: EffectProps }) {
  const text = String(params.text ?? "Bloom");
  const duration = Math.max(0.4, Number(params.duration ?? 1.6));
  const softness = Number(params.softness ?? 0.5);
  const autoLoop = Boolean(params.autoLoop ?? true);
  const hue = Number(params.hue ?? 280);
  const colorMode = String(params.colorMode ?? "dual") as ColorMode;
  const hue2 = Number(params.hue2 ?? 190);

  const panelRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const textEl = textRef.current;
    const wrap = wrapRef.current;
    if (!panel || !textEl || !wrap) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduce) {
      // Render a single calm, fully revealed frame.
      panel.style.clipPath = "none";
      panel.style.opacity = "1";
      textEl.style.opacity = "1";
      textEl.style.transform = "translateY(0px)";
      return;
    }

    let phase: Phase = "reveal";
    let elapsed = 0;
    const holdDur = duration * 1.1;
    const fadeDur = duration * 0.6;
    const gapDur = 0.5;

    const restart = () => {
      phase = "reveal";
      elapsed = 0;
    };
    wrap.addEventListener("pointerdown", restart);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      const shimmer = now / 1000;

      let p = 0;
      let opacity = 1;
      if (phase === "reveal") {
        const r = Math.min(1, elapsed / duration);
        // easeOutCubic for a confident brush sweep.
        p = 1 - Math.pow(1 - r, 3);
        opacity = Math.min(1, r * 1.6);
        if (r >= 1) {
          phase = "hold";
          elapsed = 0;
        }
      } else if (phase === "hold") {
        p = 1;
        opacity = 1;
        if (elapsed >= holdDur) {
          phase = "fade";
          elapsed = 0;
        }
      } else if (phase === "fade") {
        p = 1;
        opacity = Math.max(0, 1 - elapsed / fadeDur);
        if (elapsed >= fadeDur) {
          if (!autoLoop) {
            opacity = 0;
            panel.style.opacity = "0";
            return; // park until a click restarts it
          }
          phase = "gap";
          elapsed = 0;
        }
      } else {
        p = 0;
        opacity = 0;
        if (elapsed >= gapDur) restart();
      }

      panel.style.clipPath = brushClip(p, softness, shimmer);
      panel.style.opacity = String(opacity);
      // Text drifts up slightly as it settles, fading with the panel.
      const textReveal = Math.max(0, Math.min(1, (p - 0.35) / 0.5));
      textEl.style.opacity = String(textReveal * opacity);
      textEl.style.transform = `translateY(${(1 - textReveal) * 14}px)`;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointerdown", restart);
    };
  }, [text, duration, softness, autoLoop, hue, hue2, colorMode]);

  const [g1, g2, g3] = gradientStops(colorMode, hue, hue2);
  const haloColor = `hsl(${hue} 85% 60%)`;

  return (
    <div
      ref={wrapRef}
      className="relative flex h-full w-full cursor-pointer select-none items-center justify-center overflow-hidden bg-[#05060a] p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${haloColor}, transparent 70%)`,
        }}
      />
      <div
        ref={panelRef}
        className="relative flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-3xl will-change-[clip-path,opacity]"
        style={{
          background: `linear-gradient(135deg, ${g1}, ${g2} 48%, ${g3})`,
          boxShadow: "0 30px 70px -20px rgba(0,0,0,0.7)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%, rgba(0,0,0,0.25))",
          }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/15" />
        <div
          ref={textRef}
          className="relative px-6 text-center will-change-[transform,opacity]"
        >
          <span
            className="block text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-5xl"
            style={{ whiteSpace: "pre-line" }}
          >
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
