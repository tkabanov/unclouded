import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchChatLiveContext } from "./chatLiveContextApi";

vi.mock("@/lib/dashboard/checkinApi", () => ({
  fetchLatestDailyCheckIn: vi.fn(),
  fetchDailyCheckInStreak: vi.fn(),
}));

vi.mock("@/lib/dashboard/microCommitmentsApi", () => ({
  fetchMicroCommitments: vi.fn(),
}));

vi.mock("@/lib/chat/chatConversationsApi", () => ({
  fetchConversations: vi.fn(),
}));

vi.mock("@/lib/chat/pathsReflectionApi", () => ({
  fetchRecentPathReflectionAnswers: vi.fn(),
}));

import {
  fetchLatestDailyCheckIn,
  fetchDailyCheckInStreak,
} from "@/lib/dashboard/checkinApi";
import { fetchMicroCommitments } from "@/lib/dashboard/microCommitmentsApi";
import { fetchConversations } from "@/lib/chat/chatConversationsApi";
import { fetchRecentPathReflectionAnswers } from "@/lib/chat/pathsReflectionApi";

const mockedLatestCheckIn = vi.mocked(fetchLatestDailyCheckIn);
const mockedStreak = vi.mocked(fetchDailyCheckInStreak);
const mockedMicroCommitments = vi.mocked(fetchMicroCommitments);
const mockedConversations = vi.mocked(fetchConversations);
const mockedPathReflections = vi.mocked(fetchRecentPathReflectionAnswers);

describe("fetchChatLiveContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates live signals without fabricating missing fields", async () => {
    mockedLatestCheckIn.mockResolvedValue({
      date: "2026-07-10",
      pulse: 4,
      feeling: "tired",
      energyStressLevel: 6,
      microCommitmentStatus: "partially",
    });
    mockedStreak.mockResolvedValue(5);
    mockedMicroCommitments.mockResolvedValue([
      {
        id: "s1",
        pathName: "Hard Seasons",
        sessionIndex: 1,
        microCommitmentText: "Text a friend",
        isCompleted: false,
      },
    ]);
    mockedConversations.mockResolvedValue([
      {
        id: "c1",
        title: "Session 1",
        previewText: "Hi",
        modifiedDate: null,
      },
      {
        id: "c2",
        title: "Session 2",
        previewText: "Hello",
        modifiedDate: null,
      },
    ]);
    mockedPathReflections.mockResolvedValue([
      {
        pathName: "Hard Seasons",
        sessionTitle: "Session 1",
        questionText: "What felt heaviest?",
        answerText: "Work deadlines",
      },
    ]);

    const result = await fetchChatLiveContext("user-1", {});

    expect(result.latestCheckIn?.pulse).toBe(4);
    expect(result.latestCheckIn?.microCommitmentStatus).toBe("partially");
    expect(result.streakDays).toBe(5);
    expect(result.activeMicroCommitment).toBe("Text a friend");
    expect(result.sessionCount).toBe(2);
    expect(result.pathReflections).toHaveLength(1);
  });

  it("returns null session count and empty path reflections when APIs are empty", async () => {
    mockedLatestCheckIn.mockResolvedValue(null);
    mockedStreak.mockResolvedValue(0);
    mockedMicroCommitments.mockResolvedValue([]);
    mockedConversations.mockResolvedValue([]);
    mockedPathReflections.mockResolvedValue([]);

    const result = await fetchChatLiveContext("user-1", null);

    expect(result.latestCheckIn).toBeNull();
    expect(result.activeMicroCommitment).toBeNull();
    expect(result.sessionCount).toBeNull();
    expect(result.pathReflections).toEqual([]);
  });
});
