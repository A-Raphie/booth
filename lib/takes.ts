/** Take engine: pure state machine driven by the director's tool calls. */

export type LineStatus = "untouched" | "clean" | "flub" | "retake-pending";

export type TakeEvent =
  | { t: number; kind: "cut"; line: number; reason: string }
  | { t: number; kind: "mark"; from: number; to: number; quality: "clean" | "flub"; note?: string }
  | { t: number; kind: "note"; text: string }
  | { t: number; kind: "wrap"; summary: string };

export type ToolCallResult = { ok: boolean; say?: string };

export class TakeEngine {
  statuses = new Map<number, LineStatus>();
  events: TakeEvent[] = [];
  retakesByLine = new Map<number, number>();
  wrapped = false;
  wrapSummary = "";

  constructor(private lineNumbers: number[]) {
    for (const n of lineNumbers) this.statuses.set(n, "untouched");
  }

  get slateCount() {
    return this.events.filter((e) => e.kind === "cut").length;
  }

  get cleanCount() {
    let c = 0;
    for (const s of this.statuses.values()) if (s === "clean") c++;
    return c;
  }

  callRetake(fromLine: number, reason: string, t: number): ToolCallResult {
    const line = Math.max(1, Math.round(fromLine));
    this.statuses.set(line, "retake-pending");
    this.retakesByLine.set(line, (this.retakesByLine.get(line) ?? 0) + 1);
    this.events.push({ t, kind: "cut", line, reason: reason.slice(0, 140) });
    return { ok: true };
  }

  mark(
    quality: "clean" | "flub",
    fromLine: number,
    toLine: number,
    note: string | undefined,
    t: number,
  ): ToolCallResult {
    const from = Math.max(1, Math.round(fromLine));
    const to = Math.min(Math.max(from, Math.round(toLine || from)), this.lineNumbers.at(-1) ?? from);
    for (let n = from; n <= to; n++) {
      if (this.statuses.has(n)) this.statuses.set(n, quality === "clean" ? "clean" : "flub");
    }
    this.events.push({ t, kind: "mark", from, to, quality, note: note?.slice(0, 140) });
    return { ok: true };
  }

  finalize(summary: string, t: number): ToolCallResult {
    this.wrapped = true;
    this.wrapSummary = summary.slice(0, 200);
    this.events.push({ t, kind: "wrap", summary });
    return { ok: true };
  }

  applyToolCall(
    name: string,
    args: Record<string, unknown>,
    t: number,
  ): ToolCallResult {
    switch (name) {
      case "call_retake":
        return this.callRetake(
          Number(args.from_line ?? 1),
          String(args.reason ?? "flub"),
          t,
        );
      case "mark_take":
        return this.mark(
          args.quality === "flub" ? "flub" : "clean",
          Number(args.from_line ?? 1),
          Number(args.to_line ?? args.from_line ?? 1),
          args.note ? String(args.note) : undefined,
          t,
        );
      case "finalize":
        return this.finalize(String(args.summary ?? "wrapped"), t);
      default:
        return { ok: false };
    }
  }

  /** Lines still owed a clean read. */
  get outstandingLines(): number[] {
    return this.lineNumbers.filter((n) => {
      const s = this.statuses.get(n);
      return s !== "clean";
    });
  }
}
