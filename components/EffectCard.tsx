"use client";

import Link from "next/link";
import { useState } from "react";
import type { EffectMeta } from "@/lib/effects/types";
import { EffectStage } from "./EffectStage";

export function EffectCard({ effect }: { effect: EffectMeta }) {
  const [active, setActive] = useState(false);

  return (
    <Link
      href={`/gallery/${effect.slug}`}
      className="panel group block overflow-hidden transition hover:border-white/20"
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <div className="h-56 w-full">
        <EffectStage slug={effect.slug} active={active} className="h-full w-full" />
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-sm font-semibold">{effect.title}</h3>
        <p className="line-clamp-2 text-xs text-muted">{effect.blurb}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {effect.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
