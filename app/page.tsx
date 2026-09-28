import Link from "next/link";
import { DemoWidget } from "@/components/demo-widget";

const STEPS = [
  {
    n: "01",
    title: "Set the script",
    body: "Paste your VO script, one line per line. The director takes it into the booth with you.",
  },
  {
    n: "02",
    title: "Read out loud",
    body: "A real-time voice agent follows your read against every line. Numbers, names, stumbles: nothing slips.",
  },
  {
    n: "03",
    title: "Get cut, get it right",
    body: "Flub a line and the director cuts you off mid-read: line number, what you said, what it should be. Read it again.",
  },
  {
    n: "04",
    title: "Print the master",
    body: "Wrap the session and Booth assembles the best read of every line into a clean WAV. The editing session never happens.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="pt-20 md:pt-28">
        <p className="microlabel text-ink-fade">Voiceover recording · real-time direction</p>
        <h1 className="mt-6 max-w-4xl font-display text-6xl font-medium leading-[0.95] tracking-tight md:text-8xl">
          The director is listening.
        </h1>
        <p className="mt-8 max-w-2xl text-xl leading-relaxed text-ink-soft">
          Read your voiceover script out loud. Booth hears every flub, cuts you off with the
          exact line to redo, and hands you a clean master when you wrap. You never open an
          editor for VO again.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/booth"
            className="microlabel bg-ink px-7 py-4 text-paper transition-colors hover:bg-ink-soft"
          >
            Enter the booth →
          </Link>
          <span className="microlabel text-ink-fade">Chrome or Edge · microphone · 2 minutes</span>
        </div>
      </section>

      {/* Live proof */}
      <section className="mt-20 md:mt-28">
        <DemoWidget />
      </section>

      {/* How it works */}
      <section className="mt-20 md:mt-28">
        <p className="microlabel text-ink-fade">The session</p>
        <div className="mt-8 grid gap-px bg-ink/10 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-paper p-6">
              <div className="microlabel text-accent">{s.n}</div>
              <h3 className="mt-4 font-display text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Numbers */}
      <section className="mt-20 md:mt-28">
        <div className="hairline grid grid-cols-1 bg-raised md:grid-cols-3">
          <div className="p-8">
            <div className="font-display text-5xl font-medium">45 min</div>
            <p className="microlabel mt-3 text-ink-fade">Scrubbing takes, per video, today</p>
          </div>
          <div className="p-8">
            <div className="font-display text-5xl font-medium">&lt; 2 s</div>
            <p className="microlabel mt-3 text-ink-fade">From flub to retake call, on the floor</p>
          </div>
          <div className="p-8">
            <div className="font-display text-5xl font-medium">0</div>
            <p className="microlabel mt-3 text-ink-fade">Editing sessions when you wrap</p>
          </div>
        </div>
      </section>

      {/* Dev section: the sponsor primitive, shown not told */}
      <section className="mt-20 md:mt-28">
        <p className="microlabel text-ink-fade">Under the glass</p>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight">
              One WebSocket. Real interruption handling.
            </h2>
            <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
              The director is a managed agent on the{" "}
              <a
                href="https://www.assemblyai.com/docs/voice-agents/voice-agent-api"
                className="underline decoration-accent underline-offset-4 hover:text-ink"
                target="_blank"
                rel="noreferrer"
              >
                AssemblyAI Voice Agent API
              </a>
              : streaming STT, turn detection, interruption handling, and speech synthesis in a
              single connection. Booth wires its decisions into the app as client-side tools —
              every retake call you see stamped on the script is a tool call the agent made.
            </p>
            <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
              The master is assembled from word-level timestamps returned by the sync
              transcription model: the best-scoring read of each line, spliced with fades, in
              your browser. Raw session audio never leaves your machine except as a
              transcription request.
            </p>
          </div>
          <pre className="hairline overflow-x-auto bg-ink p-6 font-mono text-xs leading-relaxed text-paper">
{`// the director's whole briefing
await ws.send(JSON.stringify({
  type: "session.update",
  session: {
    system_prompt: DIRECTOR_RULES + script,
    greeting: "Step up to the glass.",
    tools: [call_retake, mark_take, finalize],
    input:  { format: { encoding: "audio/pcm" } },
    output: { voice: "alba",
              format: { encoding: "audio/pcm" } },
  },
}));

// the money moment, as an event
{ "type": "tool.call",
  "name": "call_retake",
  "arguments": { "from_line": 4,
                 "reason": "said twelve,
                            script says eighteen" } }`}
          </pre>
        </div>
      </section>

      {/* CTA */}
      <section className="my-24 border-t border-ink/10 pt-16 text-center">
        <h2 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
          Take your position.
        </h2>
        <div className="mt-8 flex justify-center">
          <Link
            href="/booth"
            className="microlabel bg-ink px-7 py-4 text-paper transition-colors hover:bg-ink-soft"
          >
            Enter the booth →
          </Link>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 py-8">
        <span className="microlabel text-ink-fade">Booth · built by Raphie</span>
        <span className="microlabel text-ink-fade">
          AssemblyAI Voice Agent API · sync universal-3.5-pro
        </span>
      </footer>
    </main>
  );
}
