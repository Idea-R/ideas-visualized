import Link from "next/link";
import { effectsMeta } from "@/lib/effects/meta";
import type { EffectMeta } from "@/lib/effects/types";
import { EffectStage } from "@/components/EffectStage";
import { EffectCard } from "@/components/EffectCard";

const bySlug = (slug: string): EffectMeta | undefined =>
  effectsMeta.find((e) => e.slug === slug);

// Curated marquee (Canvas 2D so the hero/cards never hijack page scroll the way
// orbit-zoom WebGL effects would).
const HERO_SLUG = "infinite-starfield";
const FEATURED = [
  "particle-constellation",
  "nova-burst",
  "aurora-veil",
  "nexus-card",
  "charge-burst",
  "corner-fireworks",
];

const TIERS = [
  {
    label: "Canvas 2D",
    title: "Hand-rolled particle systems",
    body: "Crisp, pooled, audio-reactive particle craft — no engine, no ghosting.",
    href: "/gallery/particle-constellation",
    cta: "Particle Constellation",
  },
  {
    label: "Pseudo-3D",
    title: "Depth without WebGL",
    body: "Projection, parallax, and CSS 3D tricks that read as fully dimensional.",
    href: "/gallery/depth-tunnel",
    cta: "Depth Tunnel",
  },
  {
    label: "True WebGL",
    title: "React Three Fiber + bloom",
    body: "Real 3D scenes you can orbit, zoom, and pan — instanced and glowing.",
    href: "/gallery/galaxy-spiral",
    cta: "Galaxy Spiral",
  },
];

const STATS = [
  { n: "57", l: "interactive effects" },
  { n: "3", l: "render tiers" },
  { n: "0", l: "off-the-shelf engines" },
  { n: "100%", l: "live-controllable" },
];

export default function Home() {
  const featured = FEATURED.map(bySlug).filter(Boolean) as EffectMeta[];

  return (
    <main>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <EffectStage slug={HERO_SLUG} className="h-[88vh] w-full opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/20 via-bg/35 to-bg" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_-5%,rgba(124,92,255,0.18),transparent_60%)]" />
        </div>

        <div className="mx-auto flex max-w-6xl flex-col items-center gap-7 px-5 pb-28 pt-32 text-center sm:pt-44">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted backdrop-blur">
            Hand-rolled VFX · Canvas 2D · Web Audio · WebGL
          </span>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
            Effects that make people ask{" "}
            <span className="glow-text">how did they build that?</span>
          </h1>
          <p className="max-w-2xl text-base text-muted sm:text-lg">
            A living showcase of {STATS[0].n} bespoke visual effects — built from
            scratch, with no off-the-shelf engine. Tune every parameter live,
            roll the dice, then export the code or an AI prompt.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/gallery"
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:opacity-90"
            >
              Explore the gallery
            </Link>
            <Link
              href="/experiences"
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold transition hover:border-white/30"
            >
              Featured experiences
            </Link>
          </div>

          <dl className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.l}
                className="panel px-4 py-5 text-center backdrop-blur"
              >
                <dt className="text-3xl font-extrabold tracking-tight">
                  {s.n}
                </dt>
                <dd className="mt-1 text-xs text-muted">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------- Featured ---------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Featured effects
            </h2>
            <p className="mt-1 text-sm text-muted">
              Live previews — open any one to play with the controls.
            </p>
          </div>
          <Link href="/gallery" className="text-sm text-muted hover:text-fg">
            View all 57 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((e) => (
            <EffectCard key={e.slug} effect={e} />
          ))}
        </div>
      </section>

      {/* ---------------- Render tiers ---------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <h2 className="text-2xl font-bold tracking-tight">Three render tiers</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          From hand-written Canvas 2D physics to real WebGL scenes — every effect
          shares one module interface, so controls, presets, and export just work.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.label} className="panel flex flex-col p-6">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-accent-2">
                {t.label}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{t.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{t.body}</p>
              <Link
                href={t.href}
                className="mt-4 inline-block text-sm text-accent hover:underline"
              >
                {t.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Experiences + Research ---------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-28">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Link
            href="/experiences"
            className="panel group relative overflow-hidden p-8 transition hover:border-accent/50"
          >
            <div className="absolute inset-0 -z-10 opacity-40 transition group-hover:opacity-60">
              <EffectStage slug="absorption-cursor" className="h-full w-full" />
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-accent-2">
              Experiences
            </span>
            <h3 className="mt-3 text-xl font-semibold">Play & explore</h3>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Simon Says (an absorption-cursor memory game) and Ideas in Motion
              (a scroll-driven parallax journey).
            </p>
            <span className="mt-5 inline-block text-sm text-accent">
              Open experiences →
            </span>
          </Link>

          <Link
            href="/research"
            className="panel group p-8 transition hover:border-accent/50"
          >
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-accent-2">
              Research
            </span>
            <h3 className="mt-3 text-xl font-semibold">How we built it</h3>
            <p className="mt-2 max-w-sm text-sm text-muted">
              The techniques behind the effects — fixing canvas ghosting, object
              pooling, and best practices for reactive, particle-heavy scenes.
            </p>
            <span className="mt-5 inline-block text-sm text-accent">
              Read the write-ups →
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
