import { effectsMeta } from "@/lib/effects/meta";
import { EffectCard } from "@/components/EffectCard";
import { SpellDuel } from "@/components/games/SpellDuel";

export const metadata = { title: "Game Assets · Ideas Visualized" };

const GROUP_ORDER = [
  "Combat / Spells",
  "Explosions & Impact",
  "Environment & Weather",
  "Traps & Portals",
  "Lighting",
  "Level Atmosphere",
];

export default function GameAssetsPage() {
  const assets = effectsMeta.filter((e) => e.category === "game-asset");

  const groups = new Map<string, typeof assets>();
  for (const e of assets) {
    const key = e.gameGroup ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const orderedKeys = [
    ...GROUP_ORDER.filter((g) => groups.has(g)),
    ...[...groups.keys()].filter((g) => !GROUP_ORDER.includes(g)),
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Game Assets</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Animation assets built specifically for games: combat and spell effects,
        weather, traps, lighting, and level atmosphere. Pick a variant on each
        tile to cycle through the set.
      </p>

      <div className="mt-8">
        <SpellDuel />
      </div>

      {assets.length === 0 ? (
        <p className="mt-12 text-sm text-muted">Game assets land here soon.</p>
      ) : (
        <div className="mt-12 space-y-14">
          {orderedKeys.map((key) => (
            <section key={key}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
                {key}
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {groups.get(key)!.map((e) => (
                  <EffectCard key={e.slug} effect={e} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
