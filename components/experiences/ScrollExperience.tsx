"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

/**
 * A self-contained "scroll experience": a sequence of full-height sections whose
 * layers are driven by scroll progress (parallax depth, zoom-on-scroll, lateral
 * drift, staggered text). Pure transform/opacity work via Framer Motion's
 * scroll-linked motion values — no scroll listeners, no layout thrash.
 */
export function ScrollExperience() {
  return (
    <div className="relative">
      {/* Fixed atmospheric backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 800px at 70% -10%, rgba(120,80,255,0.18), transparent 60%)," +
            "radial-gradient(1000px 700px at 10% 110%, rgba(0,200,255,0.16), transparent 60%)," +
            "#05060a",
        }}
      />
      <ParallaxHero />
      <ZoomReveal />
      <LateralDrift />
      <Finale />
    </div>
  );
}

function Section({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        "relative flex min-h-screen items-center justify-center overflow-hidden px-6 " +
        className
      }
    >
      {children}
    </section>
  );
}

function ParallaxHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const farY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const midY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  const nearY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const titleScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);

  return (
    <div ref={ref}>
      <Section>
        <motion.div
          aria-hidden
          style={{ y: farY }}
          className="absolute inset-0"
        >
          <Stars count={120} />
        </motion.div>
        <motion.div
          aria-hidden
          style={{ y: midY }}
          className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        >
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(140,90,255,0.35),transparent_65%)]" />
        </motion.div>
        <motion.div
          style={{ y: nearY, opacity: titleOpacity, scale: titleScale }}
          className="relative text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-white/50">
            A scroll experience
          </p>
          <h1 className="mt-4 text-5xl font-extrabold leading-none tracking-tight sm:text-7xl">
            Ideas in <span className="glow-text">Motion</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm text-white/60">
            Keep scrolling — depth, zoom, and drift all driven by where you are
            on the page.
          </p>
          <div className="mt-8 animate-bounce text-white/40">↓</div>
        </motion.div>
      </Section>
    </div>
  );
}

function ZoomReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.55, 1, 1.6]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-25, 25]);

  return (
    <div ref={ref}>
      <Section>
        <motion.div style={{ scale, opacity }} className="relative">
          <motion.div
            aria-hidden
            style={{ rotate }}
            className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/10"
          />
          <motion.div
            aria-hidden
            style={{ rotate }}
            className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] border border-accent/30"
          />
          <div className="panel relative max-w-md p-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Zoom on scroll</h2>
            <p className="mt-3 text-sm text-muted">
              This panel scales through the viewport as you pass it — the same
              progress value drives the orbiting rings.
            </p>
          </div>
        </motion.div>
      </Section>
    </div>
  );
}

function LateralDrift() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const leftX = useTransform(scrollYProgress, [0, 1], ["-40%", "10%"]);
  const rightX = useTransform(scrollYProgress, [0, 1], ["40%", "-10%"]);

  const cards = [
    { t: "Parallax", c: "Layers move at different rates to fake depth." },
    { t: "Zoom", c: "Scale tied to scroll position." },
    { t: "Drift", c: "Opposing lateral motion as you scroll." },
    { t: "Reveal", c: "Staggered entrances at the finale." },
  ];

  return (
    <div ref={ref}>
      <Section className="flex-col gap-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Lateral drift
        </h2>
        <motion.div style={{ x: leftX }} className="flex gap-4">
          {cards.map((c) => (
            <DriftCard key={c.t} title={c.t} body={c.c} />
          ))}
        </motion.div>
        <motion.div style={{ x: rightX }} className="flex gap-4">
          {[...cards].reverse().map((c) => (
            <DriftCard key={c.t} title={c.t} body={c.c} muted />
          ))}
        </motion.div>
      </Section>
    </div>
  );
}

function DriftCard({
  title,
  body,
  muted = false,
}: {
  title: string;
  body: string;
  muted?: boolean;
}) {
  return (
    <div
      className={
        "panel w-56 shrink-0 p-5 " + (muted ? "opacity-60" : "")
      }
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs text-muted">{body}</p>
    </div>
  );
}

function Finale() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const words = ["Hand-rolled.", "From scratch.", "Ideas Visualized."];

  return (
    <div ref={ref}>
      <Section className="flex-col gap-3 text-center">
        {words.map((w, i) => (
          <FinaleWord key={w} text={w} index={i} progress={scrollYProgress} />
        ))}
        <Link
          href="/gallery"
          className="mt-8 inline-block rounded-md border border-accent/40 px-4 py-2 text-sm text-accent transition hover:bg-accent hover:text-bg"
        >
          Explore the gallery →
        </Link>
      </Section>
    </div>
  );
}

function FinaleWord({
  text,
  index,
  progress,
}: {
  text: string;
  index: number;
  progress: MotionValue<number>;
}) {
  const start = index * 0.18;
  const y = useTransform(progress, [start, start + 0.3], [40, 0]);
  const opacity = useTransform(progress, [start, start + 0.3], [0, 1]);
  return (
    <motion.h2
      style={{ y, opacity }}
      className="text-4xl font-extrabold tracking-tight sm:text-6xl"
    >
      {text}
    </motion.h2>
  );
}

/** A scattered, deterministic star field (SSR-stable — no Math.random in render). */
function Stars({ count }: { count: number }) {
  const stars = Array.from({ length: count }, (_, i) => {
    const a = (i * 73) % 100;
    const b = (i * 37) % 100;
    const size = ((i * 13) % 3) + 1;
    const op = 0.25 + (((i * 17) % 50) / 100);
    return { left: `${a}%`, top: `${b}%`, size, op };
  });
  return (
    <div className="absolute inset-0">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.op,
          }}
        />
      ))}
    </div>
  );
}
