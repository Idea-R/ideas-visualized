import Link from "next/link";
import { effectsMeta } from "@/lib/effects/meta";
import { EffectCard } from "@/components/EffectCard";

export const metadata = { title: "Page Transitions · Ideas Visualized" };

export default function PageTransitionsPage() {
  const transitions = effectsMeta.filter(
    (effect) => effect.category === "page-transition"
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-16">
      <Link href="/gallery" className="text-sm text-muted hover:text-fg">
        ← Back to gallery
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Page Transitions</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Use the tile system as a view-to-view reveal or a responsive background.
        Each demo stays inside its preview while you tune and export it.
      </p>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {transitions.map((effect) => (
          <EffectCard key={effect.slug} effect={effect} />
        ))}
      </div>
    </main>
  );
}
