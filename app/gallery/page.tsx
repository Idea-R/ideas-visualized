import { effectsMeta } from "@/lib/effects/meta";
import { EffectCard } from "@/components/EffectCard";
import { SurpriseButton } from "@/components/SurpriseButton";
import Link from "next/link";

export const metadata = { title: "Gallery · Ideas Visualized" };

export default function GalleryPage() {
  const pageTransitions = effectsMeta.filter(
    (effect) => effect.category === "page-transition"
  );
  const galleryEffects = effectsMeta.filter(
    (effect) => !effect.category || effect.category === "effect"
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Interactive, self-contained effects extracted from our projects.
            Move your cursor, click, and tweak the controls on each.
          </p>
        </div>
        <SurpriseButton />
      </div>
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Page transitions</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Full-page reveals and pointer-reactive backgrounds, isolated inside each preview.
            </p>
          </div>
          <Link href="/page-transitions" className="text-sm text-accent hover:underline">
            View page transitions →
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pageTransitions.map((effect) => (
            <EffectCard key={effect.slug} effect={effect} />
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">Visual effects</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {galleryEffects.map((effect) => (
            <EffectCard key={effect.slug} effect={effect} />
          ))}
        </div>
      </section>
    </main>
  );
}
