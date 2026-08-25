/**
 * One-off Free user for SUB-UP-F2P-001 / Stripe checkout E2E (avoids mutating sub-free@test.com).
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_single_free_checkout_user.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://szkextipgpupqoppccoy.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "qwerty123";
const EMAIL = process.env.SEED_EMAIL ?? "sub-up-f2p-run@test.com";

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
      description: "Seeded for checkout E2E.",
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
      user_metadata: { first_name: "Sub" },
    });
    if (updateError) throw new Error(`updateUser: ${updateError.message}`);
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: "Sub" },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  return data.user.id;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding ${EMAIL} (Free, no Stripe sub)...`);
  const userId = await ensureUser(admin, EMAIL);

  const { error: resetError } = await admin.rpc("service_reset_to_individual_free", {
    p_user_id: userId,
  });
  if (resetError) throw new Error(`service_reset_to_individual_free: ${resetError.message}`);

  const { error: profileEntError } = await admin
    .from("profiles")
    .update({
      ...ONBOARDING_PROFILE,
      firstName: "Sub",
      lastName: "UpProRun",
    })
    .eq("id", userId);
  if (profileEntError) throw profileEntError;

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 5);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 25);

  const { error: syncError } = await admin.rpc("billing_sync_stripe_subscription", {
    p_user_id: userId,
    p_plan_tier: "free",
    p_status: "inactive",
    p_billing_interval: "month",
    p_current_period_start: start.toISOString(),
    p_current_period_end: end.toISOString(),
    p_cancel_at_period_end: false,
    p_stripe_customer_id: null,
    p_stripe_subscription_id: null,
    p_stripe_price_id: null,
  });
  if (syncError) throw new Error(`billing_sync free: ${syncError.message}`);

  const { data: tierRow } = await admin.rpc("effective_user_tier", { p_user_id: userId });
  console.log(`  userId: ${userId}`);
  console.log(`  effective_user_tier: ${tierRow}`);
  console.log(`  password: ${PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
