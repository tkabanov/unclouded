/** Block 3.35 — deliver Kota's Read to the PuP coach inbox + admin console. */

export function parseCoachBriefInbox(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.includes("@"));
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
  kotaRead: string;
  adminConsoleUrl: string;
}): string {
  const memberName = escapeHtml(params.memberName.trim() || "Member");
  const memberEmail = params.memberEmail?.trim()
    ? `<p><strong>Email:</strong> ${escapeHtml(params.memberEmail.trim())}</p>`
    : "";
  const scheduledLabel = params.scheduledAt
    ? escapeHtml(new Date(params.scheduledAt).toLocaleString())
    : "Not scheduled in app yet";
  const briefHtml = escapeHtml(params.kotaRead).replaceAll("\n", "<br/>");
  const adminUrl = escapeHtml(params.adminConsoleUrl);

  return `
    <p>A Premium member booked a human coaching session. Kota prepared this private handoff brief.</p>
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
  memberName: string;
  memberEmail?: string | null;
  scheduledAt?: string | null;
  kotaRead: string;
  adminConsoleUrl: string;
  fromAddress?: string;
}): Promise<{ ok: boolean; detail: string }> {
  const recipients = params.to.filter((entry) => entry.includes("@"));
  if (recipients.length === 0) {
    return {
      ok: false,
      detail: "smtp:skipped — COACH_BRIEF_INBOX not configured",
    };
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, detail: "smtp:skipped — RESEND_API_KEY not set" };
  }

  const from = params.fromAddress?.trim() || "noreply@uncloud360.ai";
  const html = buildKotaReadEmailHtml({
    memberName: params.memberName,
    memberEmail: params.memberEmail,
    scheduledAt: params.scheduledAt,
    kotaRead: params.kotaRead,
    adminConsoleUrl: params.adminConsoleUrl,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: buildKotaReadEmailSubject(params.memberName),
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, detail: `resend_error: ${res.status} ${text}` };
  }

  return { ok: true, detail: `sent:${recipients.join(",")}` };
}
