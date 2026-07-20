import { describe, expect, it } from "vitest";
import {
  buildKotaReadEmailHtml,
  buildKotaReadEmailSubject,
  escapeHtml,
  parseCoachBriefInbox,
} from "../../../../../supabase/functions/_shared/kotaReadDelivery.ts";
import { formatCoachBookingDeliveryStatus } from "@/lib/settings/admin/adminCoachBookingsApi";

describe("kotaReadDelivery", () => {
  it("parses coach inbox env into email addresses", () => {
    expect(parseCoachBriefInbox("coach@pup.com, ops@uncloud360.ai")).toEqual([
      "coach@pup.com",
      "ops@uncloud360.ai",
    ]);
    expect(parseCoachBriefInbox("")).toEqual([]);
  });

  it("escapes HTML in brief bodies", () => {
    expect(escapeHtml("<script>alert('x')</script>")).not.toContain("<script>");
  });

  it("builds coach email subject and body", () => {
    const subject = buildKotaReadEmailSubject("Alex");
    const html = buildKotaReadEmailHtml({
      memberName: "Alex",
      memberEmail: "alex@example.com",
      scheduledAt: "2026-07-20T15:00:00.000Z",
      kotaRead: "KOTA'S READ — Coach handoff brief\n\nUnderneath\nSomething deeper.",
      adminConsoleUrl: "https://uncloud360.ai/settings?tab=admin",
    });

    expect(subject).toContain("Alex");
    expect(html).toContain("Alex");
    expect(html).toContain("Admin Console");
    expect(html).toContain("Underneath");
    expect(html).not.toContain("<script>");
  });
});

describe("formatCoachBookingDeliveryStatus", () => {
  it("labels emailed, skipped, and pending states honestly", () => {
    expect(
      formatCoachBookingDeliveryStatus({
        id: "b1",
        userId: "u1",
        scheduledAt: null,
        status: "pending",
        kotaRead: null,
        kotaReadEmailedAt: null,
        kotaReadEmailDetail: null,
        createdAt: "2026-07-20T10:00:00.000Z",
        memberFirstName: "Alex",
        memberEmail: "alex@example.com",
      }),
    ).toBe("Generating…");

    expect(
      formatCoachBookingDeliveryStatus({
        id: "b1",
        userId: "u1",
        scheduledAt: null,
        status: "pending",
        kotaRead: "Brief text",
        kotaReadEmailedAt: "2026-07-20T10:01:00.000Z",
        kotaReadEmailDetail: "sent:coach@pup.com",
        createdAt: "2026-07-20T10:00:00.000Z",
        memberFirstName: "Alex",
        memberEmail: "alex@example.com",
      }),
    ).toBe("Emailed to coach inbox");

    expect(
      formatCoachBookingDeliveryStatus({
        id: "b1",
        userId: "u1",
        scheduledAt: null,
        status: "pending",
        kotaRead: "Brief text",
        kotaReadEmailedAt: null,
        kotaReadEmailDetail: "smtp:skipped — COACH_BRIEF_INBOX not configured",
        createdAt: "2026-07-20T10:00:00.000Z",
        memberFirstName: "Alex",
        memberEmail: "alex@example.com",
      }),
    ).toBe("Brief ready — email not configured");
  });
});
