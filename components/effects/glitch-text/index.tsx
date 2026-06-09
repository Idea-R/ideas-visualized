"use client";

import { useEffect, useRef, useState } from "react";
import type { EffectProps } from "@/lib/effects/types";

const GLYPHS = "ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789#%&*<>/\\{}[]=+-_!?$";
const randGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

export function GlitchText({ params }: { params: EffectProps }) {
  const text = String(params.text || "IDEAS VISUALIZED");
  const speed = Number(params.speed) || 1;
  const intensity = Number(params.intensity);
  const hue = Number(params.hue);
  const scramble = Boolean(params.scramble);

  const len = text.length;
  const [display, setDisplay] = useState<string[]>(() => text.split(""));
  const [jitter, setJitter] = useState<{ x: number; y: number }[]>(() =>
    text.split("").map(() => ({ x: 0, y: 0 }))
  );
  const [energy, setEnergy] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setDisplay(text.split(""));
      setJitter(text.split("").map(() => ({ x: 0, y: 0 })));
      setEnergy(intensity * 0.35);
      return;
    }

    const reveal = scramble ? 1300 / speed : 0;
    const hold = 4200 / speed;
    const cycle = reveal + hold;

    let raf = 0;
    let start = performance.now();
    const bursts: { t: number; dur: number }[] = [];
    let nextBurst = start + reveal + 500 / speed;

    const loop = (now: number) => {
      let elapsed = now - start;
      if (elapsed >= cycle) {
        start = now;
        elapsed = 0;
        bursts.length = 0;
        nextBurst = now + reveal + 500 / speed;
      }

      if (now >= nextBurst) {
        bursts.push({ t: now, dur: (140 + Math.random() * 160) / speed });
        nextBurst = now + (500 + Math.random() * 1300) / speed;
      }

      // Glitch energy from decaying triangular bursts.
      let e = 0;
      for (const b of bursts) {
        const p = (now - b.t) / b.dur;
        if (p >= 0 && p <= 1) {
          const env = 1 - Math.abs(p * 2 - 1);
          if (env > e) e = env;
        }
      }

      const revealT = reveal > 0 ? Math.min(1, elapsed / reveal) : 1;
      const revealing = revealT < 1;
      const lockedFloat = revealT * len;
      if (revealing) e = Math.max(e, 0.85);

      const next: string[] = new Array(len);
      const nj: { x: number; y: number }[] = new Array(len);
      const mag = intensity * e * 3.2;

      for (let i = 0; i < len; i++) {
        const ch = text[i];
        if (ch === " ") {
          next[i] = " ";
          nj[i] = { x: 0, y: 0 };
          continue;
        }
        const locked = i < lockedFloat - 0.5;
        if (!locked && revealing) {
          next[i] = randGlyph();
        } else if (
          !revealing &&
          e > 0.45 &&
          Math.random() < e * intensity * 0.5
        ) {
          next[i] = randGlyph();
        } else {
          next[i] = ch;
        }
        const jit = (!locked && revealing) || e > 0.4;
        nj[i] = jit
          ? { x: (Math.random() - 0.5) * mag, y: (Math.random() - 0.5) * mag }
          : { x: 0, y: 0 };
      }

      setDisplay(next);
      setJitter(nj);
      setEnergy(e);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [text, len, speed, intensity, hue, scramble]);

  const split = 1.5 + energy * intensity * 8;
  const c1 = `hsl(${hue} 100% 60%)`;
  const c2 = `hsl(${(hue + 160) % 360} 100% 60%)`;
  const glow = `hsl(${hue} 100% 65%)`;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-[#05060a] px-6">
      <style>{`
        @keyframes glitch-text-flicker {
          0%, 47%, 53%, 100% { opacity: 1; }
          50% { opacity: 0.82; }
        }
      `}</style>
      <div
        className="relative select-none text-center font-mono font-extrabold tracking-[0.12em]"
        style={{
          fontSize: "clamp(2rem, 9vw, 6rem)",
          color: "#f4f7ff",
          whiteSpace: "pre",
          animation: "glitch-text-flicker 4s steps(1) infinite",
          textShadow: `${split}px 0 ${c1}, ${-split}px 0 ${c2}, 0 0 ${
            18 + energy * 40
          }px ${glow}`,
        }}
      >
        {display.map((ch, i) => (
          <span
            key={i}
            className="inline-block"
            style={{
              transform: `translate(${jitter[i]?.x ?? 0}px, ${
                jitter[i]?.y ?? 0
              }px)`,
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </div>
    </div>
  );
}
