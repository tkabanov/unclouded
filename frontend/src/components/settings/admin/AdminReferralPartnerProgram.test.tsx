import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AdminReferralPartnerProgram from "@/components/settings/admin/AdminReferralPartnerProgram";
import type { AdminPartnerProgram } from "@/lib/settings/admin/referralProgramAdminApi";

/** NCLDD-56 F-1: the "Linked to … since <date>." sentence never ends with two periods. */

const api = vi.hoisted(() => ({ fetchAdminReferralPartnerProgram: vi.fn() }));
// Lets a test mimic locales whose long date ends with "." (e.g. ru: "14 октября 2026 г.").
const dateFormat = vi.hoisted(() => ({ override: null as string | null }));

vi.mock("@/lib/settings/admin/referralProgramAdminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings/admin/referralProgramAdminApi")>();
  return { ...actual, fetchAdminReferralPartnerProgram: api.fetchAdminReferralPartnerProgram };
});

vi.mock("@/lib/subscription/subscriptionFormat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/subscription/subscriptionFormat")>();
  return {
    ...actual,
    formatSubscriptionDate: (iso: string | null | undefined) =>
      dateFormat.override ?? actual.formatSubscriptionDate(iso),
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const program: AdminPartnerProgram = {
  linkedAccount: { email: "partner@example.com", linkedAt: "2026-10-14T12:00:00Z" },
  terms: [],
  clients: [],
};

function renderProgram() {
  return render(
    <MemoryRouter>
      <AdminReferralPartnerProgram partnerId="p-1" />
    </MemoryRouter>,
  );
}

function linkedSentence() {
  return screen.getByText((_, el) => el?.tagName === "P" && /^Linked to/.test(el.textContent ?? ""));
}

describe("AdminReferralPartnerProgram — linked account sentence", () => {
  beforeEach(() => {
    api.fetchAdminReferralPartnerProgram.mockResolvedValue(program);
  });

  afterEach(() => {
    dateFormat.override = null;
    vi.clearAllMocks();
  });

  it("reads naturally in en-US", async () => {
    renderProgram();
    await screen.findByText("partner@example.com");
    expect(linkedSentence()).toHaveTextContent(
      "Linked to partner@example.com since October 14, 2026. This account sees the Partner portal.",
    );
  });

  it("does not double the period when the date already ends with one", async () => {
    dateFormat.override = "14 октября 2026 г.";
    renderProgram();
    await screen.findByText("partner@example.com");
    expect(linkedSentence().textContent).toBe(
      "Linked to partner@example.com since 14 октября 2026 г. This account sees the Partner portal.",
    );
  });

  it("keeps the period when there is no link date", async () => {
    api.fetchAdminReferralPartnerProgram.mockResolvedValue({
      ...program,
      linkedAccount: { email: "partner@example.com", linkedAt: null },
    });
    renderProgram();
    await screen.findByText("partner@example.com");
    expect(linkedSentence().textContent).toBe(
      "Linked to partner@example.com. This account sees the Partner portal.",
    );
  });
});
