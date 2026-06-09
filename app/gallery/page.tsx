import { effectsMeta } from "@/lib/effects/meta";
import { EffectCard } from "@/components/EffectCard";
import { SurpriseButton } from "@/components/SurpriseButton";

export const metadata = { title: "Gallery — Ideas Visualized" };

export default function GalleryPage() {
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
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {effectsMeta.map((e) => (
          <EffectCard key={e.slug} effect={e} />
        ))}
      </div>
    </main>
  );
}
