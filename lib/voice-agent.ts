/**
 * AssemblyAI Voice Agent API WebSocket client.
 * Protocol: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/message-sequence
 *
 * Lifecycle: connect(token) -> session.update (inline config) -> session.ready
 * -> input.audio loop / reply.audio playback / tool.call handling
 * -> session.end -> wait session.ended -> close. Tokens are SINGLE-USE.
 */

export type ToolDef = {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  execution_mode?: "interactive" | "hold";
  timeout_seconds?: number;
};

export type SessionConfig = {
  system_prompt: string;
  greeting: string;
  voice: string;
  tools: ToolDef[];
};

export type VoiceAgentCallbacks = {
  onReady?: (sessionId: string) => void;
  onSpeechStarted?: () => void;
  onSpeechStopped?: () => void;
  onUserDelta?: (delta: string) => void;
  onUserTranscript?: (text: string) => void;
  onAgentAudio?: (base64Pcm16: string) => void;
  onAgentTranscript?: (text: string) => void;
  onReplyStarted?: () => void;
  onReplyDone?: (interrupted: boolean) => void;
  onToolCall?: (callId: string, name: string, args: Record<string, unknown>) => void;
  onError?: (code: string, message: string) => void;
  onEnded?: (durationSeconds: number) => void;
  onDisconnected?: () => void;
};

export class VoiceAgentClient {
  private ws: WebSocket | null = null;
  private ready = false;
  private ended = false;
  private pendingAudio: string[] = [];
  private endWaiters: ((d: number) => void)[] = [];

  constructor(private cb: VoiceAgentCallbacks) {}

  get isReady() {
    return this.ready;
  }

  connect(token: string, config: SessionConfig) {
    const ws = new WebSocket(
      `wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(token)}`,
    );
    this.ws = ws;
    this.ended = false;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            system_prompt: config.system_prompt,
            greeting: config.greeting,
            tools: config.tools,
            input: { format: { encoding: "audio/pcm" } },
            output: {
              voice: config.voice,
              format: { encoding: "audio/pcm" },
              volume: 100,
            },
          },
        }),
      );
    };

    ws.onmessage = (ev) => this.handle(ev.data as string);
    ws.onerror = () => this.cb.onError?.("socket", "connection error");
    ws.onclose = () => {
      const wasEnded = this.ended;
      this.ready = false;
      this.cb.onDisconnected?.();
      if (wasEnded) this.endWaiters.forEach((w) => w(0));
    };
  }

  private handle(raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg.type) {
      case "session.ready":
        this.ready = true;
        this.cb.onReady?.(String(msg.session_id ?? ""));
        for (const a of this.pendingAudio) this.sendAudio(a);
        this.pendingAudio = [];
        break;
      case "session.updated":
        break;
      case "input.speech.started":
        this.cb.onSpeechStarted?.();
        break;
      case "input.speech.stopped":
        this.cb.onSpeechStopped?.();
        break;
      case "transcript.user.delta":
        this.cb.onUserDelta?.(String(msg.delta ?? ""));
        break;
      case "transcript.user":
        this.cb.onUserTranscript?.(String(msg.text ?? ""));
        break;
      case "reply.started":
        this.cb.onReplyStarted?.();
        break;
      case "reply.audio":
        if (typeof msg.data === "string") this.cb.onAgentAudio?.(msg.data);
        break;
      case "transcript.agent":
        this.cb.onAgentTranscript?.(String(msg.text ?? ""));
        break;
      case "reply.done":
        this.cb.onReplyDone?.(Boolean(msg.interrupted));
        break;
      case "tool.call":
        this.cb.onToolCall?.(
          String(msg.call_id ?? ""),
          String(msg.name ?? ""),
          (msg.arguments as Record<string, unknown>) ?? {},
        );
        break;
      case "session.error":
        this.cb.onError?.(String(msg.error_code ?? "unknown"), String(msg.message ?? ""));
        break;
      case "session.ended": {
        this.ended = true;
        const dur = Number(msg.session_duration_seconds ?? 0);
        this.cb.onEnded?.(dur);
        this.ws?.close(1000);
        this.endWaiters.forEach((w) => w(dur));
        this.endWaiters = [];
        break;
      }
    }
  }

  /** Queue or send a base64 PCM16 mono 24kHz audio chunk. */
  sendAudio(base64Pcm16: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.ready) {
      if (this.pendingAudio.length < 400) this.pendingAudio.push(base64Pcm16);
      return;
    }
    this.ws.send(JSON.stringify({ type: "input.audio", audio: base64Pcm16 }));
  }

  sendToolResult(callId: string, result: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: "tool.result",
        call_id: callId,
        result: JSON.stringify(result ?? { ok: true }),
      }),
    );
  }

  /** Ask the agent to generate a reply now, with optional one-shot instructions. */
  requestReply(instructions?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.ready) return;
    this.ws.send(
      JSON.stringify(
        instructions
          ? { type: "reply.create", instructions }
          : { type: "reply.create" },
      ),
    );
  }

  /** session.end -> session.ended -> close. Never close bare: 30s billable grace. */
  end(): Promise<number> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.ended) {
        resolve(0);
        return;
      }
      this.endWaiters.push(resolve);
      this.ws.send(JSON.stringify({ type: "session.end" }));
      setTimeout(() => {
        if (!this.ended) {
          this.ended = true;
          this.ws?.close(1000);
          resolve(0);
        }
      }, 3000);
    });
  }

  dispose() {
    this.ended = true;
    this.ws?.close(1000);
    this.ws = null;
    this.ready = false;
  }
}
