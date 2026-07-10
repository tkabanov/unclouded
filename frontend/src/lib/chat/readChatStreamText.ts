/**
 * Parse AI SDK UI message stream (SSE `text-delta` chunks) or legacy `0:"..."` lines.
 */
export async function readChatStreamText(response: Response): Promise<string> {
  if (!response.body) throw new Error("AI response was empty");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;

      if (trimmed.startsWith("data:")) {
        try {
          const json = JSON.parse(trimmed.slice(5).trim()) as {
            type?: string;
            delta?: string;
          };
          if (json.type === "text-delta" && typeof json.delta === "string") {
            text += json.delta;
          }
        } catch {
          // ignore malformed stream chunks
        }
        continue;
      }

      const legacy = trimmed.match(/^(\d+):"((?:\\.|[^"\\])*)"/);
      if (legacy) {
        text += legacy[2]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n")
          .replace(/\\\\/g, "\\");
      }
    }
  }

  const reply = text.trim();
  if (!reply) throw new Error("AI reply was empty");
  return reply;
}
