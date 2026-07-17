import { sendPasswordResetEmail } from "@/lib/auth/passwordResetApi";
import {
  getTransactionalEmailDefinition,
  type TransactionalEmailDefinition,
  type TransactionalEmailId,
} from "@/lib/email/transactionalEmailCatalog";
import { listModuleUnlockCandidates } from "@/lib/notifications/moduleUnlockNotify";
import { listReassessmentDueCandidates } from "@/lib/reassessment/reassessmentDueNotify";
import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export type TransactionalEmailHookStatus = "sent" | "placeholder" | "skipped";

export interface TransactionalEmailHookPayload {
  userId: string;
  email?: string;
  firstName?: string;
}

export interface TransactionalEmailHookResult {
  emailId: TransactionalEmailId;
  status: TransactionalEmailHookStatus;
  definition: TransactionalEmailDefinition;
  detail?: string;
}

/**
 * Password reset is sent directly from auth UI; this hook exists for catalog parity tests
 * and future server-side triggers.
 */
export async function sendPasswordResetTransactionalEmail(
  email: string,
): Promise<TransactionalEmailHookResult> {
  const definition = getTransactionalEmailDefinition("auth_password_reset");
  await sendPasswordResetEmail(email);
  return { emailId: definition.id, status: "sent", definition };
}

function skippedResult(
  emailId: TransactionalEmailId,
  detail: string,
): TransactionalEmailHookResult {
  const definition = getTransactionalEmailDefinition(emailId);
  return {
    emailId,
    status: "skipped",
    definition,
    detail,
  };
}

function placeholderResult(
  emailId: TransactionalEmailId,
  detail?: string,
): TransactionalEmailHookResult {
  const definition = getTransactionalEmailDefinition(emailId);
  return {
    emailId,
    status: "placeholder",
    definition,
    detail: detail ?? definition.placeholderReason,
  };
}

/**
 * Request a platform transactional email by catalog id.
 * Auth emails with live wiring delegate to lib/auth; everything else returns an honest placeholder.
 */
export async function requestTransactionalEmail(
  emailId: TransactionalEmailId,
  payload: TransactionalEmailHookPayload,
): Promise<TransactionalEmailHookResult> {
  switch (emailId) {
    case "auth_password_reset": {
      if (!payload.email) {
        return placeholderResult(emailId, "Password reset requires email.");
      }
      return sendPasswordResetTransactionalEmail(payload.email);
    }
    case "auth_confirm_signup":
    case "auth_magic_link":
    case "auth_email_change":
    case "auth_invite":
      return skippedResult(
        emailId,
        "Delivered by Supabase Auth templates when the corresponding auth action fires.",
      );
    case "welcome_free_signup":
      return placeholderResult(emailId);
    case "welcome_pro_signup":
    case "welcome_founding_member":
    case "welcome_premium_signup":
    case "billing_confirmation":
    case "payment_failed":
    case "subscription_cancelled":
    case "onboarding_dropoff":
    case "milestone_recovery":
    case "path_completion":
    case "reengagement_7_day_inactive":
    case "group_coaching_reminder":
    case "coaching_session_booked":
    case "notification_module_unlock": {
      const candidates = await listModuleUnlockCandidates();
      const inCohort = candidates.some((candidate) => candidate.userId === payload.userId);
      return placeholderResult(
        emailId,
        inCohort
          ? `User is in unlock cohort (${candidates.length} total). Delivery runs via scheduled edge function module-unlock (Resend when RESEND_API_KEY is set).`
          : `Cohort selected (${candidates.length} due). This user was not due. Production path: cron → module-unlock.`,
      );
    }
    case "notification_daily_checkin":
    case "notification_gidget_nudge":
    case "notification_path_progress":
    case "notification_streak":
      return placeholderResult(emailId);
    case "notification_milestone": {
      const { data, error } = await supabase
        .from("profiles")
        .select("modulesCompletedCount, firstModuleMilestoneEmailedAt")
        .eq("id", payload.userId)
        .maybeSingle();

      if (error && !isSchemaUnavailable(error)) {
        throw error;
      }

      const eligible =
        (data?.modulesCompletedCount ?? 0) === 1 && !data?.firstModuleMilestoneEmailedAt;

      return placeholderResult(
        emailId,
        eligible
          ? "User eligible for first-module milestone. Delivery runs via notification-milestone edge function after completeModule."
          : "User not eligible for first-module milestone (already emailed or count != 1).",
      );
    }
    case "reassessment_90_day":
    case "notification_reassessment_due": {
      // Cohort selection is live. Production send is cron → edge fn reassessment-due (Resend when keyed).
      const candidates = await listReassessmentDueCandidates();
      const inCohort = candidates.some((c) => c.userId === payload.userId);
      return placeholderResult(
        emailId,
        inCohort
          ? `User is in the due cohort (${candidates.length} total). Delivery runs via scheduled edge function reassessment-due (Resend when RESEND_API_KEY is set).`
          : `Cohort selected (${candidates.length} due). This user was not due (or already emailed). Production path: cron → reassessment-due.`,
      );
    }
    default: {
      const exhaustive: never = emailId;
      throw new Error(`Unhandled transactional email id: ${exhaustive}`);
    }
  }
}

/** Fire-and-forget welcome email hook after onboarding completes (US-606 / Section 8). */
export function scheduleWelcomeEmailAfterOnboarding(payload: TransactionalEmailHookPayload): void {
  void requestTransactionalEmail("welcome_free_signup", payload).catch((error: unknown) => {
    console.warn("Welcome transactional email hook failed", error);
  });
}
