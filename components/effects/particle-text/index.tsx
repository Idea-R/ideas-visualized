"use client";

import { useCanvas2D } from "../useCanvas2D";
import type { EffectProps } from "@/lib/effects/types";

interface TextParticle {
  x: number;
  y: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  progress: number;
  delay: number;
  alpha: number;
  color: string;
}

const MAX_PARTICLES = 4000;

export function ParticleText({ params }: { params: EffectProps }) {
  const word = String(params.word ?? "").slice(0, 24);
  const density = Math.max(2, Math.round(Number(params.density)));
  const speed = Number(params.speed);
  const hue = Number(params.hue);
  const colorMode = String(params.colorMode ?? "glow");

  const ref = useCanvas2D(
    (ctx, { width, height }) => {
      // --- Sample the word into target points via an offscreen canvas. ---
      const off = document.createElement("canvas");
      off.width = Math.max(1, width);
      off.height = Math.max(1, height);
      const octx = off.getContext("2d")!;

      // Scale the font so the word fits the panel width (and height).
      let fontSize = Math.max(8, Math.floor(height * 0.42));
      const fontOf = (size: number) =>
        `900 ${size}px "Arial Black", system-ui, sans-serif`;
      octx.font = fontOf(fontSize);
      const measured = octx.measureText(word).width || 1;
      const maxW = width * 0.86;
      if (measured > maxW) {
        fontSize = Math.max(8, Math.floor((fontSize * maxW) / measured));
      }

      octx.clearRect(0, 0, off.width, off.height);
      octx.font = fontOf(fontSize);
      octx.fillStyle = "#fff";
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText(word, width / 2, height / 2);

      const img = octx.getImageData(0, 0, off.width, off.height).data;
      let points: { x: number; y: number }[] = [];
      for (let y = 0; y < off.height; y += density) {
        for (let x = 0; x < off.width; x += density) {
          if (img[(y * off.width + x) * 4 + 3] > 128) {
            points.push({ x, y });
          }
        }
      }

      // Clamp particle count to a sane max by evenly downsampling.
      if (points.length > MAX_PARTICLES) {
        const stride = points.length / MAX_PARTICLES;
        const out: { x: number; y: number }[] = [];
        for (let i = 0; i < MAX_PARTICLES; i++) {
          out.push(points[Math.floor(i * stride)]);
        }
        points = out;
      }

      // Color is fixed per target position so the formed word reads cleanly.
      const colorFor = (tx: number): string => {
        const fx = width > 0 ? tx / width : 0.5;
        switch (colorMode) {
          case "rainbow":
            return `hsl(${Math.round(fx * 360)}, 100%, 65%)`;
          case "gradient":
            return `hsl(${Math.round(hue + fx * 140)}, 100%, 64%)`;
          case "mono":
            return `hsl(0, 0%, ${Math.round(78 + Math.random() * 18)}%)`;
          default: // "glow" — single hue with subtle jitter
            return `hsl(${Math.round(hue + (Math.random() * 40 - 20))}, 100%, 65%)`;
        }
      };

      const particles: TextParticle[] = points.map((p) => ({
        x: 0,
        y: 0,
        sx: 0,
        sy: 0,
        tx: p.x,
        ty: p.y,
        vx: 0,
        vy: 0,
        progress: 0,
        delay: 0,
        alpha: 0,
        color: colorFor(p.x),
      }));

      const HOLD_DUR = 1.7;
      const SCATTER_DUR = 1.4;

      let phase: "form" | "hold" | "scatter" = "form";
      let timer = 0;

      const beginForm = () => {
        for (const p of particles) {
          p.sx = Math.random() * width;
          p.sy = -Math.random() * height * 0.6 - 20;
          p.x = p.sx;
          p.y = p.sy;
          p.vx = 0;
          p.vy = 0;
          p.progress = 0;
          p.delay = Math.random() * 0.7;
          p.alpha = 0;
        }
        phase = "form";
        timer = 0;
      };

      const beginScatter = () => {
        for (const p of particles) {
          const a = Math.random() * Math.PI * 2;
          const s = 80 + Math.random() * 260;
          p.vx = Math.cos(a) * s;
          p.vy = Math.sin(a) * s - 40;
          p.x = p.tx;
          p.y = p.ty;
          p.alpha = 1;
        }
        phase = "scatter";
        timer = 0;
      };

      beginForm();

      return {
        clearMode: "full",
        onPointer: (x, y, type) => {
          if (type === "down" && phase !== "scatter") beginScatter();
        },
        draw: (c, dt, t) => {
          c.fillStyle = "#05060a";
          c.fillRect(0, 0, width, height);

          timer += dt;

          if (phase === "form") {
            let allDone = true;
            for (const p of particles) {
              if (p.delay > 0) {
                p.delay -= dt;
                allDone = false;
                continue;
              }
              if (p.progress < 1) {
                p.progress = Math.min(1, p.progress + dt * 0.8 * speed);
                const ease = 1 - Math.pow(1 - p.progress, 3);
                p.x = p.sx + (p.tx - p.sx) * ease;
                p.y = p.sy + (p.ty - p.sy) * ease;
                p.alpha = p.progress;
                if (p.progress < 1) allDone = false;
              } else {
                p.x = p.tx;
                p.y = p.ty;
                p.alpha = 1;
              }
            }
            if (allDone) {
              phase = "hold";
              timer = 0;
            }
          } else if (phase === "hold") {
            for (const p of particles) {
              p.x = p.tx;
              p.y = p.ty;
              p.alpha = 1;
            }
            if (timer > HOLD_DUR) beginScatter();
          } else {
            for (const p of particles) {
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.vy += 90 * dt;
              p.vx *= 0.99;
              p.alpha -= dt * 1.1;
            }
            if (timer > SCATTER_DUR) beginForm();
          }

          c.globalCompositeOperation = "lighter";
          for (const p of particles) {
            const a = Math.max(0, p.alpha);
            if (a <= 0) continue;
            c.globalAlpha = a;
            c.fillStyle = p.color;
            c.beginPath();
            c.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
            c.fill();
          }

          c.globalAlpha = 1;
          c.globalCompositeOperation = "source-over";
        },
      };
    },
    [word, density, speed, hue, colorMode]
  );

  return <canvas ref={ref} className="h-full w-full" />;
}
