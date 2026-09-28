import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Mints a single-use Voice Agent session token. The API key never leaves the
 * server; in local dev a BYO key can be passed via the x-aai-key header.
 */
export async function GET(req: Request) {
  const auth = process.env.ASSEMBLYAI_API_KEY || req.headers.get("x-aai-key");
  if (!auth) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 401 });
  }

  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "300");
  url.searchParams.set("max_session_duration_seconds", "1800");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${auth}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "token_fetch_failed" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "token_rejected", upstream_status: res.status },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    return NextResponse.json({ error: "no_token_in_response" }, { status: 502 });
  }

  return NextResponse.json(
    { token: data.token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
