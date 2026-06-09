import Link from "next/link";
import { effectsMeta } from "@/lib/effects/meta";
import { EffectStage } from "@/components/EffectStage";
import { EffectCard } from "@/components/EffectCard";

export default function Home() {
  const hero = effectsMeta[0];
  const featured = effectsMeta.slice(0, 3);

  return (
    <main>
      <section className="relative">
        <div className="absolute inset-0 -z-10 h-[70vh]">
          <EffectStage slug={hero.slug} className="h-full w-full opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg" />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 pb-24 pt-28 sm:pt-36">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted">
            Hand-rolled VFX · Canvas 2D · Web Audio
          </span>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Ideas <span className="glow-text">Visualized</span>
          </h1>
          <p className="max-w-2xl text-base text-muted sm:text-lg">
            A showcase of bespoke, music-synced visual effects we built from
            scratch — no off-the-shelf engine. Particle systems, audio-reactive
            scenes, and game-grade interactions, all in one place.
          </p>
          <div className="flex gap-3">
            <Link
              href="/gallery"
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
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
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold">Featured effects</h2>
          <Link href="/gallery" className="text-sm text-muted hover:text-fg">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((e) => (
            <EffectCard key={e.slug} effect={e} />
          ))}
        </div>
      </section>
    </main>
  );
}
