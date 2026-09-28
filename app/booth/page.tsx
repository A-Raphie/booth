"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, MicroLabel, Panel } from "@/components/kit";
import { ScriptCanvas } from "@/components/script-canvas";
import { SlateStamp } from "@/components/slate-stamp";
import { LevelStrip, TranscriptTicker, type TranscriptState } from "@/components/level-strip";
import { TakeLog } from "@/components/take-log";
import { BoothCapture } from "@/lib/capture";
import { VoiceAgentClient, ToolDef } from "@/lib/voice-agent";
import { TakeEngine, LineStatus } from "@/lib/takes";
import { buildSystemPrompt, parseScript, scoreSegmentAgainstScript, tokenize } from "@/lib/script";
import { SAMPLE_SCRIPTS } from "@/lib/samples";
import { alignWordsToLines, buildMasterFromSpans, buildRawTake, Word } from "@/lib/splice";
import { encodeWav } from "@/lib/audio-utils";
import {
  chunkForSync,
  concatInt16,
  downsampleInt16,
  offsetWords,
  TRANSCRIBE_RATE,
} from "@/lib/transcribe";

type Phase = "script" | "live" | "wrapped";

const DIRECTOR_VOICE = "alba";

const TOOLS: ToolDef[] = [
  {
    type: "function",
    name: "call_retake",
    description:
      "Call a retake after a flub. Call this immediately after you say 'Cut'.",
    parameters: {
      type: "object",
      properties: {
        from_line: { type: "integer", description: "1-based script line to restart from" },
        reason: { type: "string", description: "The flub: what was misread, what was expected. Max 12 words." },
      },
      required: ["from_line", "reason"],
    },
  },
  {
    type: "function",
    name: "mark_take",
    description: "Mark the span the talent just read as clean or flubbed.",
    parameters: {
      type: "object",
      properties: {
        quality: { type: "string", enum: ["clean", "flub"] },
        from_line: { type: "integer" },
        to_line: { type: "integer" },
        note: { type: "string" },
      },
      required: ["quality", "from_line"],
    },
  },
  {
    type: "function",
    name: "finalize",
    description: "The script is fully read. Wrap the session.",
    parameters: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    },
  },
];

export default function BoothPage() {
  const [phase, setPhase] = useState<Phase>("script");
  const [scriptText, setScriptText] = useState(SAMPLE_SCRIPTS[0].body);
  const [statuses, setStatuses] = useState<Map<number, LineStatus>>(new Map());
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  const [directorLine, setDirectorLine] = useState("");
  const [sessionClock, setSessionClock] = useState(0);
  const [slate, setSlate] = useState<{ take: number; line: number; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [wrapBusy, setWrapBusy] = useState(false);
  const [master, setMaster] = useState<{ url: string; used: number[]; dropped: number[] } | null>(null);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [engineSnapshot, setEngineSnapshot] = useState<TakeEngine | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [byoKey, setByoKey] = useState("");
  const endSessionRef = useRef<((auto?: boolean) => Promise<void>) | null>(null);

  const clientRef = useRef<VoiceAgentClient | null>(null);
  const captureRef = useRef<BoothCapture | null>(null);
  const engineRef = useRef<TakeEngine | null>(null);
  const linesRef = useRef(parseScript(scriptText));
  const playCtxRef = useRef<AudioContext | null>(null);
  const playQueueRef = useRef<{ sources: AudioBufferSourceNode[]; nextAt: number }>({
    sources: [],
    nextAt: 0,
  });
  const segmentRef = useRef<string[]>([]);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flubNudgeRef = useRef<{ line: number; expected: string } | null>(null);
  const wrappedRef = useRef(false);
  const levelRef = useRef(0);
  const transcriptRef = useRef<TranscriptState>({ delta: "", finals: [] });
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const lines = useMemo(() => parseScript(scriptText), [scriptText]);
  linesRef.current = lines;

  const refreshEngine = useCallback(() => {
    if (!engineRef.current) return;
    setStatuses(new Map(engineRef.current.statuses));
    setEngineSnapshot(engineRef.current);
  }, []);

  const getKeyHeaders = useCallback((): HeadersInit => {
    const key = typeof window !== "undefined" ? localStorage.getItem("booth.key") : null;
    return key ? { "x-aai-key": key } : {};
  }, []);

  const stopPlayback = useCallback(() => {
    const q = playQueueRef.current;
    q.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    q.sources = [];
    q.nextAt = 0;
  }, []);

  const scheduleAgentAudio = useCallback((b64: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    const bin = atob(b64);
    const i16 = new Int16Array(bin.length / 2);
    for (let i = 0; i < i16.length; i++) {
      i16[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) << 16 >> 16;
    }
    if (i16.length === 0) return;
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x8000;
    const buf = ctx.createBuffer(1, f32.length, 24000);
    buf.copyToChannel(f32, 0);
    const q = playQueueRef.current;
    const startAt = Math.max(ctx.currentTime + 0.02, q.nextAt);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(startAt);
    q.sources.push(src);
    q.nextAt = startAt + buf.duration;
    src.onended = () => {
      q.sources = q.sources.filter((s) => s !== src);
    };
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    const parsed = parseScript(scriptText);
    if (parsed.length < 2) {
      setError("Give the director at least two lines to guard.");
      return;
    }
    engineRef.current = new TakeEngine(parsed.map((l) => l.n));
    refreshEngine();

    try {
      setStatusNote("Minting session token");
      const tokenRes = await fetch("/api/token", { headers: getKeyHeaders(), cache: "no-store" });
      if (!tokenRes.ok) {
        const body = await tokenRes.json().catch(() => ({}));
        if (tokenRes.status === 401) {
          setNeedKey(true);
          setStatusNote("");
          return;
        }
        throw new Error(body.error ?? "token request failed");
      }
      const { token } = (await tokenRes.json()) as { token: string };

      setStatusNote("Opening the booth");
      playCtxRef.current = new AudioContext();
      await playCtxRef.current.resume();

      const client = new VoiceAgentClient({
        onReady: () => setStatusNote("Director on the floor"),
        onAgentAudio: (b64) => scheduleAgentAudio(b64),
        onAgentTranscript: (t) => setDirectorLine(t),
        onReplyDone: () => {
          playQueueRef.current.nextAt = 0;
        },
        onUserDelta: (d) => {
          transcriptRef.current.delta = d;
        },
        onSpeechStarted: () => {
          stopPlayback();
          transcriptRef.current.delta = "";
        },
        onUserTranscript: (text) => {
          transcriptRef.current.delta = "";
          transcriptRef.current.finals = [...transcriptRef.current.finals, text].slice(-2);
          segmentRef.current.push(text);
          const segTokens = segmentRef.current.flatMap(tokenize);
          const cov = scoreSegmentAgainstScript(segTokens, linesRef.current);
          let top: number | null = null;
          for (const c of cov) {
            if (c.covered && (top === null || c.line > top)) top = c.line;
            const st = engineRef.current?.statuses.get(c.line);
            if (c.covered && st === "untouched") {
              engineRef.current?.statuses.set(c.line, c.flubbed ? "flub" : "clean");
            }
          }
          if (top !== null) setCurrentLine(Math.min(top + 1, linesRef.current.length));
          refreshEngine();
          const flubbed = cov.filter((c) => c.flubbed && c.covered);
          if (flubbed.length > 0) {
            const worst = flubbed.reduce((a, b) => (a.score < b.score ? a : b));
            const l = linesRef.current.find((x) => x.n === worst.line);
            if (l) flubNudgeRef.current = { line: l.n, expected: l.text };
          }
        },
        onSpeechStopped: () => {
          segmentRef.current = [];
          if (!flubNudgeRef.current) return;
          if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
          nudgeTimerRef.current = setTimeout(() => {
            const n = flubNudgeRef.current;
            if (!n || !engineRef.current) return;
            const alreadyCut = engineRef.current.events.some(
              (e) => e.kind === "cut" && e.line === n.line,
            );
            if (!alreadyCut) {
              clientRef.current?.requestReply(
                `Cut the talent off right now. Line ${n.line} was misread. Say 'Cut. Line ${n.line}: ${n.expected.slice(0, 60)}'. Then call call_retake with from_line=${n.line}.`,
              );
            }
            flubNudgeRef.current = null;
          }, 1800);
        },
        onToolCall: (callId, name, args) => {
          const engine = engineRef.current;
          if (!engine) return;
          const result = engine.applyToolCall(name, args, captureRef.current?.masterMs ?? 0);
          clientRef.current?.sendToolResult(callId, result);
          refreshEngine();
          if (name === "call_retake") {
            if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
            flubNudgeRef.current = null;
            setSlate({ take: engine.slateCount, line: Number(args.from_line ?? 1), reason: String(args.reason ?? "flub") });
            setCurrentLine(Number(args.from_line ?? 1));
          }
          if (name === "finalize") {
            void endSessionRef.current?.(true);
          }
        },
        onError: (code, message) => setError(`${code}: ${message}`),
        onDisconnected: () => {
          if (!wrappedRef.current) setStatusNote("Session socket closed");
        },
      });
      clientRef.current = client;
      client.connect(token, {
        system_prompt: buildSystemPrompt(parsed),
        greeting:
          "Step up to the glass. Read line one whenever you're ready. I'll call the cuts.",
        voice: DIRECTOR_VOICE,
        tools: TOOLS,
      });

      setStatusNote("Requesting microphone");
      const capture = new BoothCapture(
        (b64) => client.sendAudio(b64),
        (rms) => {
          levelRef.current = rms;
        },
      );
      captureRef.current = capture;
      await capture.start();

      setPhase("live");
      setStatusNote("Recording");
      const t0 = Date.now();
      const clock = setInterval(() => setSessionClock(Math.floor((Date.now() - t0) / 1000)), 1000);
      clockRef.current = clock;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatusNote("");
    }
  }, [scriptText, refreshEngine, getKeyHeaders, scheduleAgentAudio, stopPlayback]);

  const endSession = useCallback(
    async (auto = false) => {
      if (wrappedRef.current) return;
      wrappedRef.current = true;
      setWrapBusy(true);
      if (clockRef.current) clearInterval(clockRef.current);
      setStatusNote(auto ? "Director called the wrap" : "That's a wrap");
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      const dur = await clientRef.current?.end();
      clientRef.current?.dispose();
      setSessionSeconds(Math.round(dur ?? 0));
      stopPlayback();
      const take = await captureRef.current?.stop();
      setPhase("wrapped");

      if (take && take.durationMs > 2000) {
        try {
          setStatusNote("Listening back");
          setRawUrl(URL.createObjectURL(buildRawTake(take.chunks, take.sampleRate)));
          // downsample + split: serverless body limits and the sync API's 120 s
          // ceiling both require chunked transcription for real sessions
          const pcm16k = downsampleInt16(concatInt16(take.chunks), take.sampleRate);
          const parts = chunkForSync(pcm16k, TRANSCRIBE_RATE);
          const words: Word[] = [];
          for (const part of parts) {
            const wav = encodeWav([part.pcm], TRANSCRIBE_RATE);
            const form = new FormData();
            form.append("audio", new File([wav], "part.wav", { type: "audio/wav" }));
            const res = await fetch("/api/sync", {
              method: "POST",
              headers: getKeyHeaders(),
              body: form,
            });
            if (!res.ok) throw new Error("sync transcription failed");
            const data = (await res.json()) as { words?: Word[] };
            words.push(...offsetWords(data.words ?? [], part.offsetMs));
          }
          const spans = alignWordsToLines(words, linesRef.current);
          const built = buildMasterFromSpans(take.chunks, take.sampleRate, spans);
          setMaster({
            url: URL.createObjectURL(built.blob),
            used: built.usedLines,
            dropped: built.droppedLines,
          });
          setStatusNote("Master printed");
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setStatusNote("Master failed: raw take still available");
        }
      } else {
        setStatusNote("Session too short for a master");
      }
      setWrapBusy(false);
    },
    [stopPlayback, getKeyHeaders],
  );
  endSessionRef.current = endSession;

  useEffect(() => {
    const onPageHide = () => {
      clientRef.current?.end();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const connectWithKey = useCallback(() => {
    const key = byoKey.trim();
    if (!key) return;
    localStorage.setItem("booth.key", key);
    setNeedKey(false);
    setError(null);
    void startSession();
  }, [byoKey, startSession]);

  if (phase === "script") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-14">
        <Link href="/" className="microlabel text-ink-fade hover:text-ink">
          ← Booth
        </Link>
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight md:text-5xl">
          Set the script.
        </h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          Paste your voiceover script, one line per line. The director guards each line.
          Numbers and names are where most flubs live, so keep them.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {SAMPLE_SCRIPTS.map((s) => (
            <Button key={s.id} variant="ghost" onClick={() => setScriptText(s.body)}>
              {s.title}
            </Button>
          ))}
        </div>

        <textarea
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          rows={14}
          spellCheck={false}
          className="hairline mt-6 w-full resize-none bg-raised p-6 font-mono text-sm leading-relaxed outline-none focus:border-accent"
        />

        <div className="mt-6 flex items-center gap-4">
          <Button onClick={() => void startSession()}>Take your position</Button>
          <span className="microlabel text-ink-fade">{statusNote}</span>
        </div>
        {needKey && (
          <Panel className="mt-6 max-w-xl p-6">
            <MicroLabel>No server key</MicroLabel>
            <p className="mt-2 text-sm text-ink-soft">
              The deploy has no ASSEMBLYAI_API_KEY yet. Paste your AssemblyAI key to run
              this session; it stays in this browser and is sent only to mint tokens.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="password"
                value={byoKey}
                onChange={(e) => setByoKey(e.target.value)}
                placeholder="AssemblyAI API key"
                className="hairline w-full bg-raised px-4 py-3 font-mono text-sm outline-none focus:border-accent"
              />
              <Button onClick={connectWithKey}>Connect</Button>
            </div>
          </Panel>
        )}
        {error && <p className="mt-4 max-w-prose text-sm text-cut-text">{error}</p>}
        <p className="microlabel mt-10 text-ink-fade">
          Mic on · echo cancellation on · audio never leaves your browser except as text
        </p>
      </main>
    );
  }

  if (phase === "live") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rec-dot inline-block h-2.5 w-2.5 rounded-full bg-cut" />
            <MicroLabel>
              On the floor · {statusNote} · {String(Math.floor(sessionClock / 60)).padStart(2, "0")}:
              {String(sessionClock % 60).padStart(2, "0")}
            </MicroLabel>
          </div>
          <Button variant="danger" disabled={wrapBusy} onClick={() => void endSession(false)}>
            That's a wrap
          </Button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="relative">
            <ScriptCanvas lines={lines} statuses={statuses} currentLine={currentLine} />
            {slate && (
              <SlateStamp
                key={`${slate.take}-${slate.line}`}
                take={slate.take}
                line={slate.line}
                reason={slate.reason}
              />
            )}
          </div>

          <aside className="space-y-4">
            <Panel className="p-5">
              <MicroLabel>Director</MicroLabel>
              <p className="mt-3 min-h-16 text-sm leading-relaxed text-ink">
                {directorLine || "On the other side of the glass."}
              </p>
            </Panel>
            <Panel className="p-5">
              <MicroLabel>Live read</MicroLabel>
              <div className="mt-3">
                <TranscriptTicker transcriptRef={transcriptRef} />
              </div>
            </Panel>
            <Panel className="p-5">
              <MicroLabel>Level</MicroLabel>
              <div className="mt-3">
                <LevelStrip levelRef={levelRef} active={phase === "live"} />
              </div>
              <p className="microlabel mt-3 text-ink-fade">Line {String(currentLine ?? 1).padStart(2, "0")} is up</p>
            </Panel>
            {error && <Panel className="p-4 text-sm text-cut-text">{error}</Panel>}
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <MicroLabel>Session complete</MicroLabel>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
        That's a print.
      </h1>
      <p className="microlabel mt-3 text-ink-fade">
        {sessionSeconds ? `${sessionSeconds}s session · ` : ""}
        {statusNote}
      </p>

      {master && (
        <Panel className="mt-8 flex flex-wrap items-center gap-6 p-8">
          <div className="flex-1">
            <MicroLabel>Master</MicroLabel>
            <p className="mt-2 text-sm text-ink-soft">
              {master.used.length} lines printed, best take per line.
              {master.dropped.length > 0 && ` ${master.dropped.length} line(s) dropped: ${master.dropped.join(", ")}.`}
            </p>
          </div>
          <a href={master.url} download="booth-master.wav" className="microlabel bg-ink px-5 py-3 text-paper hover:bg-ink-soft">
            Download master WAV
          </a>
        </Panel>
      )}
      {rawUrl && (
        <p className="mt-4">
          <a href={rawUrl} download="booth-session-raw.wav" className="microlabel text-ink-fade underline hover:text-ink">
            Download raw session
          </a>
        </p>
      )}

      {engineSnapshot && (
        <div className="mt-8">
          <TakeLog engine={engineSnapshot} lines={lines} />
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Button
          onClick={() => {
            wrappedRef.current = false;
            setMaster(null);
            setRawUrl(null);
            setSlate(null);
            setDirectorLine("");
            setCurrentLine(null);
            setSessionSeconds(0);
            setStatuses(new Map());
            setEngineSnapshot(null);
            setPhase("script");
          }}
        >
          Back to the booth
        </Button>
        <Link href="/" className="microlabel inline-flex items-center px-5 py-3 text-ink-fade hover:text-ink">
          Home
        </Link>
      </div>
      {error && <p className="mt-4 text-sm text-cut-text">{error}</p>}
    </main>
  );
}

