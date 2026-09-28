"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

/**
 * VU strip: the only continuous motion in the app. Reads the level from a ref
 * via requestAnimationFrame so meter updates never re-render the session.
 */
export function LevelStrip({
  levelRef,
  active,
}: {
  levelRef: MutableRefObject<number>;
  active: boolean;
}) {
  const barsRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<number[]>(new Array(32).fill(0));
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    let raf = 0;
    const BARS = 32;
    const loop = () => {
      const bars = barsRef.current?.children;
      if (bars) {
        const target = activeRef.current ? Math.min(1, levelRef.current * 3.2) : 0;
        for (let i = 0; i < BARS; i++) {
          const el = bars[i] as HTMLElement;
          const on = target > i / BARS;
          const cur = stateRef.current[i];
          const next = on ? Math.min(1, cur + 0.35) : Math.max(0, cur - 0.12);
          stateRef.current[i] = next;
          el.style.opacity = String(0.15 + next * 0.85);
          el.style.backgroundColor =
            next > 0.85
              ? "var(--color-cut)"
              : next > 0.6
                ? "var(--color-mark)"
                : "var(--color-ink)";
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);

  return (
    <div ref={barsRef} className="flex h-4 items-stretch gap-1" aria-hidden>
      {Array.from({ length: 32 }).map((_, i) => (
        <div key={i} className="w-1.5 bg-ink" style={{ opacity: 0.15 }} />
      ))}
    </div>
  );
}

export type TranscriptState = { delta: string; finals: string[] };

/** Live read ticker: last final line + the in-flight words. Ref-driven, no re-renders. */
export function TranscriptTicker({
  transcriptRef,
}: {
  transcriptRef: MutableRefObject<TranscriptState>;
}) {
  const finalRef = useRef<HTMLParagraphElement>(null);
  const deltaRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastDelta = "";
    let lastFinal = "";
    const loop = () => {
      const s = transcriptRef.current;
      const f = s.finals.at(-1) ?? "";
      if (f !== lastFinal && finalRef.current) {
        finalRef.current.textContent = f;
        lastFinal = f;
      }
      if (s.delta !== lastDelta && deltaRef.current) {
        deltaRef.current.textContent = s.delta;
        lastDelta = s.delta;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [transcriptRef]);

  return (
    <div>
      <p ref={finalRef} className="min-h-6 text-sm leading-relaxed text-ink-fade" />
      <p ref={deltaRef} className="min-h-6 text-sm leading-relaxed text-ink" />
    </div>
  );
}
