"use client";

import { ScriptLine } from "@/lib/script";
import { LineStatus } from "@/lib/takes";

const STATUS_MARK: Record<LineStatus, { glyph: string; color: string; label: string }> = {
  untouched: { glyph: "·", color: "var(--color-muted)", label: "unread" },
  clean: { glyph: "✓", color: "var(--color-clean-deep)", label: "clean" },
  flub: { glyph: "×", color: "var(--color-cut-text)", label: "flub" },
  "retake-pending": { glyph: "↻", color: "var(--color-accent)", label: "retake" },
};

/** The script sheet: the hero surface. Margins carry take state. */
export function ScriptCanvas({
  lines,
  statuses,
  currentLine,
}: {
  lines: ScriptLine[];
  statuses: Map<number, LineStatus>;
  currentLine: number | null;
}) {
  return (
    <div className="hairline bg-raised p-8 md:p-10">
      <ol className="space-y-4">
        {lines.map((line) => {
          const s = statuses.get(line.n) ?? "untouched";
          const mark = STATUS_MARK[s];
          const isCurrent = currentLine === line.n;
          return (
            <li
              key={line.n}
              className={`flex gap-4 transition-colors duration-300 ${isCurrent ? "bg-accent-tint/50" : ""}`}
            >
              <span
                className="microlabel w-8 shrink-0 pt-1 text-right"
                style={{ color: mark.color }}
                title={mark.label}
              >
                {String(line.n).padStart(2, "0")}
              </span>
              <span
                className="w-4 shrink-0 pt-1 text-center"
                style={{ color: mark.color }}
                aria-label={mark.label}
              >
                {mark.glyph}
              </span>
              <p
                className={`max-w-prose text-lg leading-relaxed transition-colors duration-300 ${
                  s === "clean" ? "text-ink-soft" : "text-ink"
                } ${isCurrent ? "font-medium" : ""}`}
              >
                {line.text}
                {isCurrent && (
                  <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-accent align-middle" />
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
