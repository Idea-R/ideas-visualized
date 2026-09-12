"use client";

import { useEffect, useRef } from "react";
import type { EffectProps } from "@/lib/effects/types";

const DEFAULT_PARAMS: EffectProps = {
  tileCount: 520,
  spreadMs: 820,
  flipMs: 490,
  gridMs: 280,
  origin: "pointer",
  palette: "teal",
  hoverRadius: 180,
  intensity: 0.35,
};

function InverseCanvasFrame({
  params,
  mode,
}: {
  params: EffectProps;
  mode: "transition" | "hover";
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const paramsRef = useRef<EffectProps>({ ...DEFAULT_PARAMS, ...params });
  const activeRef = useRef(true);

  useEffect(() => {
    paramsRef.current = { ...DEFAULT_PARAMS, ...params };
    frameRef.current?.contentWindow?.postMessage(
      { type: "inverse-canvas:params", params: paramsRef.current },
      window.location.origin
    );
  }, [params]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const sendParams = () => {
      frame.contentWindow?.postMessage(
        { type: "inverse-canvas:params", params: paramsRef.current },
        window.location.origin
      );
    };
    const sendActive = () => {
      frame.contentWindow?.postMessage(
        { type: "inverse-canvas:active", active: activeRef.current },
        window.location.origin
      );
    };
    const sendState = () => {
      sendParams();
      sendActive();
    };
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.contentWindow ||
        event.data?.type !== "inverse-canvas:ready"
      ) {
        return;
      }
      sendState();
    };
    const onVisibility = () => {
      activeRef.current =
        document.visibilityState === "visible" && frame.dataset.inView === "true";
      sendActive();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        frame.dataset.inView = String(entry.isIntersecting);
        onVisibility();
      },
      { threshold: 0.01 }
    );

    window.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", onVisibility);
    frame.addEventListener("load", sendState);
    observer.observe(frame);

    return () => {
      observer.disconnect();
      frame.removeEventListener("load", sendState);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <iframe
      ref={frameRef}
      src={`/experiments/inverse-canvas/index.html?mode=${mode}`}
      title={mode === "transition" ? "Inverse Canvas preview" : "Pixel Field preview"}
      className="h-full w-full border-0 bg-bg"
      allow="fullscreen"
    />
  );
}

export function InverseCanvas({ params }: { params: EffectProps }) {
  return <InverseCanvasFrame params={params} mode="transition" />;
}

export function PixelField({ params }: { params: EffectProps }) {
  return <InverseCanvasFrame params={params} mode="hover" />;
}
