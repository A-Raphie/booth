/**
 * Generate Booth showcase VO via ai33.pro (vo-ai33 recipe).
 * Key is read from the skill file at runtime; never hardcoded in the repo.
 * Text rules: no em dashes, numbers spelled out, no URLs.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const skill = readFileSync(
  process.env.HOME + "/.agents/skills/vo-ai33/SKILL.md",
  "utf8",
);
const key = skill.match(/`?(sk_[a-z0-9]+)`?/)?.[1];
if (!key) throw new Error("ai33 key not found in skill file");

const LINES = {
  "scene-1": "Forty five minutes. That is what a voiceover creator loses scrubbing raw takes, every single video. Read the line, flub the number, hunt for it later.",
  "scene-2": "This is Booth. A deliberately bad take runs through the real judge pipeline: transcribed by AssemblyAI, aligned to the script, and two misreads are caught on screen.",
  "scene-3": "Now live, on AssemblyAI's Voice Agent API. The director hears the read, cuts the flub, and calls the retake by line number. Every cut is a tool call the agent made.",
  "scene-4": "Set your script, read it out loud, and wrap. Booth prints the master: the best read of every line, spliced from word level timestamps, right in your browser.",
  "outro": "Booth is live now. The demo voice is synthesized. Bring yours. The director is listening.",
};

mkdirSync("media/vo", { recursive: true });
const VOICE = "minimax_273587280617670";

async function synth(name, text) {
  const form = new FormData();
  form.append("text", text);
  form.append("voice_id", VOICE);
  form.append("speed", "1.0");
  const res = await fetch("https://api.ai33.pro/v3/text-to-speech", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });
  if (!res.ok) throw new Error(`tts submit failed ${res.status}: ${await res.text()}`);
  const { task_id } = await res.json();
  process.stdout.write(`${name}: task ${task_id} `);
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`https://api.ai33.pro/v1/task/${task_id}`, {
      headers: { "xi-api-key": key },
    });
    const data = await poll.json();
    if (data.status === "done") {
      const url = data.metadata?.audio_url;
      if (!url) throw new Error("done but no audio_url: " + JSON.stringify(data).slice(0, 200));
      execSync(`curl -sL "${url}" -o media/vo/${name}.mp3`);
      const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 media/vo/${name}.mp3`).toString().trim();
      console.log(`done ${dur}s`);
      return Number(dur);
    }
    if (data.status === "error") throw new Error(`${name} tts error: ${data.message ?? JSON.stringify(data).slice(0, 200)}`);
    process.stdout.write(".");
  }
  throw new Error(`${name} timed out`);
}

const durations = {};
for (const [name, text] of Object.entries(LINES)) {
  durations[name] = await synth(name, text);
}
writeFileSync("media/vo/durations.json", JSON.stringify(durations, null, 1));
const total = Object.values(durations).reduce((a, b) => a + b, 0);
console.log(`total VO: ${total.toFixed(1)}s`);
