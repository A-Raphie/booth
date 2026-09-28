"use client";

import { useEffect, useRef } from "react";

/** VU strip: the only continuous motion in the app. Level 0..1. */
export function LevelStrip({ level, active }: { level: number; active: boolean }) {
  const barsRef = useRef<HTMLDivElement>(null);
  const BARS = 32;
  const stateRef = useRef<number[]>(new Array(BARS).fill(0));

  useEffect(() => {
    const bars = barsRef.current?.children;
    if (!bars) return;
    const target = active ? Math.min(1, level * 3.2) : 0;
    for (let i = 0; i < BARS; i++) {
      const el = bars[i] as HTMLElement;
      const threshold = i / BARS;
      const on = target > threshold;
      const cur = stateRef.current[i];
      const next = on ? Math.min(1, cur + 0.35) : Math.max(0, cur - 0.12);
      stateRef.current[i] = next;
      el.style.opacity = String(0.15 + next * 0.85);
      el.style.backgroundColor =
        next > 0.85 ? "var(--color-cut)" : next > 0.6 ? "var(--color-mark)" : "var(--color-ink)";
    }
  }, [level, active]);

  return (
    <div ref={barsRef} className="flex h-4 items-stretch gap-1" aria-hidden>
      {Array.from({ length: BARS }).map((_, i) => (
        <div key={i} className="w-1.5 bg-ink" style={{ opacity: 0.15 }} />
      ))}
    </div>
  );
}
