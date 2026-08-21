/**
 * Seed a platform admin QA account (profiles.roleType = 'admin').
 *
 * User (password: qwerty123):
 *   admin-qa@test.com — platform admin, onboarding complete → /admin
 *
 * Usage (service role key required, do not commit):
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_platform_admin_test_user.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://szkextipgpupqoppccoy.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = "admin-qa@test.com";
const PASSWORD = "qwerty123";

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

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

async function ensureUser(admin) {
  const existingId = await findUserIdByEmail(admin, EMAIL);
  if (existingId) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existingId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: "Admin", last_name: "QA" },
    });
    if (updateError) {
      throw new Error(`updateUser ${EMAIL}: ${updateError.message}`);
    }
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: "Admin", last_name: "QA" },
  });
  if (error) {
    throw new Error(`createUser ${EMAIL}: ${error.message}`);
  }
  return data.user.id;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding ${EMAIL}...`);
  const userId = await ensureUser(admin);

  const completedAt = new Date(Date.now() - 7 * 86400000).toISOString();
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      firstName: "Admin",
      lastName: "QA",
      roleType: "admin",
      roleTypes: [],
      onboardingCompleted: true,
      onboardingCompletedAt: completedAt,
      isActive: true,
      deactivatedAt: null,
    })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`profile ${EMAIL}: ${profileError.message}`);
  }

  const { data: profile, error: readError } = await admin
    .from("profiles")
    .select("id, email, roleType, onboardingCompleted, isActive")
    .eq("id", userId)
    .single();
  if (readError) throw readError;

  console.log("  ok:", profile);
  console.log(`\nLogin: ${EMAIL} / ${PASSWORD}`);
  console.log("Open /admin after sign-in.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
