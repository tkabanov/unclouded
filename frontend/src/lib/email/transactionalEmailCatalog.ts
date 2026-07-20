import { TRANSACTIONAL_EMAIL_FROM } from "@/lib/email/branding";

export type TransactionalEmailPriority = "critical" | "high" | "medium";

export type TransactionalEmailChannel = "supabase_auth" | "edge_smtp" | "ops_manual";

export type TransactionalEmailImplementationStatus = "live" | "placeholder";

export type TransactionalEmailSource =
  | "us_606"
  | "phase2_section8"
  | "build_brief_section13"
  | "supabase_auth";

export type TransactionalEmailId =
  | "auth_password_reset"
  | "auth_confirm_signup"
  | "auth_magic_link"
  | "auth_email_change"
  | "auth_invite"
  | "welcome_free_signup"
  | "welcome_pro_signup"
  | "welcome_founding_member"
  | "welcome_premium_signup"
  | "billing_confirmation"
  | "payment_failed"
  | "subscription_cancelled"
  | "onboarding_dropoff"
  | "reassessment_90_day"
  | "milestone_recovery"
  | "path_completion"
  | "reengagement_7_day_inactive"
  | "group_coaching_reminder"
  | "coaching_session_booked"
  | "coach_kota_read_brief"
  | "notification_module_unlock"
  | "notification_daily_checkin"
  | "notification_gidget_nudge"
  | "notification_path_progress"
  | "notification_reassessment_due"
  | "notification_milestone"
  | "notification_streak"
  | "notification_vulnerable_outreach";

export interface TransactionalEmailDefinition {
  id: TransactionalEmailId;
  name: string;
  trigger: string;
  subject: string;
  priority: TransactionalEmailPriority;
  channel: TransactionalEmailChannel;
  status: TransactionalEmailImplementationStatus;
  source: TransactionalEmailSource;
  from: typeof TRANSACTIONAL_EMAIL_FROM;
  /** Honest note when delivery is not wired in this stack slice. */
  placeholderReason?: string;
}

const PLACEHOLDER_EDGE_SMTP =
  "Requires Supabase custom SMTP or edge function + provider; template copy is defined but send is ops-gated.";

/** Canonical catalog — Phase 2 Section 8 + Build Brief Section 13 + Supabase Auth (US-606). */
export const TRANSACTIONAL_EMAIL_CATALOG: readonly TransactionalEmailDefinition[] = [
  {
    id: "auth_password_reset",
    name: "Password reset",
    trigger: "User requests reset (AuthDialog, Settings security)",
    subject: "Reset your Uncloud360 password",
    priority: "critical",
    channel: "supabase_auth",
    status: "live",
    source: "us_606",
    from: TRANSACTIONAL_EMAIL_FROM,
  },
  {
    id: "auth_confirm_signup",
    name: "Confirm signup / verify email",
    trigger: "supabase.auth.signUp when confirmations enabled",
    subject: "Confirm your email to get started with Uncloud360",
    priority: "critical",
    channel: "supabase_auth",
    status: "live",
    source: "supabase_auth",
    from: TRANSACTIONAL_EMAIL_FROM,
  },
  {
    id: "auth_magic_link",
    name: "Magic link sign-in",
    trigger: "Magic link auth (not used in current UI)",
    subject: "Your Uncloud360 sign-in link",
    priority: "medium",
    channel: "supabase_auth",
    status: "live",
    source: "supabase_auth",
    from: TRANSACTIONAL_EMAIL_FROM,
  },
  {
    id: "auth_email_change",
    name: "Email address change",
    trigger: "User updates email in account settings",
    subject: "Confirm your new Uncloud360 email",
    priority: "critical",
    channel: "supabase_auth",
    status: "live",
    source: "supabase_auth",
    from: TRANSACTIONAL_EMAIL_FROM,
  },
  {
    id: "auth_invite",
    name: "User invite",
    trigger: "Admin invite user (future)",
    subject: "You've been invited to Uncloud360",
    priority: "medium",
    channel: "supabase_auth",
    status: "live",
    source: "supabase_auth",
    from: TRANSACTIONAL_EMAIL_FROM,
  },
  {
    id: "welcome_free_signup",
    name: "Welcome — Free signup",
    trigger: "Onboarding complete",
    subject: "Your PuP 360 results are in",
    priority: "critical",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "welcome_pro_signup",
    name: "Welcome — Pro signup",
    trigger: "Stripe subscription.created (Pro)",
    subject: "You're a Pro member. Here's what's unlocked.",
    priority: "critical",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "welcome_founding_member",
    name: "Welcome — Founding Member",
    trigger: "Stripe subscription.created (founding price)",
    subject: "You're a Founding Member. That rate is yours for life.",
    priority: "critical",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "welcome_premium_signup",
    name: "Welcome — Premium signup",
    trigger: "Stripe subscription.created (Premium)",
    subject: "Welcome to Premium. Your full diagnostic picture starts here.",
    priority: "critical",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "billing_confirmation",
    name: "Billing confirmation",
    trigger: "invoice.payment_succeeded",
    subject: "Your Uncloud360 payment was received",
    priority: "critical",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "payment_failed",
    name: "Payment failed",
    trigger: "invoice.payment_failed",
    subject: "There was an issue with your payment",
    priority: "critical",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "subscription_cancelled",
    name: "Subscription cancelled",
    trigger: "subscription.deleted",
    subject: "Your subscription has ended — your data is still here",
    priority: "critical",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "onboarding_dropoff",
    name: "Onboarding drop-off",
    trigger: "Onboarding incomplete after 24hr",
    subject: "Your PuP 360 results are waiting for you",
    priority: "high",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "reassessment_90_day",
    name: "90-day reassessment prompt",
    trigger: "next_reassessment_date reached",
    subject: "Your 90-day check-in is ready",
    priority: "high",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "milestone_recovery",
    name: "Milestone reached — recovery",
    trigger: "days_since_recovery_start milestone",
    subject: "[Milestone name] — your coach has something for you",
    priority: "high",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "path_completion",
    name: "Path completion",
    trigger: "All sessions in path completed",
    subject: "You finished [path name]. That's real.",
    priority: "medium",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "reengagement_7_day_inactive",
    name: "Re-engagement — 7 days inactive",
    trigger: "No session in 7 days",
    subject: "Your coach is here when you're ready",
    priority: "medium",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "group_coaching_reminder",
    name: "Group coaching session reminder",
    trigger: "24 hours before scheduled group session",
    subject: "Your group coaching session is tomorrow",
    priority: "medium",
    channel: "edge_smtp",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "coaching_session_booked",
    name: "Coaching session booked confirmation",
    trigger: "Wix Bookings webhook or manual",
    subject: "Your coaching session is confirmed",
    priority: "medium",
    channel: "ops_manual",
    status: "placeholder",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: "Wix Bookings sends confirmation; Uncloud360 stack does not own this channel yet.",
  },
  {
    id: "coach_kota_read_brief",
    name: "Kota's Read — coach pre-session brief",
    trigger: "Premium member books human coach; generate-kota-read edge fn",
    subject: "Kota's Read — pre-session brief for [member]",
    priority: "high",
    channel: "edge_smtp",
    status: "live",
    source: "phase2_section8",
    from: TRANSACTIONAL_EMAIL_FROM,
  },
  {
    id: "notification_module_unlock",
    name: "Module unlock notification",
    trigger: "Module trigger day reached (Build Brief §13); cron → edge fn module-unlock",
    subject: "Your next layer is ready",
    priority: "high",
    channel: "edge_smtp",
    status: "live",
    source: "build_brief_section13",
    from: TRANSACTIONAL_EMAIL_FROM,
  },
  {
    id: "notification_daily_checkin",
    name: "Daily check-in reminder",
    trigger: "Daily at user preferred time (Build Brief §13)",
    subject: "How are you doing today?",
    priority: "high",
    channel: "edge_smtp",
    status: "placeholder",
    source: "build_brief_section13",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: "Push/in-app preferred on mobile; email variant awaits scheduler + SMTP.",
  },
  {
    id: "notification_gidget_nudge",
    name: "Gidget session nudge",
    trigger: "No session in 5 days (Build Brief §13)",
    subject: "Your coach hasn't heard from you",
    priority: "medium",
    channel: "edge_smtp",
    status: "placeholder",
    source: "build_brief_section13",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "notification_path_progress",
    name: "Path progress nudge",
    trigger: "Path started, no activity 7 days (Build Brief §13)",
    subject: "You started a path — there's a session waiting",
    priority: "medium",
    channel: "edge_smtp",
    status: "placeholder",
    source: "build_brief_section13",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "notification_reassessment_due",
    name: "Reassessment due notification",
    trigger: "90 days from assessment_date (Build Brief §13)",
    subject: "Your PuP 360 reassessment is ready",
    priority: "high",
    channel: "edge_smtp",
    status: "placeholder",
    source: "build_brief_section13",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "notification_milestone",
    name: "Milestone acknowledgment",
    trigger: "First deep-dive module complete (Build Brief §13); client → edge fn notification-milestone",
    subject: "Something's building",
    priority: "medium",
    channel: "edge_smtp",
    status: "live",
    source: "build_brief_section13",
    from: TRANSACTIONAL_EMAIL_FROM,
  },
  {
    id: "notification_streak",
    name: "Streak encouragement",
    trigger: "streak_days = 7, 14, 30 (Build Brief §13)",
    subject: "Days in a row — something's building",
    priority: "medium",
    channel: "edge_smtp",
    status: "placeholder",
    source: "build_brief_section13",
    from: TRANSACTIONAL_EMAIL_FROM,
    placeholderReason: PLACEHOLDER_EDGE_SMTP,
  },
  {
    id: "notification_vulnerable_outreach",
    name: "Vulnerable user re-engagement",
    trigger:
      "grief_mode_active or recovery_mode_active + ≥10 days since last session; daily cron → edge fn vulnerable-outreach",
    subject: "Kota is here when you're ready",
    priority: "high",
    channel: "edge_smtp",
    status: "live",
    source: "build_brief_section13",
    from: TRANSACTIONAL_EMAIL_FROM,
  },
] as const;

const catalogById = new Map(
  TRANSACTIONAL_EMAIL_CATALOG.map((entry) => [entry.id, entry] as const),
);

export function getTransactionalEmailDefinition(
  id: TransactionalEmailId,
): TransactionalEmailDefinition {
  const entry = catalogById.get(id);
  if (!entry) {
    const exhaustive: never = id;
    throw new Error(`Unknown transactional email id: ${exhaustive}`);
  }
  return entry;
}

export function listLiveAuthTransactionalEmails(): TransactionalEmailDefinition[] {
  return TRANSACTIONAL_EMAIL_CATALOG.filter(
    (entry) => entry.channel === "supabase_auth" && entry.status === "live",
  );
}

export function listPlaceholderPlatformEmails(): TransactionalEmailDefinition[] {
  return TRANSACTIONAL_EMAIL_CATALOG.filter((entry) => entry.status === "placeholder");
}
