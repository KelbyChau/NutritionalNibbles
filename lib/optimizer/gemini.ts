import { isRecord } from "./nutrient-swaps";

// Flash Lite without thinking answers fastest, so requests stay well inside the
// time limits. gemini-3.5-flash with GEMINI_THINKING_LEVEL=low picks swaps a
// little better but often runs past them when Gemini is busy. Override with
// GEMINI_MODEL, and GEMINI_THINKING_LEVEL ("low", "high", or "off" to leave
// the setting out).
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_THINKING_LEVEL = "off";

// Each call to Gemini (each attempt) gets this long before it's abandoned, so
// one stuck call can't use up the caller's whole time limit.
export const GEMINI_CALL_TIMEOUT_MS = 20_000;

// Gemini answers 503 "high demand" (and sometimes 429/5xx) for a moment at a
// time, so those get two quick retries within the caller's time limit.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [500, 1500];

/** Gemini didn't answer within GEMINI_CALL_TIMEOUT_MS. */
export class GeminiTimeoutError extends Error {}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

export async function generateRows(
  key: string,
  instruction: string,
  data: unknown,
  properties: Record<string, { type: string; enum?: readonly string[] }>,
  maxItems: number,
  signal: AbortSignal,
): Promise<unknown[]> {
  const model = encodeURIComponent(process.env.GEMINI_MODEL || DEFAULT_MODEL);
  const thinkingLevel = process.env.GEMINI_THINKING_LEVEL || DEFAULT_THINKING_LEVEL;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: instruction }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(data) }] }],
    generationConfig: {
      // Low randomness: the same recipe and goal should get the same picks.
      temperature: 0.2,
      maxOutputTokens: 4096,
      ...(thinkingLevel === "off" ? {} : { thinkingConfig: { thinkingLevel } }),
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          rows: {
            type: "array",
            maxItems,
            items: { type: "object", properties, required: Object.keys(properties) },
          },
        },
        required: ["rows"],
      },
    },
  });

  // One attempt: the request and reading its reply share a time limit.
  const attempt = async (): Promise<{ status: number; reply?: unknown }> => {
    const timeout = AbortSignal.timeout(GEMINI_CALL_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          signal: AbortSignal.any([signal, timeout]),
          body,
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        return { status: response.status };
      }
      return { status: response.status, reply: await response.json() };
    } catch (error) {
      if (timeout.aborted && !signal.aborted) {
        throw new GeminiTimeoutError(`Gemini didn't answer within ${GEMINI_CALL_TIMEOUT_MS / 1000} s`);
      }
      throw error;
    }
  };

  let result = await attempt();
  for (const delay of RETRY_DELAYS_MS) {
    if (result.reply !== undefined || !RETRYABLE.has(result.status)) break;
    await wait(delay, signal);
    result = await attempt();
  }
  if (result.reply === undefined) throw new Error(`Gemini responded with status ${result.status}`);

  const reply = result.reply as { candidates?: { content?: { parts?: unknown } }[] };
  const parts = reply.candidates?.[0]?.content?.parts;
  const output = Array.isArray(parts)
    ? parts.filter((part) => isRecord(part) && !part.thought && typeof part.text === "string")
        .map((part) => part.text as string)
        .join("")
    : "";
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error("Unexpected Gemini response");
  }
  return parsed.rows.slice(0, maxItems);
}
