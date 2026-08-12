import { describe, expect, it } from "vitest";
import {
  buildKotaReadEmailHtml,
  buildKotaReadEmailSubject,
  escapeHtml,
  formatKotaReadDeliveryDetail,
  parseCoachBriefInbox,
  resolveKotaReadRecipients,
} from "../../../../../supabase/functions/_shared/kotaReadDelivery.ts";
import {
  formatCoachBookingDeliveryStatus,
  resolveAdminCoachBriefText,
} from "@/lib/settings/admin/adminCoachBookingsApi";

describe("kotaReadDelivery", () => {
  it("parses coach inbox env into email addresses", () => {
    expect(parseCoachBriefInbox("coach@pup.com, ops@uncloud360.ai")).toEqual([
      "coach@pup.com",
      "ops@uncloud360.ai",
    ]);
    expect(parseCoachBriefInbox("")).toEqual([]);
  });

  it("prefers assigned coach email over COACH_BRIEF_INBOX", () => {
    expect(
      resolveKotaReadRecipients({
        assignedCoachEmail: " assigned@pup.com ",
        coachBriefInboxEnv: "inbox@pup.com",
      }),
    ).toEqual({
      recipients: ["assigned@pup.com"],
      source: "assigned_coach",
    });

    expect(
      resolveKotaReadRecipients({
        assignedCoachEmail: null,
        coachBriefInboxEnv: "inbox@pup.com, ops@uncloud360.ai",
      }),
    ).toEqual({
      recipients: ["inbox@pup.com", "ops@uncloud360.ai"],
      source: "inbox",
    });

    expect(
      resolveKotaReadRecipients({
        assignedCoachEmail: "not-an-email",
        coachBriefInboxEnv: "",
      }),
    ).toEqual({ recipients: [], source: "none" });
  });

  it("formats delivery detail with assigned vs inbox source", () => {
    expect(
      formatKotaReadDeliveryDetail("assigned_coach", ["coach@pup.com"], true, "sent"),
    ).toBe("sent:assigned:coach@pup.com");
    expect(
      formatKotaReadDeliveryDetail("inbox", ["ops@uncloud360.ai"], true, "sent"),
    ).toBe("sent:inbox:ops@uncloud360.ai");
    expect(formatKotaReadDeliveryDetail("none", [], false, "")).toContain("smtp:skipped");
  });

  it("escapes HTML in brief bodies", () => {
    expect(escapeHtml("<script>alert('x')</script>")).not.toContain("<script>");
  });

  it("builds coach email subject and body with factual + Kota's Read", () => {
    const subject = buildKotaReadEmailSubject("Alex");
    const factualSection = [
      "FACTUAL DATA",
      "",
      "Classification: Capacity Erosion",
      "Scores — Stability 2.4, Performance 2.8, Alignment 2.6",
      "Coaching mode: Stabilizer",
      "Active paths: Recovery Roadmap (active, 1 sessions completed)",
      "Open commitment: lights out by 10pm twice",
      "Active flags: none",
      "Sessions completed: 6",
      "Last session date: 2026-07-01",
    ].join("\n");
    const html = buildKotaReadEmailHtml({
      memberName: "Alex",
      memberEmail: "alex@example.com",
      scheduledAt: "2026-07-20T15:00:00.000Z",
      factualSection,
      kotaRead: "KOTA'S READ — Coach handoff brief\n\nUnderneath\nSomething deeper.",
      adminConsoleUrl: "https://uncloud360.ai/admin",
    });

    expect(subject).toContain("Alex");
    expect(html).toContain("Alex");
    expect(html).toContain("Admin Console");
    expect(html).toContain("FACTUAL DATA");
    expect(html).toContain("Classification: Capacity Erosion");
    expect(html).toContain("Scores — Stability 2.4");
    expect(html).toContain("Coaching mode: Stabilizer");
    expect(html).toContain("Sessions completed: 6");
    expect(html).toContain("Last session date: 2026-07-01");
    expect(html).toContain("KOTA'S READ");
    expect(html).toContain("Underneath");
    expect(html).not.toContain("<script>");
  });
});

describe("formatCoachBookingDeliveryStatus", () => {
  const base = {
    id: "b1",
    userId: "u1",
    scheduledAt: null,
    status: "pending",
    assignedCoachEmail: null as string | null,
    createdAt: "2026-07-20T10:00:00.000Z",
    memberFirstName: "Alex",
    memberEmail: "alex@example.com",
  };

  it("labels emailed, skipped, and pending states honestly", () => {
    expect(
      formatCoachBookingDeliveryStatus({
        ...base,
        kotaRead: null,
        kotaReadJson: null,
        kotaReadEmailedAt: null,
        kotaReadEmailDetail: null,
      }),
    ).toBe("Generating…");

    expect(
      formatCoachBookingDeliveryStatus({
        ...base,
        kotaRead: null,
        kotaReadJson: {
          patterns_observed: "- a",
          not_yet_reached: "b",
          be_careful_about: "c",
          most_important_now: "d",
          confidence_note: "e",
        },
        kotaReadEmailedAt: "2026-07-20T10:01:00.000Z",
        kotaReadEmailDetail: "sent:assigned:coach@pup.com",
      }),
    ).toBe("Emailed to assigned coach");

    expect(
      formatCoachBookingDeliveryStatus({
        ...base,
        kotaRead: "Brief text",
        kotaReadJson: null,
        kotaReadEmailedAt: "2026-07-20T10:01:00.000Z",
        kotaReadEmailDetail: "sent:inbox:coach@pup.com",
      }),
    ).toBe("Emailed to coach inbox");

    expect(
      formatCoachBookingDeliveryStatus({
        ...base,
        kotaRead: "Brief text",
        kotaReadJson: null,
        kotaReadEmailedAt: null,
        kotaReadEmailDetail:
          "smtp:skipped — assignedCoachEmail and COACH_BRIEF_INBOX not configured",
      }),
    ).toBe("Brief ready — email not configured");
  });

  it("resolves display text from kotaReadJson preferentially", () => {
    expect(
      resolveAdminCoachBriefText({
        kotaReadJson: {
          patterns_observed: "- json pattern",
          not_yet_reached: "n",
          be_careful_about: "c",
          most_important_now: "m",
          confidence_note: "conf",
        },
        kotaRead: "legacy",
      }),
    ).toContain("json pattern");
  });
});
