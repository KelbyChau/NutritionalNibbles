import { isRecord } from "./nutrient-swaps";

export async function generateRows(
  key: string,
  instruction: string,
  data: unknown,
  properties: Record<string, { type: string }>,
  maxItems: number,
  signal: AbortSignal,
): Promise<unknown[]> {
  const model = encodeURIComponent(process.env.GEMINI_MODEL || "gemini-3.8-flash");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(data) }] }],
        generationConfig: {
          maxOutputTokens: 4096,
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
      }),
    },
  );

  if (!response.ok) throw new Error(`Gemini responded with status ${response.status}`);
  const reply = await response.json();
  const parts = reply.candidates?.[0]?.content?.parts;
  const output = Array.isArray(parts)
    ? parts.filter((part) => !part.thought && typeof part.text === "string")
        .map((part) => part.text)
        .join("")
    : "";
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error("Unexpected Gemini response");
  }
  return parsed.rows.slice(0, maxItems);
}
