"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EffectMeta, EffectProps } from "@/lib/effects/types";
import { defaultParams } from "@/lib/effects/types";
import {
  decodeParams,
  encodeParams,
  mergeParams,
  randomParams,
} from "@/lib/effects/params";

/**
 * Owns an effect's live params with shareable URL state (`?p=`), plus helpers
 * for presets / randomize / reset.
 */
export function useEffectParams(meta: EffectMeta) {
  const [params, setParams] = useState<EffectProps>(() => defaultParams(meta));
  const hydrated = useRef(false);

  // Hydrate from the URL once on mount (avoids SSR mismatch).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("p");
    if (p) setParams(decodeParams(meta, p));
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect params into the URL without adding history entries.
  useEffect(() => {
    if (!hydrated.current) return;
    const encoded = encodeParams(meta, params);
    const url = new URL(window.location.href);
    if (encoded) url.searchParams.set("p", encoded);
    else url.searchParams.delete("p");
    window.history.replaceState(null, "", url);
  }, [params, meta]);

  const update = useCallback(
    (key: string, value: number | string | boolean) =>
      setParams((p) => ({ ...p, [key]: value })),
    []
  );

  const applyPreset = useCallback(
    (preset: EffectProps) => setParams(mergeParams(meta, preset)),
    [meta]
  );
  const randomize = useCallback(() => setParams(randomParams(meta)), [meta]);
  const reset = useCallback(() => setParams(defaultParams(meta)), [meta]);

  return { params, update, applyPreset, randomize, reset };
}
