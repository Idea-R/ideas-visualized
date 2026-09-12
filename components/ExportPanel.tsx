"use client";

import { useState } from "react";
import type { EffectMeta, EffectProps } from "@/lib/effects/types";
import { toPrompt, toComponentSource } from "@/lib/export/generate";

type Tab = "prompt" | "component";

export function ExportPanel({
  meta,
  params,
}: {
  meta: EffectMeta;
  params: EffectProps;
}) {
  const [tab, setTab] = useState<Tab>("prompt");
  const [copied, setCopied] = useState(false);

  const content =
    tab === "prompt"
      ? toPrompt(meta, params)
      : toComponentSource(meta, params);
  const filename =
    tab === "prompt"
      ? `${meta.slug}-prompt.txt`
      : `${meta.title.replace(/[^a-zA-Z0-9]/g, "")}.tsx`;

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSettings = () => {
    const settings = {
      mode: meta.portableDemo?.mode,
      ...(meta.presets?.[0]?.params ?? {}),
      ...params,
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.slug}-settings.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (meta.portableDemo) {
    return (
      <div className="panel p-4">
        <div className="text-xs font-semibold text-fg">Export</div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Serve the extracted demo from the same origin and load{" "}
          <code className="text-fg/80">index.html?mode={meta.portableDemo.mode}</code>{" "}
          in an iframe. After it sends <code className="text-fg/80">inverse-canvas:ready</code>,
          post <code className="text-fg/80">inverse-canvas:params</code> messages with the settings.
          Later updates apply without reloading the iframe.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={meta.portableDemo.href}
            download
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Download portable demo
          </a>
          <button
            onClick={downloadSettings}
            className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold transition hover:border-white/30"
          >
            Download settings JSON
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-fg">Export</div>
        <div className="flex gap-1 rounded-md border border-white/10 p-0.5 text-[11px]">
          <button
            onClick={() => setTab("prompt")}
            className={`rounded px-2 py-0.5 ${tab === "prompt" ? "bg-accent text-white" : "text-muted"}`}
          >
            AI Prompt
          </button>
          <button
            onClick={() => setTab("component")}
            className={`rounded px-2 py-0.5 ${tab === "component" ? "bg-accent text-white" : "text-muted"}`}
          >
            Component
          </button>
        </div>
      </div>

      <pre className="max-h-56 overflow-auto rounded-md border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-fg/80">
        {content}
      </pre>

      <div className="mt-3 flex gap-2">
        <button
          onClick={copy}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={download}
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold transition hover:border-white/30"
        >
          Download
        </button>
      </div>
    </div>
  );
}
