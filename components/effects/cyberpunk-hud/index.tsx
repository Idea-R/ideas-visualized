"use client";

import { useEffect, useRef, useState } from "react";
import type { EffectProps } from "@/lib/effects/types";

const MAX_SCORE = 1_000_000;
const GLITCH_STEP = 100_000; // flash each time the count crosses this

export function CyberpunkHud({ params }: { params: EffectProps }) {
  const hue = Number(params.hue);
  const speed = Number(params.speed);
  const scanlines = Boolean(params.scanlines);
  const glow = Number(params.glow);

  const [score, setScore] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const scoreRef = useRef(0);
  const lastBandRef = useRef(0);

  // Count up over time, loop back to 0, and flash on threshold crossings.
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let last = performance.now();
    let glitchTimer: ReturnType<typeof setTimeout> | undefined;
    const rate = 90_000 * speed; // points per second

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let next = scoreRef.current + rate * dt;
      let band = Math.floor(next / GLITCH_STEP);
      if (next >= MAX_SCORE) {
        next = 0;
        band = 0;
      }
      if (band !== lastBandRef.current) {
        lastBandRef.current = band;
        if (band !== 0 && !reduce) {
          setGlitch(true);
          clearTimeout(glitchTimer);
          glitchTimer = setTimeout(() => setGlitch(false), 360);
        }
      }
      scoreRef.current = next;
      setScore(Math.floor(next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(glitchTimer);
    };
  }, [speed]);

  const accent = `hsl(${hue} 100% 60%)`;
  const accentSoft = `hsl(${hue} 100% 60% / 0.12)`;
  const g = 0.4 + glow;

  const digits = score.toLocaleString("en-US").padStart(9, " ").split("");

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#05060a]">
      <style>{`
        @keyframes cyberpunk-hud-circuit {
          0% { background-position: 0 0; }
          100% { background-position: 48px 0; }
        }
        @keyframes cyberpunk-hud-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes cyberpunk-hud-shimmer {
          0% { left: -120%; }
          55% { left: 130%; }
          100% { left: 130%; }
        }
        @keyframes cyberpunk-hud-ring {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.14); opacity: 0; }
        }
        @keyframes cyberpunk-hud-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.78; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cyberpunk-hud-anim { animation: none !important; }
        }
      `}</style>

      <div
        style={{
          position: "relative",
          padding: "26px 38px",
          borderRadius: "14px",
          border: `2px solid ${accent}`,
          background:
            "linear-gradient(135deg, rgba(4,12,22,0.92), rgba(6,20,34,0.85))",
          boxShadow: `0 0 ${24 * g}px hsl(${hue} 100% 55% / 0.55), inset 0 0 ${
            22 * g
          }px hsl(${hue} 100% 60% / 0.14)`,
          overflow: "hidden",
          minWidth: "320px",
          textAlign: "center",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {/* Circuit pattern background */}
        <div
          className="cyberpunk-hud-anim"
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0 11px, ${accentSoft} 11px 12px), repeating-linear-gradient(0deg, transparent 0 24px, ${accentSoft} 24px 25px)`,
            animation: "cyberpunk-hud-circuit 2.4s linear infinite",
            zIndex: 1,
          }}
        />

        {/* Scan lines */}
        {scanlines && (
          <div
            className="cyberpunk-hud-anim"
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `repeating-linear-gradient(0deg, transparent 0 2px, hsl(${hue} 100% 60% / 0.12) 2px, hsl(${hue} 100% 60% / 0.12) 3px)`,
              animation: "cyberpunk-hud-scan 3s linear infinite",
              zIndex: 2,
            }}
          />
        )}

        {/* Label */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            fontFamily: '"Orbitron", ui-monospace, monospace',
            fontSize: "11px",
            letterSpacing: "0.5em",
            color: accent,
            opacity: 0.8,
            marginBottom: "8px",
            textShadow: `0 0 8px ${accent}`,
          }}
        >
          SCORE
        </div>

        {/* Score digits */}
        <div
          className={glitch ? "cyberpunk-hud-anim" : undefined}
          style={{
            position: "relative",
            zIndex: 3,
            fontFamily: '"Orbitron", ui-monospace, monospace',
            fontSize: "44px",
            fontWeight: 800,
            color: "#f4fbff",
            letterSpacing: "0.06em",
            textShadow: glitch
              ? `2px 0 hsl(${(hue + 180) % 360} 100% 60%), -2px 0 ${accent}, 0 0 18px ${accent}`
              : `0 0 10px ${accent}, 0 0 22px hsl(${hue} 100% 55% / 0.7)`,
            transform: glitch ? "translateX(1px)" : "none",
            animation: glitch ? "cyberpunk-hud-flicker 0.12s steps(2) 3" : "none",
            transition: "text-shadow 0.2s ease",
          }}
        >
          {digits.map((char, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: char === " " ? 0.18 : char === "," ? 0.6 : 1,
              }}
            >
              {char === " " ? "0" : char}
            </span>
          ))}
        </div>

        {/* Holographic shimmer */}
        <div
          className="cyberpunk-hud-anim"
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: "-120%",
            width: "60%",
            height: "100%",
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
            animation: "cyberpunk-hud-shimmer 3.6s ease-in-out infinite",
            zIndex: 4,
            pointerEvents: "none",
          }}
        />

        {/* Glow ring on glitch */}
        {glitch && (
          <div
            className="cyberpunk-hud-anim"
            aria-hidden
            style={{
              position: "absolute",
              inset: "-8px",
              border: `2px solid ${accent}`,
              borderRadius: "18px",
              boxShadow: `0 0 28px ${accent}`,
              animation: "cyberpunk-hud-ring 0.4s ease-out",
              zIndex: 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
