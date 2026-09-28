"use client";

import { LineStatus, TakeEngine, TakeEvent } from "@/lib/takes";
import { MicroLabel, Panel } from "./kit";

export function TakeLog({
  engine,
  lines,
}: {
  engine: TakeEngine;
  lines: { n: number; text: string }[];
}) {
  return (
    <Panel className="p-8">
      <MicroLabel>Take log</MicroLabel>
      <div className="mt-4 grid grid-cols-2 gap-px bg-ink/10 md:grid-cols-4">
        <Stat label="Slates" value={String(engine.slateCount)} />
        <Stat label="Clean lines" value={`${engine.cleanCount}/${lines.length}`} />
        <Stat label="Retakes owed" value={String(engine.outstandingLines.length)} />
        <Stat label="Cuts" value={String(engine.events.filter((e) => e.kind === "cut").length)} />
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="hairline">
            <th className="microlabel px-3 py-2 font-normal">Line</th>
            <th className="microlabel px-3 py-2 font-normal">Status</th>
            <th className="microlabel px-3 py-2 font-normal">Retakes</th>
            <th className="microlabel px-3 py-2 font-normal">Text</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const s = engine.statuses.get(l.n) ?? "untouched";
            const color =
              s === "clean"
                ? "text-clean-deep"
                : s === "flub" || s === "retake-pending"
                  ? "text-cut-text"
                  : "text-ink-fade";
            return (
              <tr key={l.n} className="hairline border-t-0 border-b">
                <td className="microlabel px-3 py-2">{String(l.n).padStart(2, "0")}</td>
                <td className={`microlabel px-3 py-2 ${color}`}>{s.replace("-", " ")}</td>
                <td className="px-3 py-2 font-mono text-xs">{engine.retakesByLine.get(l.n) ?? 0}</td>
                <td className="px-3 py-2 text-ink-soft">{l.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {engine.events.length > 0 && (
        <div className="mt-6">
          <MicroLabel>Director feed</MicroLabel>
          <ul className="mt-3 space-y-1.5">
            {engine.events
              .slice(-8)
              .reverse()
              .map((e, i) => (
                <li key={i} className="font-mono text-xs text-ink-soft">
                  {eventText(e)}
                </li>
              ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function eventText(e: TakeEvent): string {
  switch (e.kind) {
    case "cut":
      return `CUT · line ${String(e.line).padStart(2, "0")} · ${e.reason}`;
    case "mark":
      return `MARK · lines ${e.from}-${e.to} · ${e.quality}${e.note ? ` · ${e.note}` : ""}`;
    case "note":
      return `NOTE · ${e.text}`;
    case "wrap":
      return `WRAP · ${e.summary}`;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-raised px-4 py-3">
      <div className="font-display text-2xl font-medium">{value}</div>
      <div className="microlabel mt-1 text-ink-fade">{label}</div>
    </div>
  );
}

export type { LineStatus };
