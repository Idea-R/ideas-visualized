"use client";

import type { EffectControl } from "@/lib/effects/types";

export function ControlField({
  control,
  value,
  onChange,
}: {
  control: EffectControl;
  value: number | string | boolean;
  onChange: (v: number | string | boolean) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      <span className="flex items-center justify-between">
        <span>{control.label}</span>
        {control.type === "range" && (
          <span className="text-fg/70">{String(value)}</span>
        )}
      </span>

      {control.type === "range" && (
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="accent-accent"
        />
      )}

      {control.type === "toggle" && (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 self-start accent-accent"
        />
      )}

      {control.type === "color" && (
        <input
          type="color"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-16 bg-transparent"
        />
      )}

      {control.type === "text" && (
        <input
          type="text"
          value={String(value)}
          maxLength={control.maxLength ?? 24}
          placeholder={control.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-white/10 bg-bg-soft px-2 py-1 text-fg placeholder:text-muted/50"
        />
      )}

      {control.type === "select" && (
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-white/10 bg-bg-soft px-2 py-1 text-fg"
        >
          {control.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}
