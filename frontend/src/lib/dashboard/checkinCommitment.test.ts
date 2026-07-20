import { describe, expect, it } from "vitest";
import { COMMITMENT_FOLLOW_THROUGH_OPTIONS } from "@/lib/dashboard/checkinApi";
import {
  normalizeCheckInCommitmentStatus,
} from "../../../../supabase/functions/chat/sessionMemory/commitmentFollowThrough.ts";

describe("check-in commitment follow-through", () => {
  it("exposes Build Brief answer options", () => {
    expect(COMMITMENT_FOLLOW_THROUGH_OPTIONS.map((option) => option.label)).toEqual([
      "Yes",
      "Partially",
      "No",
      "I forgot",
    ]);
  });

  it("maps stored check-in answers to Layer 10 status vocabulary", () => {
    for (const option of COMMITMENT_FOLLOW_THROUGH_OPTIONS) {
      expect(normalizeCheckInCommitmentStatus(option.value)).not.toBeNull();
    }

    expect(normalizeCheckInCommitmentStatus("partially")).toBe("completed");
    expect(normalizeCheckInCommitmentStatus("no")).toBe("missed");
    expect(normalizeCheckInCommitmentStatus("I forgot")).toBe("missed");
  });
});
