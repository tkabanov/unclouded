import type { ChatLatestCheckIn } from "../prompt/types.ts";
import { toCheckInDateKey } from "./streakHelpers.ts";

export function isCheckInSubmittedToday(
  checkIn: ChatLatestCheckIn | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  if (!checkIn?.date?.trim()) return false;
  const parsed = Date.parse(checkIn.date);
  if (!Number.isFinite(parsed)) return false;
  return toCheckInDateKey(new Date(parsed)) === toCheckInDateKey(referenceDate);
}

/** Layer 10 item 1 — only today's check-in belongs in session-open context. */
export function resolveTodayCheckIn(
  checkIn: ChatLatestCheckIn | null | undefined,
  referenceDate: Date = new Date(),
): ChatLatestCheckIn | null {
  if (!isCheckInSubmittedToday(checkIn, referenceDate)) return null;
  return checkIn ?? null;
}

function looksLikeReflectionSentence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/[.?!]/.test(trimmed)) return true;
  return trimmed.split(/\s+/).filter(Boolean).length > 3;
}

/** US-400 feeling word — never treat brief reflection prose as the feeling word. */
export function resolveCheckInFeelingWord(
  checkIn: Pick<ChatLatestCheckIn, "feeling"> | null | undefined,
): string | null {
  const raw = checkIn?.feeling?.trim();
  if (!raw) return null;
  if (looksLikeReflectionSentence(raw)) return null;
  return raw.slice(0, 40);
}

export function mapDailyCheckInRow(row: Record<string, unknown>): ChatLatestCheckIn | null {
  const mood = Number(row.mood);
  const energy = Number(row.energyStressLevel ?? row.energy_stress_level);
  const reflection = typeof row.reflection === "string" ? row.reflection : "";
  const feelingWordRaw =
    typeof row.feelingWord === "string"
      ? row.feelingWord
      : typeof row.feeling_word === "string"
        ? row.feeling_word
        : "";
  const date =
    typeof row.date === "string"
      ? row.date
      : typeof row.createdAt === "string"
        ? row.createdAt
        : null;
  const microCommitmentStatus =
    typeof row.microCommitmentStatus === "string"
      ? row.microCommitmentStatus
      : typeof row.micro_commitment_status === "string"
        ? row.micro_commitment_status
        : null;

  if (Number.isNaN(mood) && Number.isNaN(energy) && !reflection.trim() && !feelingWordRaw.trim()) {
    return null;
  }

  const feelingCandidate = feelingWordRaw.trim() || null;
  const checkIn: ChatLatestCheckIn = {
    date,
    pulse: Number.isFinite(mood) ? mood : null,
    feeling: resolveCheckInFeelingWord({ feeling: feelingCandidate }) ?? null,
    energyStressLevel: Number.isFinite(energy) ? energy : null,
    microCommitmentStatus: microCommitmentStatus?.trim() ? microCommitmentStatus.trim() : null,
  };

  return checkIn;
}
