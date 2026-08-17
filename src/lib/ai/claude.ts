const MODEL = "claude-sonnet-4-6";
const ENDPOINT = "https://api.anthropic.com/v1/messages";

/**
 * Failure talking to Anthropic, carrying the upstream status code.
 *
 * Callers need to distinguish an unconfigured key from a rate limit to say
 * anything useful, and the status is safe to surface where the key never is.
 */
export class ClaudeError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ClaudeError";
  }
}

/** Status used when the key is absent, so no request is attempted at all. */
export const NO_API_KEY = 0;

/** Prefer Kai's recovered production key while keeping older deployments valid. */
export function claudeApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY_KAI || process.env.ANTHROPIC_API_KEY;
}

export function hasClaudeApiKey(): boolean {
  return !!claudeApiKey();
}

function headers() {
  const key = claudeApiKey();
  if (!key) throw new ClaudeError(NO_API_KEY, "Anthropic API key is not set");
  return {
    "Content-Type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
  };
}

/** Server-side Anthropic call returning the full response (supports tool use). */
export async function askClaudeRaw(body: Record<string, unknown>) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ model: MODEL, max_tokens: 800, ...body }),
  });
  if (!res.ok) throw new ClaudeError(res.status, `Anthropic ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Server-side Anthropic call. The API key never reaches the browser. */
export async function askClaude(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 800,
      system: opts.system,
      messages: opts.messages,
    }),
  });
  if (!res.ok) throw new ClaudeError(res.status, `Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content || [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
}
