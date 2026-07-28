/**
 * Seed individual (non-enterprise) accounts for subscription / SUB-ENTRY QA.
 *
 * Users (password for all: qwerty123):
 *   sub-free@test.com     — Free, onboarding complete
 *   sub-pro@test.com      — Active Pro (Stripe-synced userSubscription)
 *   sub-premium@test.com  — Active Premium + 2 credits (1:1 bookable)
 *   sub-pro-cancel@test.com — Pro, scheduled to cancel at period end
 *   sub-premium-downgrade@test.com — Premium → Pro downgrade scheduled
 *   sub-fm@test.com — Founding Member (Pro $19 campaign)
 *
 * Also ensures QA premium path `[QA] Premium subscription upsell path` for SUB-ENTRY / SUB-FREE-LOCK-001.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_individual_subscription_test_users.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://szkextipgpupqoppccoy.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "qwerty123";

/** Subscription QA only — not a product path; tier premium for SUB-ENTRY / SUB-FREE-LOCK-001. */
const QA_PREMIUM_PATH_ID = "b0000000-0000-4000-8000-000000000001";
const QA_PREMIUM_SESSION_ID = "b0000000-0000-4000-8000-000000000002";

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const USERS = [
  { email: "sub-free@test.com", firstName: "Sub", lastName: "Free", tier: "free" },
  { email: "sub-pro@test.com", firstName: "Sub", lastName: "Pro", tier: "pro" },
  { email: "sub-premium@test.com", firstName: "Sub", lastName: "Premium", tier: "premium" },
  {
    email: "sub-pro-cancel@test.com",
    firstName: "Sub",
    lastName: "ProCancel",
    tier: "pro",
    lifecycle: "scheduledCancel",
  },
  {
    email: "sub-premium-downgrade@test.com",
    firstName: "Sub",
    lastName: "PremDown",
    tier: "premium",
    lifecycle: "scheduledDowngrade",
  },
  {
    email: "sub-fm@test.com",
    firstName: "Sub",
    lastName: "FM",
    tier: "pro",
    lifecycle: "foundingMember",
    signupPlan: "founding",
  },
];

const ONBOARDING_PROFILE = {
  roleTypes: ["pro"],
  roleType: "pro",
  primaryPillar: "professional",
  stabilityScore: 3.4,
  performanceScore: 3.2,
  alignmentScore: 3.0,
  classification: "building_momentum",
  onboardingCompleted: true,
  onboardingCompletedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  lastAssessmentDate: new Date(Date.now() - 14 * 86400000).toISOString(),
  nextReassessmentDate: new Date(Date.now() + 76 * 86400000).toISOString(),
  onboardingData: {
    stabilityScores: { stability_score: 3.4 },
    performanceScores: { performance_score: 3.2 },
    alignmentScores: { alignment_score: 3.0 },
    orientationScore: 3.2,
    classification: "building_momentum",
  },
  results: {
    stability_score: 3.4,
    performance_score: 3.2,
    alignment_score: 3.0,
    orientation_score: 3.2,
    classification: {
      key: "building_momentum",
      name: "Building Momentum",
      description: "Seeded for subscription QA.",
      focusAreas: ["Protect habits", "Stretch goals", "Sustain progress"],
    },
    recovery_mode_active: false,
    grief_mode_active: false,
  },
  modulesCompletedCount: 0,
  dailyCheckInStreak: 0,
  streakDays: 0,
};

async function findUserIdByEmail(admin, email) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureUser(admin, email, firstName) {
  const existingId = await findUserIdByEmail(admin, email);
  if (existingId) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existingId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: firstName },
    });
    if (updateError) {
      throw new Error(`updateUser ${email}: ${updateError.message}`);
    }
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });

  if (error) {
    throw new Error(`createUser ${email}: ${error.message}`);
  }

  return data.user.id;
}

function periodBounds() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 5);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 25);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function syncSubscription(admin, userId, tier) {
  const { start, end } = periodBounds();

  if (tier === "free") {
    const { error } = await admin.rpc("billing_sync_stripe_subscription", {
      p_user_id: userId,
      p_plan_tier: "free",
      p_status: "inactive",
      p_billing_interval: "month",
      p_current_period_start: start,
      p_current_period_end: end,
      p_cancel_at_period_end: false,
      p_stripe_customer_id: null,
      p_stripe_subscription_id: null,
      p_stripe_price_id: null,
    });
    if (error) throw new Error(`billing_sync free ${userId}: ${error.message}`);
    return end;
  }

  const { error } = await admin.rpc("billing_sync_stripe_subscription", {
    p_user_id: userId,
    p_plan_tier: tier,
    p_status: "active",
    p_billing_interval: "month",
    p_current_period_start: start,
    p_current_period_end: end,
    p_cancel_at_period_end: false,
    p_stripe_customer_id: `cus_seed_${tier}_${userId.slice(0, 8)}`,
    p_stripe_subscription_id: `sub_seed_${tier}_${userId.slice(0, 8)}`,
    p_stripe_price_id: `price_seed_${tier}`,
  });
  if (error) throw new Error(`billing_sync ${tier} ${userId}: ${error.message}`);
  return end;
}

async function ensurePremiumCreditsForQa(admin, userId, targetBalance = 2) {
  const { data: initialBalance, error: balanceError } = await admin.rpc(
    "available_premium_credits",
    { p_user_id: userId },
  );
  if (balanceError) {
    throw new Error(`available_premium_credits ${userId}: ${balanceError.message}`);
  }

  let balance = typeof initialBalance === "number" ? initialBalance : Number(initialBalance ?? 0);
  let attempt = 0;

  while (balance < targetBalance && attempt < targetBalance + 8) {
    attempt += 1;
    const invoiceId = `in_seed_individual_qa_${userId.slice(0, 8)}_${Date.now()}_${attempt}`;
    const { data, error } = await admin.rpc("billing_grant_premium_credit", {
      p_user_id: userId,
      p_stripe_invoice_id: invoiceId,
      p_note: "seed_individual_subscription_test_users",
    });
    if (error) throw new Error(`grant credit ${userId}: ${error.message}`);
    const nextBalance =
      typeof data?.balance === "number" ? data.balance : Number(data?.balance ?? balance);
    console.log(`  credit grant ${attempt}:`, data);
    if (nextBalance <= balance) break;
    balance = nextBalance;
  }

  if (balance < targetBalance) {
    throw new Error(
      `premium QA credits: wanted ${targetBalance}, got ${balance} for ${userId}`,
    );
  }
}

async function ensureQaPremiumPath(admin) {
  const { data: existing, error: readError } = await admin
    .from("path")
    .select("id, tier")
    .eq("id", QA_PREMIUM_PATH_ID)
    .maybeSingle();

  if (readError) throw readError;

  if (!existing) {
    const { error: pathError } = await admin.from("path").insert({
      id: QA_PREMIUM_PATH_ID,
      name: "[QA] Premium subscription upsell path",
      description: "Internal QA catalog entry for Premium-tier upsell tests only.",
      tier: "premium",
      pillar: "professional",
      subMode: "general_professional",
      sessionsCount: 1,
      classifications: "Any classification",
      triggerSignals: "qa:subscription_upsell",
    });
    if (pathError) throw pathError;

    const { error: sessionError } = await admin.from("pathSession").insert({
      id: QA_PREMIUM_SESSION_ID,
      pathId: QA_PREMIUM_PATH_ID,
      index: 1,
      title: "QA session",
      coachingText: "Placeholder session for subscription QA.",
      microCommitment: "N/A — QA path.",
    });
    if (sessionError) throw sessionError;
    console.log("Inserted QA premium path for subscription upsell tests.");
  } else if (existing.tier !== "premium") {
    const { error: tierError } = await admin
      .from("path")
      .update({ tier: "premium" })
      .eq("id", QA_PREMIUM_PATH_ID);
    if (tierError) throw tierError;
  }
}

async function clearEnterpriseEntitlement(admin, userId) {
  const { error } = await admin
    .from("profiles")
    .update({
      accountType: "individual",
      enterpriseTier: null,
      subscribed: false,
      tier: "free",
    })
    .eq("id", userId);

  if (error) throw error;
}

async function applyLifecycle(admin, userId, spec, periodEndIso) {
  if (spec.lifecycle === "scheduledCancel") {
    const { error } = await admin.rpc("billing_set_cancel_at_period_end", {
      p_user_id: userId,
      p_cancel: true,
    });
    if (error) throw new Error(`scheduled cancel ${userId}: ${error.message}`);
    return;
  }

  if (spec.lifecycle === "scheduledDowngrade") {
    const { error } = await admin.rpc("billing_schedule_downgrade", {
      p_user_id: userId,
      p_target_tier: "pro",
      p_effective_at: periodEndIso,
    });
    if (error) throw new Error(`scheduled downgrade ${userId}: ${error.message}`);
    return;
  }

  if (spec.lifecycle === "foundingMember") {
    const { data, error } = await admin.rpc("billing_start_founding_member", {
      p_user_id: userId,
    });
    if (error) throw new Error(`founding member ${userId}: ${error.message}`);
    if (data?.status === "campaign_full") {
      throw new Error(`founding member slot cap reached for ${userId}`);
    }
    console.log("  founding member slot:", data);
  }
}

async function applyProfile(admin, userId, spec) {
  const { error } = await admin
    .from("profiles")
    .update({
      ...ONBOARDING_PROFILE,
      firstName: spec.firstName,
      lastName: spec.lastName,
      ...(spec.signupPlan ? { signupPlan: spec.signupPlan } : {}),
    })
    .eq("id", userId);

  if (error) throw error;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await ensureQaPremiumPath(admin);

  for (const spec of USERS) {
    console.log(`\nSeeding ${spec.email} (${spec.tier})...`);
    const userId = await ensureUser(admin, spec.email, spec.firstName);
    await clearEnterpriseEntitlement(admin, userId);
    await applyProfile(admin, userId, spec);
    const periodEnd = await syncSubscription(admin, userId, spec.tier);
    await applyLifecycle(admin, userId, spec, periodEnd);

    if (spec.tier === "premium") {
      await ensurePremiumCreditsForQa(admin, userId, 2);
    }

    const { data: tierRow } = await admin.rpc("effective_user_tier", { p_user_id: userId });
    console.log(`  effective_user_tier: ${tierRow}`);

    if (spec.tier === "premium") {
      const { data: balance } = await admin.rpc("available_premium_credits", {
        p_user_id: userId,
      });
      console.log(`  available_premium_credits: ${balance}`);
    }
  }

  console.log("\nDone. Login password for all: qwerty123");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
