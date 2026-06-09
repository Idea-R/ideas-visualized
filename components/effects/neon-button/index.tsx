"use client";

import { useEffect, useRef, useState } from "react";
import type { EffectProps } from "@/lib/effects/types";

export function NeonButton({ params }: { params: EffectProps }) {
  const hue = Number(params.hue);
  const pulse = Number(params.pulse);
  const glow = Number(params.glow);
  const label = String(params.label);

  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);

  // Drive the blurred underlay pulse with rAF so `pulse` controls both speed
  // and intensity. Falls back to a steady glow when motion is reduced.
  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce || pulse <= 0) {
      el.style.transform = "scale(1.04)";
      el.style.opacity = String(0.45 + glow * 0.25);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const speed = 1.2 * pulse; // cycles modulation
    const amp = 0.5 + pulse * 0.45; // intensity of the breathing

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const wave = (Math.sin(t * speed * Math.PI) + 1) / 2; // 0..1
      const scale = 1 + 0.18 * amp * wave;
      const opacity = 0.4 + (0.45 + glow * 0.3) * amp * wave;
      el.style.transform = `scale(${scale.toFixed(4)})`;
      el.style.opacity = opacity.toFixed(3);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pulse, glow]);

  const accent = `hsl(${hue} 100% 62%)`;
  const accent2 = `hsl(${(hue + 45) % 360} 100% 58%)`;
  const glowColor = `hsl(${hue} 100% 60%)`;

  // Spring-like feedback via an overshooting cubic-bezier on transform.
  const scale = pressed ? 0.93 : hovered ? 1.06 : 1;
  const glowStrength = (hovered ? 1.55 : 1) * (0.4 + glow);

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#05060a]">
      <style>{`
        @keyframes neon-button-sheen {
          0% { transform: translateX(-160%) skewX(-18deg); }
          60% { transform: translateX(220%) skewX(-18deg); }
          100% { transform: translateX(220%) skewX(-18deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .neon-button-sheen-el { animation: none !important; opacity: 0; }
        }
      `}</style>

      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setPressed(false);
        }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        style={{
          position: "relative",
          isolation: "isolate",
          padding: "18px 44px",
          borderRadius: "14px",
          border: `1.5px solid hsl(${hue} 100% 70% / 0.7)`,
          background: `linear-gradient(135deg, ${accent}, ${accent2})`,
          color: "#06070c",
          fontFamily:
            '"Orbitron", ui-monospace, SFMono-Regular, Menlo, monospace',
          fontWeight: 800,
          fontSize: "22px",
          letterSpacing: "0.22em",
          cursor: "pointer",
          overflow: "hidden",
          transform: `scale(${scale})`,
          transition:
            "transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
          boxShadow: `0 0 ${18 * glowStrength}px ${glowColor}, 0 0 ${
            42 * glowStrength
          }px hsl(${hue} 100% 55% / 0.6), inset 0 0 18px hsl(${hue} 100% 80% / 0.35)`,
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        {/* Blurred animated gradient underlay */}
        <div
          ref={glowRef}
          aria-hidden
          style={{
            position: "absolute",
            inset: "-8px",
            zIndex: -1,
            borderRadius: "18px",
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            filter: "blur(16px)",
            opacity: 0.6,
          }}
        />

        {/* Sheen sweep */}
        <span
          className="neon-button-sheen-el"
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "38%",
            height: "100%",
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
            animation: "neon-button-sheen 3.4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        <span
          style={{
            position: "relative",
            zIndex: 1,
            textShadow: "0 0 8px rgba(255,255,255,0.55)",
          }}
        >
          {label}
        </span>
      </button>
    </div>
  );
}
