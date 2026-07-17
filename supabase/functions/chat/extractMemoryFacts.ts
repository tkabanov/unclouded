import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const MAX_ITEMS_PER_FIELD = 5;

type MemoryFactFields = {
  peopleInLife: string | null;
  userLanguage: string | null;
  openAvoidances: string | null;
  userInsights: string | null;
  statedGoals: string | null;
};

type ExtractedMemoryPayload = Partial<Record<keyof MemoryFactFields, string[]>>;

function capItems(items: string[]): string[] {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_ITEMS_PER_FIELD);
}

function joinItems(items: string[] | undefined): string | null {
  if (!items || items.length === 0) return null;
  const capped = capItems(items);
  return capped.length > 0 ? capped.join("\n") : null;
}

function parseExtractedPayload(raw: unknown): ExtractedMemoryPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const readArray = (key: keyof MemoryFactFields): string[] | undefined => {
    const value = row[key];
    if (!Array.isArray(value)) return undefined;
    return value.filter((item): item is string => typeof item === "string");
  };

  return {
    peopleInLife: readArray("peopleInLife"),
    userLanguage: readArray("userLanguage"),
    openAvoidances: readArray("openAvoidances"),
    userInsights: readArray("userInsights"),
    statedGoals: readArray("statedGoals"),
  };
}

async function extractWithOpenAi(
  transcript: string,
  apiKey: string,
): Promise<ExtractedMemoryPayload | null> {
  const trimmed = transcript.trim();
  if (!trimmed) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract durable coaching memory facts from the transcript. Return JSON with optional string arrays: peopleInLife, userLanguage, openAvoidances, userInsights, statedGoals. Max 5 items per field. Omit empty fields.",
        },
        { role: "user", content: trimmed.slice(-12000) },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) return null;

  try {
    return parseExtractedPayload(JSON.parse(content));
  } catch {
    return null;
  }
}

/**
 * Extract memory facts from a transcript and upsert into userMemoryFacts.
 * Graceful no-op on any failure.
 */
export async function extractMemoryFacts(
  supabase: SupabaseClient,
  userId: string,
  transcript: string,
  openaiApiKey: string,
): Promise<void> {
  try {
    const extracted = await extractWithOpenAi(transcript, openaiApiKey);
    if (!extracted) return;

    const now = new Date().toISOString();
    const row = {
      userId,
      peopleInLife: joinItems(extracted.peopleInLife),
      userLanguage: joinItems(extracted.userLanguage),
      openAvoidances: joinItems(extracted.openAvoidances),
      userInsights: joinItems(extracted.userInsights),
      statedGoals: joinItems(extracted.statedGoals),
      lastUpdated: now,
    };

    const hasAnyField = Object.entries(row).some(
      ([key, value]) => key !== "userId" && key !== "lastUpdated" && value,
    );
    if (!hasAnyField) return;

    const { error } = await supabase.from("userMemoryFacts").upsert(row, {
      onConflict: "userId",
    });
    if (error) {
      console.warn("extractMemoryFacts upsert failed", error.message);
    }
  } catch (err) {
    console.warn("extractMemoryFacts failed", err);
  }
}
