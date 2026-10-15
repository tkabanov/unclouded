import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import {
  mapAiRealtimeSessionRow,
  mapAiUsageOverview,
  realtimeSessionCostLabel,
} from "@/lib/settings/admin/adminAiUsageApi";
import { formatUsd } from "@/lib/settings/admin/aiUsagePeriod";
import AiUsageRealtimeSessionsPanel from "./AiUsageRealtimeSessionsPanel";
import AiUsageVoiceSurfaceCard from "./AiUsageVoiceSurfaceCard";

const surface = (over: Record<string, unknown> = {}) => ({
  spendUsd: 0.8,
  events: 3,
  sessions: 3,
  avgCostPerSessionUsd: 0.2667,
  avgDurationSeconds: 380,
  unconfirmedSessions: 2,
  ...over,
});

function row(over: Record<string, unknown>) {
  return {
    id: "s1",
    userId: "u1",
    displayName: "Alex Doe",
    email: "alex@example.com",
    planTier: "free",
    startedAt: "2026-10-15T10:00:00Z",
    connectedAt: "2026-10-15T10:00:05Z",
    endedAt: "2026-10-15T10:10:05Z",
    durationSeconds: 600,
    model: "gpt-realtime-2.1",
    voice: "marin",
    transcriptionModel: "gpt-4o-mini-transcribe",
    status: "ended",
    endReason: "user_ended",
    usageStatus: "complete",
    notConnected: false,
    responsesSeen: 2,
    responsesReported: 2,
    transcriptionsSeen: 1,
    transcriptionsReported: 1,
    inputTokens: 100,
    cachedInputTokens: 50,
    outputTokens: 20,
    audioInputTokens: 300,
    cachedAudioInputTokens: 10,
    audioOutputTokens: 900,
    responseCostUsd: 0.5,
    transcriptionCostUsd: 0.1,
    totalCostUsd: 0.6,
    pricingMissing: false,
    ...over,
  };
}

beforeEach(() => {
  rpc.mockReset();
  // Radix Select needs these in jsdom.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

describe("adminAiUsageApi realtime mapping", () => {
  it("maps byVoiceSurface and keeps null before the migration", () => {
    const mapped = mapAiUsageOverview({
      byVoiceSurface: { voice_messages: surface({ unconfirmedSessions: 0 }), realtime_conversation: surface() },
    });
    expect(mapped.byVoiceSurface?.realtimeConversation).toMatchObject({ spendUsd: 0.8, sessions: 3, unconfirmedSessions: 2 });
    expect(mapped.byVoiceSurface?.voiceMessages.unconfirmedSessions).toBe(0);
    expect(mapAiUsageOverview({}).byVoiceSurface).toBeNull();
  });

  it("maps a session row defensively", () => {
    const mapped = mapAiRealtimeSessionRow({ ...row({}), usageStatus: "weird", planTier: "x", durationSeconds: null });
    expect(mapped).toMatchObject({ usageStatus: "pending", planTier: "free", durationSeconds: null, totalCostUsd: 0.6 });
  });

  it("never shows unconfirmed usage as a confirmed $0", () => {
    const fmt = (value: number) => `$${value.toFixed(2)}`;
    expect(realtimeSessionCostLabel({ totalCostUsd: 0.6, usageStatus: "complete", notConnected: false }, fmt)).toEqual({
      amount: "$0.60",
      unconfirmed: false,
      note: null,
    });
    expect(realtimeSessionCostLabel({ totalCostUsd: 0.2, usageStatus: "partial", notConnected: false }, fmt)).toEqual({
      amount: "≥ $0.20",
      unconfirmed: true,
      note: null,
    });
    expect(realtimeSessionCostLabel({ totalCostUsd: 0, usageStatus: "unknown", notConnected: false }, fmt)).toEqual({
      amount: "—",
      unconfirmed: true,
      note: null,
    });
    expect(realtimeSessionCostLabel({ totalCostUsd: 0, usageStatus: "complete", notConnected: true }, fmt)).toEqual({
      amount: "$0.00",
      unconfirmed: false,
      note: "not connected",
    });
    expect(realtimeSessionCostLabel({ totalCostUsd: 0.1, usageStatus: "pending", notConnected: false }, fmt).note).toBe(
      "in progress",
    );
  });
});

describe("AiUsageVoiceSurfaceCard", () => {
  it("shows both surfaces and the unconfirmed badge for realtime only", () => {
    render(
      <TooltipProvider>
        <AiUsageVoiceSurfaceCard
          voiceMessages={surface({ spendUsd: 0.05, sessions: 1, unconfirmedSessions: 0, avgDurationSeconds: 95 })}
          realtimeConversation={surface()}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText("Voice: messages vs conversation")).toBeInTheDocument();
    expect(screen.getByText("Voice messages")).toBeInTheDocument();
    expect(screen.getByText("Conversation (realtime)")).toBeInTheDocument();
    expect(screen.getByText("2 with usage not confirmed")).toBeInTheDocument();
    expect(screen.getByText("6m 20s")).toBeInTheDocument();
    expect(screen.getByText("1m 35s")).toBeInTheDocument();
    expect(screen.getAllByText(/with usage not confirmed/)).toHaveLength(1);
    expect(screen.getByText(`≥ ${formatUsd(0.8)}`)).toBeInTheDocument();
    expect(screen.getByText(formatUsd(0.05))).toBeInTheDocument();
  });
});

describe("AiUsageRealtimeSessionsPanel", () => {
  function renderPanel() {
    render(
      <TooltipProvider>
        <AiUsageRealtimeSessionsPanel />
      </TooltipProvider>,
    );
  }

  it("renders each usage status honestly", async () => {
    rpc.mockResolvedValue({
      data: {
        ok: true,
        total: 4,
        rows: [
          row({ id: "a" }),
          row({ id: "b", displayName: "Partial P", usageStatus: "partial", totalCostUsd: 0.2 }),
          row({ id: "c", displayName: "Unknown U", usageStatus: "unknown", totalCostUsd: null }),
          row({ id: "d", displayName: "Never N", notConnected: true, totalCostUsd: 0, endReason: "connect_failed", durationSeconds: 0 }),
        ],
      },
      error: null,
    });
    renderPanel();
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText(formatUsd(0.6))).toBeInTheDocument();
    expect(within(rows[1]).getByText(`≥ ${formatUsd(0.2)}`)).toBeInTheDocument();
    expect(within(rows[1]).getByText("Partial")).toBeInTheDocument();
    // Unknown: total and both parts are "—", never "$0.00"; partial parts are lower bounds.
    expect(within(rows[2]).getAllByText("—")).toHaveLength(3);
    expect(within(rows[2]).queryByText(formatUsd(0))).toBeNull();
    expect(within(rows[1]).getByText(`≥ ${formatUsd(0.5)}`)).toBeInTheDocument();
    expect(within(rows[2]).getByText("Unknown")).toBeInTheDocument();
    expect(within(rows[3]).getByText("not connected")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Didn't connect")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/alex@example\.com/)).toHaveTextContent("Basic");
    // UTC like the rest of AI Usage, whatever the admin's local time zone.
    expect(within(rows[0]).getByText("Oct 15, 2026, 10:00 AM UTC")).toBeInTheDocument();
  });

  it("sends period, plan and usage status filters to the RPC", async () => {
    rpc.mockResolvedValue({ data: { ok: true, total: 0, rows: [] }, error: null });
    renderPanel();
    expect(await screen.findByText("No realtime conversations in this period.")).toBeInTheDocument();
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("admin_ai_realtime_sessions");
    expect(args).toMatchObject({ p_tier: null, p_status: null, p_limit: 25, p_offset: 0 });
    expect(typeof args.p_from).toBe("string");

    fireEvent.click(screen.getByRole("combobox", { name: "Usage status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Unknown" }));
    await waitFor(() => expect(rpc.mock.calls.at(-1)?.[1]).toMatchObject({ p_status: "unknown" }));
  });

  it("shows the RPC error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "not authorized" } });
    renderPanel();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
