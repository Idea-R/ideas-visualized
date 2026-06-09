import Link from "next/link";

export const metadata = { title: "Experiences · Ideas Visualized" };

const playable = [
  {
    title: "Simon Says",
    blurb:
      "A glowing-dot memory game in the Absorption Cursor aesthetic: watch the sequence flash, then repeat it from memory. It grows by one every round.",
    href: "/experiences/simon",
    tags: ["Game", "Canvas 2D", "Memory"],
  },
  {
    title: "Ideas in Motion",
    blurb:
      "A scroll-driven journey. Layered parallax depth, zoom-on-scroll, lateral drift, and staggered text reveals, all tied to where you are on the page.",
    href: "/experiences/scroll",
    tags: ["Scroll", "Parallax", "Framer Motion"],
  },
];

const experiences = [
  {
    title: "All Roads Lead To Cursor",
    blurb:
      "The flagship: a ~5,400-line music-synced canvas engine with 25+ effect classes, timed song cues, and a 'CURSOR' text-particle reveal.",
    project: "AllRoadsLeadToCursor",
    tags: ["Music-synced", "Canvas 2D", "Flagship"],
  },
  {
    title: "Champions Roll Call",
    blurb:
      "16 layered canvas effects driven by an offline audio-analysis pipeline: converging route lanes, energy waves, a finale bloom, and confetti.",
    project: "allroadsleadtolovable",
    tags: ["Music-synced", "Audio pipeline"],
  },
  {
    title: "Take a Break",
    blurb:
      "Live AnalyserNode showcase: pseudo-3D rotating cube, flowing sine lines, the 'Borg' geometric click, and a finale cube-splitting crescendo.",
    project: "1shotCRM",
    tags: ["Live audio", "Pseudo-3D", "Click FX"],
  },
  {
    title: "aVOID Games",
    blurb:
      "Game-grade interactions: absorption cursor, chain-detonation spectacle, canvas lightning/explosions, screen shake, cyberpunk HUD.",
    project: "aVOID",
    tags: ["Games", "Click FX", "Particles"],
  },
];

export default function ExperiencesPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Featured Experiences</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Full music-synced shows and games, best viewed at full screen. Live
        embeds and launch links land here next.
      </p>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {playable.map((x) => (
          <Link
            key={x.title}
            href={x.href}
            className="panel group p-6 transition hover:border-accent/60"
          >
            <div className="flex flex-wrap gap-1.5">
              {x.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
            <h2 className="mt-3 text-lg font-semibold">{x.title}</h2>
            <p className="mt-2 text-sm text-muted">{x.blurb}</p>
            <div className="mt-4 inline-block rounded-md border border-accent/40 px-3 py-1.5 text-xs text-accent transition group-hover:bg-accent group-hover:text-bg">
              Play now →
            </div>
          </Link>
        ))}
        {experiences.map((x) => (
          <div key={x.title} className="panel p-6">
            <div className="flex flex-wrap gap-1.5">
              {x.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
            <h2 className="mt-3 text-lg font-semibold">{x.title}</h2>
            <p className="mt-2 text-sm text-muted">{x.blurb}</p>
            <div className="mt-4 inline-block rounded-md border border-white/10 px-3 py-1.5 text-xs text-muted">
              Coming soon: launch / embed
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
