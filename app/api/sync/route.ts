import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Proxy for the sync transcription API. Accepts multipart/form-data with an
 * `audio` binary part and forwards it with word timestamps enabled.
 */
export async function POST(req: Request) {
  const auth = process.env.ASSEMBLYAI_API_KEY || req.headers.get("x-aai-key");
  if (!auth) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad_form" }, { status: 400 });
  }
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "audio_part_missing" }, { status: 400 });
  }

  const out = new FormData();
  out.append("audio", audio);
  out.append(
    "config",
    JSON.stringify({ timestamps: true, language_codes: "en" }),
  );

  let res: Response;
  try {
    res = await fetch("https://sync.assemblyai.com/v1/transcribe", {
      method: "POST",
      headers: {
        Authorization: auth.startsWith("Bearer ") ? auth : auth,
        "X-AAI-Model": "universal-3-5-pro",
      },
      body: out,
    });
  } catch {
    return NextResponse.json({ error: "sync_fetch_failed" }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "sync_rejected", upstream_status: res.status, detail: detail.slice(0, 500) },
      { status: 502 },
    );
  }

  const data = await res.json();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
