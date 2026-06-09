"use client";

import { useEffect, useRef } from "react";
import { paletteHue, readPalette } from "@/lib/effects/color";
import type { EffectProps } from "@/lib/effects/types";

type Variant = "radial" | "spiral" | "hex-pit" | "neon-warp" | "ripple-well";

const HEX = "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0 50%)";
const LAYERS = 9;

export function DepthTunnel({ params }: { params: EffectProps }) {
  const variant = String(params.variant ?? "radial") as Variant;
  const depth = Number(params.depth ?? 60);
  const { mode, hue, hue2 } = readPalette(params);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const swirlRef = useRef<HTMLDivElement>(null);
  const breatheRef = useRef<HTMLDivElement>(null);

  // Pointer target/current, persisted across re-renders so param tweaks don't
  // snap the tunnel.
  const target = useRef({ rx: 0, ry: 0 });
  const cur = useRef({ rx: 0, ry: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    if (!container || !stage) return;

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const d = Math.max(0, Math.min(100, depth)) / 100;
    const maxRot = 5 + d * 18; // degrees of parallax tilt

    const onMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      target.current.ry = px * maxRot * 2;
      target.current.rx = -py * maxRot * 2;
    };
    const onLeave = () => {
      target.current.rx = 0;
      target.current.ry = 0;
    };
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerleave", onLeave);

    if (reduce) {
      // One calm, centered frame — no continuous motion.
      stage.style.transform = "rotateX(0deg) rotateY(0deg)";
      if (swirlRef.current) swirlRef.current.style.transform = "rotate(0deg)";
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      return () => {
        container.removeEventListener("pointermove", onMove);
        container.removeEventListener("pointerleave", onLeave);
      };
    }

    let raf = 0;
    let last = performance.now();
    let spin = 0;
    let elapsed = 0;
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      const c = cur.current;
      const g = target.current;
      c.rx += (g.rx - c.rx) * 0.08;
      c.ry += (g.ry - c.ry) * 0.08;
      stage.style.transform = `rotateX(${c.rx}deg) rotateY(${c.ry}deg)`;

      if (swirlRef.current) {
        spin += dt * (8 + d * 16);
        swirlRef.current.style.transform = `translate(-50%, -50%) rotate(${spin}deg)`;
      }
      if (breatheRef.current) {
        const b = 1 + Math.sin(elapsed * 1.4) * 0.03 * (0.5 + d);
        breatheRef.current.style.transform = `translateZ(0) scale(${b})`;
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
    };
  }, [variant, depth, mode, hue, hue2]);

  const d = Math.max(0, Math.min(100, depth)) / 100;
  const zSpacing = 26 + d * 90;
  const perspective = 900 - d * 350; // tighter perspective reads as deeper

  const layerHue = (i: number) => paletteHue(mode, hue, hue2, i / (LAYERS - 1));

  const layers = Array.from({ length: LAYERS }, (_, i) => {
    const sizePct = 100 - i * (72 / LAYERS);
    const z = -i * zSpacing;
    const h = layerHue(i);
    const base: React.CSSProperties = {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: `${sizePct}%`,
      height: `${sizePct}%`,
      transform: `translate(-50%, -50%) translateZ(${z}px)`,
      pointerEvents: "none",
    };

    if (variant === "hex-pit") {
      return (
        <div
          key={i}
          style={{
            ...base,
            clipPath: HEX,
            background: `linear-gradient(180deg, hsla(${h}, 70%, 60%, ${
              0.1 + i * 0.02
            }), hsla(${h}, 70%, 30%, ${0.04 + i * 0.03}))`,
            boxShadow: `0 0 0 1.5px hsla(${h}, 80%, 65%, 0.25)`,
          }}
        />
      );
    }

    if (variant === "ripple-well") {
      return (
        <div
          key={i}
          style={{
            ...base,
            borderRadius: "50%",
            border: `1.5px solid hsla(${h}, 85%, 65%, ${0.5 - i * 0.04})`,
            background: `radial-gradient(circle at 50% 50%, hsla(${h}, 70%, 40%, ${
              0.05 + i * 0.02
            }), rgba(0,0,0,${0.1 + i * 0.05}))`,
          }}
        />
      );
    }

    if (variant === "neon-warp") {
      return (
        <div
          key={i}
          style={{
            ...base,
            borderRadius: `${18 + i * 2}px`,
            border: `1.5px solid hsla(${h}, 95%, 68%, ${0.7 - i * 0.05})`,
            boxShadow: `0 0 ${10 + i * 4}px hsla(${h}, 95%, 60%, ${
              0.55 - i * 0.04
            }), inset 0 0 ${8 + i * 3}px hsla(${h}, 95%, 60%, ${0.35 - i * 0.03})`,
            background: `hsla(${h}, 80%, 12%, ${0.15 + i * 0.03})`,
          }}
        />
      );
    }

    // "radial" and the ring scaffold under "spiral".
    return (
      <div
        key={i}
        style={{
          ...base,
          borderRadius: `${16 + i * 2}px`,
          border: `1.5px solid hsla(${h}, 80%, 65%, ${0.45 - i * 0.04})`,
          background: `linear-gradient(180deg, hsla(${h}, 60%, 45%, ${
            0.04 + i * 0.01
          }), rgba(0,0,0,${0.12 + i * 0.05}))`,
        }}
      />
    );
  });

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        perspective: `${perspective}px`,
        background: `radial-gradient(120% 100% at 50% 30%, hsla(${hue}, 60%, 12%, 0.6), #05060a 70%)`,
      }}
    >
      <div
        ref={stageRef}
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d", willChange: "transform" }}
      >
        {variant === "spiral" && (
          <div
            ref={swirlRef}
            aria-hidden
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "160%",
              height: "160%",
              transform: "translate(-50%, -50%)",
              background: `repeating-conic-gradient(from 0deg at 50% 50%, hsla(${paletteHue(
                mode,
                hue,
                hue2,
                0.5
              )}, 80%, 60%, 0.10) 0deg 7deg, transparent 7deg 14deg)`,
              WebkitMaskImage:
                "radial-gradient(circle at 50% 50%, black 58%, transparent 100%)",
              maskImage:
                "radial-gradient(circle at 50% 50%, black 58%, transparent 100%)",
              pointerEvents: "none",
            }}
          />
        )}

        <div
          ref={breatheRef}
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {layers}
        </div>

        {/* Glowing core at the bottom of the tunnel. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "16%",
            height: "16%",
            transform: `translate(-50%, -50%) translateZ(${-LAYERS * zSpacing}px)`,
            borderRadius: "50%",
            background: `radial-gradient(circle, hsla(${layerHue(
              LAYERS - 1
            )}, 100%, 75%, 0.9), hsla(${layerHue(
              LAYERS - 1
            )}, 90%, 50%, 0.15) 60%, transparent 70%)`,
            boxShadow: `0 0 40px hsla(${layerHue(LAYERS - 1)}, 95%, 60%, 0.6)`,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
