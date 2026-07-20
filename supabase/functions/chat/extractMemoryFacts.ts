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

function splitStoredItems(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinItems(items: string[] | undefined): string | null {
  if (!items || items.length === 0) return null;
  const capped = capItems(items);
  return capped.length > 0 ? capped.join("\n") : null;
}

/** REQ-01: merge new extraction with stored facts; newest unique items first; cap at 5 per field. */
export function mergeMemoryFactField(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const existingItems = splitStoredItems(existing);
  const incomingItems = splitStoredItems(incoming);
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const item of incomingItems) {
    const key = item.toLowerCase();
    const alreadyStored = existingItems.some((stored) => stored.toLowerCase() === key);
    if (alreadyStored || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= MAX_ITEMS_PER_FIELD) {
      return merged.join("\n");
    }
  }

  for (const item of existingItems) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= MAX_ITEMS_PER_FIELD) break;
  }

  return merged.length > 0 ? merged.join("\n") : null;
}

function mergeExtractedFields(
  existing: MemoryFactFields | null | undefined,
  extracted: ExtractedMemoryPayload,
): MemoryFactFields {
  const prior = existing ?? {
    peopleInLife: null,
    userLanguage: null,
    openAvoidances: null,
    userInsights: null,
    statedGoals: null,
  };

  return {
    peopleInLife: mergeMemoryFactField(prior.peopleInLife, joinItems(extracted.peopleInLife)),
    userLanguage: mergeMemoryFactField(prior.userLanguage, joinItems(extracted.userLanguage)),
    openAvoidances: mergeMemoryFactField(
      prior.openAvoidances,
      joinItems(extracted.openAvoidances),
    ),
    userInsights: mergeMemoryFactField(prior.userInsights, joinItems(extracted.userInsights)),
    statedGoals: mergeMemoryFactField(prior.statedGoals, joinItems(extracted.statedGoals)),
  };
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
            "Extract durable longitudinal memory facts from this coaching session transcript. Lines are labeled User: (the client) and Kota: (the AI coach). Return JSON with optional string arrays (max 5 items each, verbatim user language where possible): peopleInLife (named people and roles, e.g. Partner: Jordan), userLanguage (exact phrases the User used about their experience), openAvoidances (topics the User indicated they are not ready to address), userInsights (insights the User reached themselves — not Kota observations unless the User clearly affirmed them), statedGoals (verbatim values or goals the User stated). Omit empty fields.",
        },
        { role: "user", content: trimmed.slice(-16000) },
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

    const { data: existingRow } = await supabase
      .from("userMemoryFacts")
      .select("peopleInLife, userLanguage, openAvoidances, userInsights, statedGoals")
      .eq("userId", userId)
      .maybeSingle();

    const merged = mergeExtractedFields(
      (existingRow as MemoryFactFields | null) ?? null,
      extracted,
    );

    const now = new Date().toISOString();
    const row = {
      userId,
      ...merged,
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
