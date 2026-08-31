/**
 * Premium first-time user for CSC-FIRST-* coach selection tests.
 * No completed/past-occurred 1:1 history (coachBooking rows deleted).
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_csc_coach_premium_first_user.mjs
 *
 * Optional: SEED_EMAIL=csc-first@test.com
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

function loadDotEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
loadDotEnvFile(join(here, ".env.local"));
loadDotEnvFile(join(here, ".env"));

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://szkextipgpupqoppccoy.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "qwerty123";
const EMAIL = process.env.SEED_EMAIL ?? "csc-first@test.com";

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

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
      description: "Seeded for CSC first-time coach selection QA.",
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

async function ensureUser(admin, email) {
  const existingId = await findUserIdByEmail(admin, email);
  if (existingId) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existingId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: "CSC" },
    });
    if (updateError) throw new Error(`updateUser: ${updateError.message}`);
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: "CSC" },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  return data.user.id;
}

async function clearCoachBookingHistory(admin, userId) {
  const { error, count } = await admin
    .from("coachBooking")
    .delete({ count: "exact" })
    .eq("userId", userId);
  if (error) throw new Error(`delete coachBooking: ${error.message}`);
  console.log(`  coachBooking rows deleted: ${count ?? 0}`);
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
    const invoiceId = `in_seed_csc_first_${userId.slice(0, 8)}_${Date.now()}_${attempt}`;
    const { data, error } = await admin.rpc("billing_grant_premium_credit", {
      p_user_id: userId,
      p_stripe_invoice_id: invoiceId,
      p_note: "seed_csc_coach_premium_first_user",
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

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding ${EMAIL} (Active Premium, no 1:1 history)...`);
  const userId = await ensureUser(admin, EMAIL);

  const { error: resetError } = await admin.rpc("service_reset_to_individual_free", {
    p_user_id: userId,
  });
  if (resetError) throw new Error(`service_reset_to_individual_free: ${resetError.message}`);

  await clearCoachBookingHistory(admin, userId);

  const { error: profileEntError } = await admin
    .from("profiles")
    .update({
      ...ONBOARDING_PROFILE,
      firstName: "CSC",
      lastName: "First",
    })
    .eq("id", userId);
  if (profileEntError) throw profileEntError;

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 5);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 25);

  const { error: syncError } = await admin.rpc("billing_sync_stripe_subscription", {
    p_user_id: userId,
    p_plan_tier: "premium",
    p_status: "active",
    p_billing_interval: "month",
    p_current_period_start: start.toISOString(),
    p_current_period_end: end.toISOString(),
    p_cancel_at_period_end: false,
    p_stripe_customer_id: `cus_seed_csc_first_${userId.slice(0, 8)}`,
    p_stripe_subscription_id: `sub_seed_csc_first_${userId.slice(0, 8)}`,
    p_stripe_price_id: "price_seed_csc_first",
  });
  if (syncError) throw new Error(`billing_sync premium: ${syncError.message}`);

  await ensurePremiumCreditsForQa(admin, userId, 2);

  const { data: tierRow } = await admin.rpc("effective_user_tier", { p_user_id: userId });
  const { data: balance } = await admin.rpc("available_premium_credits", {
    p_user_id: userId,
  });
  const { count: bookingCount } = await admin
    .from("coachBooking")
    .select("*", { count: "exact", head: true })
    .eq("userId", userId);

  console.log(`  userId: ${userId}`);
  console.log(`  effective_user_tier: ${tierRow}`);
  console.log(`  available_premium_credits: ${balance}`);
  console.log(`  coachBooking count: ${bookingCount ?? 0}`);
  console.log(`  password: ${PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
