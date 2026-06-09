"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getMeta } from "@/lib/effects/meta";
import { getEffectComponent } from "@/components/effects/registry";
import { ControlField } from "./ControlField";
import { ExportPanel } from "./ExportPanel";
import { useEffectParams } from "@/components/effects/useEffectParams";

export function EffectDetail({ slug }: { slug: string }) {
  const effect = getMeta(slug);
  const Comp = getEffectComponent(slug);
  const { params, update, applyPreset, randomize, reset } = useEffectParams(
    effect ?? {
      slug,
      title: "",
      blurb: "",
      source: { project: "", path: "" },
      tags: [],
      tier: 1,
      controls: [],
    }
  );

  const stageRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const enterExpand = () => {
    setExpanded(true);
    stageRef.current?.requestFullscreen?.().catch(() => {});
  };
  const exitExpand = () => {
    setExpanded(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  // Keep the overlay in sync when the user leaves native fullscreen (e.g. Esc).
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // "R" re-rolls (ignored while typing); "Esc" exits the expanded view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        return;
      }
      if (e.key.toLowerCase() !== "r" || e.metaKey || e.ctrlKey || e.altKey)
        return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      randomize();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [randomize]);

  if (!effect || !Comp) return null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href="/gallery" className="text-sm text-muted hover:text-fg">
        ← Back to gallery
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div
          ref={stageRef}
          className={
            expanded
              ? "fixed inset-0 z-50 bg-bg"
              : "panel relative h-[60vh] min-h-[420px] overflow-hidden bg-bg"
          }
        >
          <div className="h-full w-full">
            <Comp params={params} />
          </div>
          <button
            onClick={expanded ? exitExpand : enterExpand}
            title={expanded ? "Exit fullscreen (Esc)" : "Expand to fullscreen"}
            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-bg-soft/80 px-3 py-1.5 text-xs font-medium text-fg backdrop-blur transition hover:border-accent hover:text-accent"
          >
            <span aria-hidden className="leading-none">{expanded ? "⤡" : "⤢"}</span>
            {expanded ? "Exit" : "Expand"}
          </button>
        </div>

        <aside className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{effect.title}</h1>
            <p className="mt-2 text-sm text-muted">{effect.blurb}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {effect.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-muted"
              >
                {t}
              </span>
            ))}
          </div>

          {effect.presets && effect.presets.length > 0 && (
            <div className="panel p-4">
              <div className="mb-2 text-xs font-semibold text-fg">Presets</div>
              <div className="flex flex-wrap gap-2">
                {effect.presets.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p.params)}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs transition hover:border-accent hover:text-fg"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {effect.controls.length > 0 && (
            <div className="panel space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-fg">Controls</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={randomize}
                    title="Randomize all controls (press R)"
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-fg transition hover:border-accent hover:text-accent"
                  >
                    <span aria-hidden className="leading-none">🎲</span>
                    Randomize
                  </button>
                  <button
                    onClick={reset}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-muted transition hover:text-fg"
                  >
                    Reset
                  </button>
                </div>
              </div>
              {effect.controls
                .filter(
                  (c) => !c.showIf || c.showIf.in.includes(params[c.showIf.key])
                )
                .map((c) => (
                  <ControlField
                    key={c.key}
                    control={c}
                    value={params[c.key]}
                    onChange={(v) => update(c.key, v)}
                  />
                ))}
            </div>
          )}

          <ExportPanel meta={effect} params={params} />

          <div className="panel space-y-1 p-4 text-xs text-muted">
            <div className="font-semibold text-fg">Source</div>
            <div>{effect.source.project}</div>
            <code className="block break-all text-[11px]">{effect.source.path}</code>
          </div>
        </aside>
      </div>
    </main>
  );
}
