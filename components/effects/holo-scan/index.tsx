"use client";

import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { paletteColor, type ColorMode } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

/**
 * Holographic Scan Card — a 3D-tilted glassy "generating infographic" card.
 * Ported from FigGlow's InfographicPreview: depth-parallax layers, chart bars
 * that grow and cycle, pulsing glow orbs, and a cyan scan beam that sweeps
 * top-to-bottom with a trailing light wash. Tilts toward the pointer; idles
 * with a gentle auto float so a still screenshot still reads as 3D.
 */
export function HoloScan({ params }: { params: EffectProps }) {
  const colorMode = String(params.colorMode ?? "single") as ColorMode;
  const hue = Number(params.hue ?? 190);
  const hue2 = Number(params.hue2 ?? hue);
  const scanSpeed = Number(params.scanSpeed ?? 1);
  const tilt = Number(params.tilt ?? 1);
  const barCount = Math.max(3, Math.min(8, Math.round(Number(params.bars ?? 4))));
  const glow = Number(params.glow ?? 1);

  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);

  // Pointer-driven tilt target + smoothed current value (persisted across
  // param tweaks so re-runs don't snap the card).
  const target = useRef({ rx: 0, ry: 0, active: 0 });
  const cur = useRef({ rx: 0, ry: 0, active: 0 });

  // Accent colors resolved from the shared palette helper.
  const accent = paletteColor(colorMode, hue, hue2, 0);
  const accent2 = paletteColor(colorMode, hue, hue2, 1, 100, 60);
  const beam = paletteColor(colorMode, hue, hue2, 0.5, 100, 70);

  // Static bar definitions: stable per bar count so heights/timings don't churn.
  const bars = useMemo(() => {
    const out: { height: number; duration: number; delay: number; t: number }[] = [];
    for (let i = 0; i < barCount; i++) {
      const t = barCount === 1 ? 0.5 : i / (barCount - 1);
      const wave = 0.45 + 0.42 * Math.abs(Math.sin(i * 1.7 + 0.6));
      out.push({
        height: Math.round(wave * 100),
        duration: 1.8 + (i % 4) * 0.35,
        delay: (i % 5) * 0.18,
        t,
      });
    }
    return out;
  }, [barCount]);

  // Pointer handlers (React) update the tilt target; the rAF loop smooths it.
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const maxTilt = 14 * tilt;
    target.current.ry = (px - 0.5) * maxTilt * 2;
    target.current.rx = -(py - 0.5) * maxTilt * 2;
    target.current.active = 1;
  };
  const handlePointerLeave = () => {
    target.current.rx = 0;
    target.current.ry = 0;
    target.current.active = 0;
  };

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    let raf = 0;
    const start = performance.now();
    const render = (now: number) => {
      const elapsed = (now - start) / 1000;
      const c = cur.current;
      const g = target.current;
      const t = reduce ? 1 : 0.1;
      c.active = lerp(c.active, g.active, t);

      // Idle auto-float: a slow figure-eight tilt when the pointer is away, so
      // a static capture still looks dimensional. Fades out as the user takes
      // over (active -> 1).
      const idle = 1 - c.active;
      const floatRx = reduce ? 4 : Math.sin(elapsed * 0.6) * 6 * idle;
      const floatRy = reduce ? -8 : Math.cos(elapsed * 0.45) * 9 * idle;

      c.rx = lerp(c.rx, g.rx + floatRx, t);
      c.ry = lerp(c.ry, g.ry + floatRy, t);

      const bob = reduce ? 0 : Math.sin(elapsed * 0.8) * 6 * idle;

      card.style.transform =
        `translateY(${bob.toFixed(2)}px) ` +
        `rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg)`;

      // Parallax inner layers: nearer layers (footer/chart) shift more with the
      // card's rotation than the deep header.
      const shift = (depth: number) => {
        const x = c.ry * depth;
        const y = -c.rx * depth;
        return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${(depth * 60).toFixed(0)}px)`;
      };
      if (headerRef.current) headerRef.current.style.transform = shift(0.25);
      if (chartRef.current) chartRef.current.style.transform = shift(0.5);
      if (footerRef.current) footerRef.current.style.transform = shift(0.7);

      if (haloRef.current) {
        haloRef.current.style.transform = `translate(${(c.ry * 0.6).toFixed(2)}px, ${(-c.rx * 0.6).toFixed(2)}px)`;
        haloRef.current.style.opacity = (0.4 + c.active * 0.4).toFixed(3);
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  // Scan timing: higher speed -> shorter sweep period.
  const scanDur = (4.5 / Math.max(0.25, scanSpeed)).toFixed(2);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#05060a]">
      <style>{`
        @keyframes hs-scan {
          0% { transform: translateY(-120%); }
          100% { transform: translateY(620%); }
        }
        @keyframes hs-scan-wash {
          0% { transform: translateY(-100%); opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translateY(420%); opacity: 0; }
        }
        @keyframes hs-grow-bar {
          0% { height: 8%; }
          55% { height: var(--hs-bar-h, 60%); }
          100% { height: 8%; }
        }
        @keyframes hs-pulse-glow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes hs-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes hs-blink {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hs-scan-el, .hs-wash-el, .hs-bar, .hs-orb, .hs-shimmer-el, .hs-dot {
            animation: none !important;
          }
          .hs-bar { height: var(--hs-bar-h, 60%) !important; }
        }
      `}</style>

      <div
        ref={stageRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative h-[420px] w-[340px] select-none sm:h-[460px] sm:w-[380px]"
        style={{ perspective: "1200px" }}
      >
        {/* Soft accent halo behind the card */}
        <div
          ref={haloRef}
          aria-hidden
          className="pointer-events-none absolute -inset-10 rounded-[3rem] blur-3xl"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${accent}, transparent 70%)`,
            opacity: 0.4,
          }}
        />

        <div
          ref={cardRef}
          className="relative h-full w-full will-change-transform"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Card surface (clipped). Separate from the 3D layers so its
              overflow:hidden doesn't flatten the preserve-3d context. */}
          <div
            aria-hidden
            className="absolute inset-0 overflow-hidden rounded-3xl border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]"
            style={{
              background:
                "linear-gradient(160deg, #11131c 0%, #0a0c14 55%, #070810 100%)",
            }}
          >
            {/* Blueprint grid */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            {/* Pulsing glow orbs */}
            <div
              className="hs-orb pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
              style={{
                background: accent,
                opacity: 0.4 * glow,
                mixBlendMode: "screen",
                animation: "hs-pulse-glow 4s ease-in-out infinite",
              }}
            />
            <div
              className="hs-orb pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full blur-3xl"
              style={{
                background: accent2,
                opacity: 0.32 * glow,
                mixBlendMode: "screen",
                animation: "hs-pulse-glow 4s ease-in-out 1.5s infinite",
              }}
            />
            {/* Top sheen */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 38%, rgba(0,0,0,0.35))",
              }}
            />

            {/* Scan beam + trailing wash */}
            <div
              className="hs-wash-el pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{
                background: `linear-gradient(to bottom, ${beam}, transparent)`,
                opacity: 0.18,
                mixBlendMode: "screen",
                animation: `hs-scan-wash ${scanDur}s linear infinite`,
              }}
            />
            <div
              className="hs-scan-el pointer-events-none absolute inset-x-0 top-0 h-1.5 blur-[2px]"
              style={{
                background: `linear-gradient(to right, transparent, ${beam}, transparent)`,
                boxShadow: `0 0 18px ${beam}`,
                opacity: 0.85,
                mixBlendMode: "screen",
                animation: `hs-scan ${scanDur}s linear infinite`,
              }}
            />

            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
          </div>

          {/* 3D content layers (unclipped so translateZ parallax is real) */}
          <div
            className="absolute inset-0 flex flex-col p-7"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Header layer */}
            <div
              ref={headerRef}
              className="will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full border-2 border-black/40 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                  }}
                />
                <div className="flex flex-col gap-2">
                  <div className="relative h-2.5 w-24 overflow-hidden rounded bg-white/10">
                    <div
                      className="hs-shimmer-el absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)",
                        animation: "hs-shimmer 2.4s ease-in-out infinite",
                      }}
                    />
                  </div>
                  <div className="h-2 w-16 rounded bg-white/5" />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold leading-tight text-white">
                Generating
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${accent}, ${accent2})`,
                  }}
                >
                  Infographic
                </span>
              </h2>
            </div>

            {/* Chart layer */}
            <div
              ref={chartRef}
              className="relative mt-6 flex-1 will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 flex flex-col justify-end rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
                <div className="flex h-full items-end justify-between gap-2 px-1 pb-1">
                  {bars.map((b, i) => (
                    <div
                      key={i}
                      className="relative h-full w-full overflow-hidden rounded-t-sm"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <div
                        className="hs-bar absolute bottom-0 w-full rounded-t-sm"
                        style={{
                          ["--hs-bar-h" as string]: `${b.height}%`,
                          height: "8%",
                          background: `linear-gradient(to top, ${paletteColor(
                            colorMode,
                            hue,
                            hue2,
                            b.t,
                            100,
                            45
                          )}, ${paletteColor(colorMode, hue, hue2, b.t, 100, 65)})`,
                          boxShadow: `0 0 12px ${paletteColor(
                            colorMode,
                            hue,
                            hue2,
                            b.t,
                            100,
                            55
                          )}`,
                          animation: `hs-grow-bar ${b.duration}s ease-in-out ${b.delay}s infinite`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-px w-full bg-white/15" />
              </div>
            </div>

            {/* Footer layer */}
            <div
              ref={footerRef}
              className="mt-6 flex items-center justify-between will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/60">
                PROMPT: VIRAL_GROWTH
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="hs-dot inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    background: beam,
                    boxShadow: `0 0 8px ${beam}`,
                    animation: "hs-blink 1.4s ease-in-out infinite",
                  }}
                />
                <span className="font-mono text-[10px] font-bold tracking-wide text-white/70">
                  RENDERING
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
