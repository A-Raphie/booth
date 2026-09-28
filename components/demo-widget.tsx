"use client";

import { useState } from "react";
import { Button, MicroLabel, Panel } from "./kit";
import { parseScript, scoreSegmentAgainstScript, tokenize } from "@/lib/script";
import { SAMPLE_SCRIPTS } from "@/lib/samples";
import { alignWordsToLines, Word } from "@/lib/splice";

type RunState = "idle" | "running" | "done" | "error";

/**
 * Deterministic demo: a bundled bad take (real audio, lines 3 and 7 misread)
 * runs through the real judge pipeline: sync transcription, line alignment,
 * flub scoring, slate stamps. No microphone needed.
 */
export function DemoWidget() {
  const [state, setState] = useState<RunState>("idle");
  const [note, setNote] = useState("");
  const [flubs, setFlubs] = useState<number[]>([]);
  const [masterNote, setMasterNote] = useState("");
  const [open, setOpen] = useState(false);

  const run = async () => {
    setState("running");
    setNote("Loading the bad take");
    setFlubs([]);
    setMasterNote("");
    setOpen(true);
    try {
      const audioRes = await fetch("/badtake.wav");
      if (!audioRes.ok) throw new Error("bad take missing");
      const blob = await audioRes.blob();
      setNote("Transcribing with universal-3.5-pro");
      const form = new FormData();
      form.append("audio", new File([blob], "badtake.wav", { type: "audio/wav" }));
      const res = await fetch("/api/sync", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error === "missing_api_key" ? "Server needs an AssemblyAI API key for this run." : "Sync transcription failed");
      }
      const data = (await res.json()) as { words?: Word[]; confidence?: number };
      const words = data.words ?? [];
      const script = SAMPLE_SCRIPTS.find((s) => s.id === "coldbrew")!;
      const lines = parseScript(script.body);
      const spans = alignWordsToLines(words, lines);
      const flubbed: number[] = [];
      for (const span of spans) {
        const line = lines.find((l) => l.n === span.line);
        if (!line) continue;
        const cov = scoreSegmentAgainstScript(
          words
            .filter((w) => w.start != null && w.start >= span.startMs && (w.end ?? 0) <= span.endMs)
            .flatMap((w) => tokenize(w.text)),
          [line],
        )[0];
        if (cov && cov.flubbed) flubbed.push(span.line);
      }
      setFlubs(flubbed);
      setMasterNote(
        `${spans.length} lines aligned at ${(100 * spans.length / lines.length).toFixed(0)}% · transcript confidence ${(100 * (data.confidence ?? 0)).toFixed(0)}% · flubs caught: ${flubbed.join(", ") || "none"}`,
      );
      setState("done");
      setNote("Slates stamped from the read:");
    } catch (e) {
      setState("error");
      setNote(e instanceof Error ? e.message : String(e));
    }
  };

  const script = SAMPLE_SCRIPTS.find((s) => s.id === "coldbrew")!;

  return (
    <Panel className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <MicroLabel>Live proof · no mic needed</MicroLabel>
          <p className="mt-2 max-w-prose text-ink-soft">
            A deliberately bad take of the script below runs through Booth's real judge
            pipeline. Watch it catch the misreads.
          </p>
        </div>
        <Button variant="accent" onClick={() => void run()} disabled={state === "running"}>
          {state === "running" ? "Judging…" : "Run the bad take"}
        </Button>
      </div>

      {open && (
        <div className="mt-6 border-t border-ink/10 pt-6">
          <p className="microlabel text-ink-fade">{note}</p>
          {state === "done" && (
            <ol className="mt-4 space-y-2">
              {parseScript(script.body).map((l) => {
                const bad = flubs.includes(l.n);
                return (
                  <li key={l.n} className={`flex gap-3 text-sm ${bad ? "text-cut-text" : "text-ink-soft"}`}>
                    <span className="microlabel w-8 shrink-0 pt-0.5 text-right">{String(l.n).padStart(2, "0")}</span>
                    <span>{l.text}</span>
                    {bad && <span className="microlabel shrink-0 pt-0.5 text-cut-text">↻ retake</span>}
                  </li>
                );
              })}
            </ol>
          )}
          {state === "done" && masterNote && (
            <p className="microlabel mt-4 text-ink-fade">{masterNote}</p>
          )}
          {state === "error" && <p className="mt-3 text-sm text-cut-text">{note}</p>}
        </div>
      )}
    </Panel>
  );
}
