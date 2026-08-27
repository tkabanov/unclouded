/** Block 3.35 — deliver Kota's Read to the assigned coach (+ inbox fallback) + admin console. */

import { formatFullCoachBrief } from "./kotaReadBrief.ts";
import { formatScheduledAtLabel } from "./sessionWhenLabel.ts";
import { sendTransactionalEmail } from "./sendgridMail.ts";

export function parseCoachBriefInbox(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.includes("@"));
}

export function normalizeCoachEmail(raw: string | undefined | null): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || !value.includes("@")) return null;
  return value;
}

/**
 * Prefer assigned coach email; fall back to COACH_BRIEF_INBOX list.
 * Returns empty when neither is configured.
 */
export function resolveKotaReadRecipients(params: {
  assignedCoachEmail?: string | null;
  coachBriefInboxEnv?: string | null;
}): { recipients: string[]; source: "assigned_coach" | "inbox" | "none" } {
  const assigned = normalizeCoachEmail(params.assignedCoachEmail);
  if (assigned) {
    return { recipients: [assigned], source: "assigned_coach" };
  }
  const inbox = parseCoachBriefInbox(params.coachBriefInboxEnv);
  if (inbox.length > 0) {
    return { recipients: inbox, source: "inbox" };
  }
  return { recipients: [], source: "none" };
}

export function formatKotaReadDeliveryDetail(
  source: "assigned_coach" | "inbox" | "none",
  recipients: string[],
  sendOk: boolean,
  sendDetail: string,
): string {
  if (!sendOk) {
    if (source === "none" || recipients.length === 0) {
      return "smtp:skipped — assignedCoachEmail and COACH_BRIEF_INBOX not configured";
    }
    return sendDetail;
  }
  const list = recipients.join(",");
  if (source === "assigned_coach") return `sent:assigned:${list}`;
  if (source === "inbox") return `sent:inbox:${list}`;
  return sendDetail.startsWith("sent") ? sendDetail : `sent:${list}`;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildKotaReadEmailSubject(memberName: string): string {
  const name = memberName.trim() || "Member";
  return `Kota's Read — pre-session brief for ${name}`;
}

export function buildKotaReadEmailHtml(params: {
  memberName: string;
  memberEmail?: string | null;
  scheduledAt?: string | null;
  /** IANA TZ for coach-facing scheduled label (CL-4). */
  timeZone?: string | null;
  /** AI Kota's Read section (formatted from kotaReadJson). */
  kotaRead: string;
  /** Factual section (no AI) — classification, scores, mode, paths, etc. */
  factualSection?: string | null;
  adminConsoleUrl: string;
}): string {
  const memberName = escapeHtml(params.memberName.trim() || "Member");
  const memberEmail = params.memberEmail?.trim()
    ? `<p><strong>Email:</strong> ${escapeHtml(params.memberEmail.trim())}</p>`
    : "";
  const scheduledLabel = params.scheduledAt
    ? escapeHtml(formatScheduledAtLabel(params.scheduledAt, params.timeZone))
    : "Not scheduled in app yet";
  const briefBody = params.factualSection?.trim()
    ? formatFullCoachBrief(params.factualSection, params.kotaRead)
    : params.kotaRead;
  const briefHtml = escapeHtml(briefBody).replaceAll("\n", "<br/>");
  const adminUrl = escapeHtml(params.adminConsoleUrl);

  return `
    <p>A Pro/Premium member booked a human coaching session. Kota prepared this private handoff brief.</p>
    <p><strong>Member:</strong> ${memberName}</p>
    ${memberEmail}
    <p><strong>Scheduled:</strong> ${scheduledLabel}</p>
    <hr/>
    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; line-height: 1.5;">
      ${briefHtml}
    </div>
    <hr/>
    <p><a href="${adminUrl}">Open Admin Console → Coach briefs</a></p>
    <p>— Uncloud360</p>
  `.trim();
}

export async function sendKotaReadBriefEmail(params: {
  to: string[];
  deliverySource: "assigned_coach" | "inbox" | "none";
  memberName: string;
  memberEmail?: string | null;
  scheduledAt?: string | null;
  timeZone?: string | null;
  kotaRead: string;
  factualSection?: string | null;
  adminConsoleUrl: string;
  fromAddress?: string;
}): Promise<{ ok: boolean; detail: string }> {
  const recipients = params.to.filter((entry) => entry.includes("@"));
  if (recipients.length === 0) {
    return {
      ok: false,
      detail: formatKotaReadDeliveryDetail(params.deliverySource, [], false, ""),
    };
  }

  const html = buildKotaReadEmailHtml({
    memberName: params.memberName,
    memberEmail: params.memberEmail,
    scheduledAt: params.scheduledAt,
    timeZone: params.timeZone,
    kotaRead: params.kotaRead,
    factualSection: params.factualSection,
    adminConsoleUrl: params.adminConsoleUrl,
  });

  const result = await sendTransactionalEmail({
    to: recipients,
    subject: buildKotaReadEmailSubject(params.memberName),
    html,
    fromEmail: params.fromAddress,
  });

  return {
    ok: result.ok,
    detail: formatKotaReadDeliveryDetail(
      params.deliverySource,
      recipients,
      result.ok,
      result.detail,
    ),
  };
}
