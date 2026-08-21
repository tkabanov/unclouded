import { describe, expect, it } from "vitest";
import {
  classifyDaySlots,
  isoToLocalInput,
  localInputToIso,
} from "@/lib/settings/admin/adminSpecialistAvailabilityApi";
import { resolveAdminSubTab } from "@/lib/settings/admin/adminNav";
import { ADMIN_SUB_TAB } from "@/lib/settings/admin/adminTabStore";

describe("adminSpecialistAvailabilityApi helpers", () => {
  it("round-trips local datetime-local values through ISO", () => {
    const local = "2026-08-21T09:30";
    const iso = localInputToIso(local);
    expect(iso).toMatch(/Z$/);
    expect(isoToLocalInput(iso)).toBe(local);
  });

  it("marks overlapping bookings as booked and free windows as available", () => {
    const day = new Date();
    day.setHours(12, 0, 0, 0);

    const windowStart = new Date(day);
    windowStart.setHours(9, 0, 0, 0);
    const windowEnd = new Date(day);
    windowEnd.setHours(10, 0, 0, 0);
    const bookedStart = new Date(day);
    bookedStart.setHours(9, 0, 0, 0);

    const slots = classifyDaySlots({
      day,
      availability: [
        {
          availabilityId: "a1",
          specialistId: "s1",
          startsAt: windowStart.toISOString(),
          endsAt: windowEnd.toISOString(),
          durationMinutes: 30,
        },
      ],
      bookings: [
        {
          bookingId: "b1",
          specialistId: "s1",
          scheduledAt: bookedStart.toISOString(),
          status: "confirmed",
          userId: "u1",
        },
      ],
    });

    expect(slots).toHaveLength(2);
    expect(slots[0]?.state).toBe("booked");
    expect(slots[1]?.state).toBe("available");
  });

  it("returns no slots when there is no availability (unavailable day)", () => {
    const day = new Date();
    day.setHours(12, 0, 0, 0);
    expect(
      classifyDaySlots({
        day,
        availability: [],
        bookings: [],
      }),
    ).toEqual([]);
  });
});

describe("adminNav specialists/scheduling", () => {
  it("resolves specialist and scheduling paths", () => {
    expect(resolveAdminSubTab("/admin/specialists")).toBe(ADMIN_SUB_TAB.SPECIALISTS);
    expect(resolveAdminSubTab("/admin/scheduling")).toBe(ADMIN_SUB_TAB.SCHEDULING);
  });
});
