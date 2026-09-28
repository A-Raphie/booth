"use client";

import { useEffect, useState } from "react";

/**
 * The slate stamp: the signature move. Rendered when the director's
 * call_retake tool fires; a single hard snap, then still.
 */
export function SlateStamp({
  take,
  line,
  reason,
  onDone,
}: {
  take: number;
  line: number;
  reason: string;
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 2600);
    return () => clearTimeout(t);
  }, [take, line, reason, onDone]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        className="slate-stamp border-2 border-ink bg-ink px-8 py-6 text-paper"
        role="status"
      >
        <div className="flex items-baseline gap-6">
          <span className="microlabel text-mark">Take {String(take).padStart(2, "0")}</span>
          <span className="microlabel text-faint">Retake from line {String(line).padStart(2, "0")}</span>
        </div>
        <div className="mt-2 max-w-md font-display text-2xl font-medium leading-tight">
          {reason}
        </div>
      </div>
    </div>
  );
}
