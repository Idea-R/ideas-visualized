import Link from "next/link";
import { articles, sourceDocs } from "@/lib/research";

export const metadata = { title: "Research · Ideas Visualized" };

export default function ResearchPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight">How we built it</h1>
      <p className="mt-2 max-w-2xl text-muted">
        The work behind the effects: our own research, technique writeups, and
        performance notes from building music-synced canvas work.
      </p>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-muted">
        Articles
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/research/${a.slug}`}
            className="panel group p-6 transition-colors hover:border-accent/40"
          >
            <div className="flex flex-wrap gap-1.5">
              {a.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
            <h3 className="mt-3 text-lg font-semibold group-hover:glow-text">
              {a.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{a.blurb}</p>
            <div className="mt-4 text-xs text-accent-2">
              Read article{a.minutes ? ` · ${a.minutes} min` : ""} →
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mt-14 text-sm font-semibold uppercase tracking-[0.2em] text-muted">
        Source research from our projects
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Reference material we mined while porting these effects.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sourceDocs.map((d) => (
          <div key={d.title} className="panel p-5">
            <h3 className="text-base font-semibold">{d.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{d.blurb}</p>
            <code className="mt-3 block break-all text-[11px] text-muted">
              {d.source}
            </code>
          </div>
        ))}
      </div>
    </main>
  );
}
