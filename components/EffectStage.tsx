"use client";

import { useMemo } from "react";
import { getMeta } from "@/lib/effects/meta";
import { defaultParams } from "@/lib/effects/types";
import { getEffectComponent } from "@/components/effects/registry";

/**
 * Lightweight live preview of an effect using its default params.
 * (Interactive controls live on the effect detail page via EffectDetail.)
 */
export function EffectStage({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const meta = getMeta(slug);
  const Comp = getEffectComponent(slug);
  const params = useMemo(() => (meta ? defaultParams(meta) : {}), [meta]);

  if (!Comp || !meta) return null;

  return (
    <div className={className}>
      <div className="h-full w-full overflow-hidden bg-bg">
        <Comp params={params} />
      </div>
    </div>
  );
}
