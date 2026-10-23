/**
 * Seed NCLDD-56 referral QA accounts (docs/NCLDD-56-test-plan.md §1). Idempotent.
 *
 * Accounts (password: SEED_PASSWORD, required), all confirmed, onboarding complete:
 *   ncldd56-ref-a@test.com     REF-A     Free referrer, share code QAREFA56
 *   ncldd56-ref-b@test.com     REF-B     Free referrer, share code QAREFB56
 *   ncldd56-inv-b1@test.com    INV-B1    signed up with REF-B's code (isolation)
 *   ncldd56-partner-1@test.com PARTNER-1 linked to "QA Partner One" (20% lifetime, confirmed)
 *   ncldd56-partner-2@test.com PARTNER-2 linked to "QA Partner Two" (no terms)
 *   ncldd56-partner-3@test.com           confirmed account for M-32 (admin links "QA Partner Three")
 *   ncldd56-user-x@test.com    USER-X    plain user, no referrals, not a partner
 *   ncldd56-admin@test.com     ADMIN     platform admin (roleType = 'admin')
 *
 * INV-1..3 and PCL-1..2 are not seeded: they sign up through the links during the manual cases.
 *
 * Usage (service role key required, do not commit):
 *   SEED_PASSWORD=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_ncldd56_referral_test_users.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();

if (!SUPABASE_URL) {
  console.error("Missing SUPABASE_URL");
  process.exit(1);
}
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_PASSWORD?.trim();

if (!PASSWORD) {
  console.error("Missing SEED_PASSWORD (password to set on the seeded test accounts)");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const USERS = [
  { key: "REF_A", email: "ncldd56-ref-a@test.com", firstName: "Refa", lastName: "Alphaworth", shareCode: "QAREFA56" },
  { key: "REF_B", email: "ncldd56-ref-b@test.com", firstName: "Refb", lastName: "Betaworth", shareCode: "QAREFB56" },
  { key: "INV_B1", email: "ncldd56-inv-b1@test.com", firstName: "Testa", lastName: "Longsurname", referredBy: "QAREFB56" },
  { key: "PARTNER_1", email: "ncldd56-partner-1@test.com", firstName: "Parta", lastName: "Oneworth" },
  { key: "PARTNER_2", email: "ncldd56-partner-2@test.com", firstName: "Partb", lastName: "Twoworth" },
  { key: "PARTNER_3", email: "ncldd56-partner-3@test.com", firstName: "Partc", lastName: "Threeworth" },
  { key: "USER_X", email: "ncldd56-user-x@test.com", firstName: "User", lastName: "Xavier" },
  { key: "ADMIN", email: "ncldd56-admin@test.com", firstName: "Admin", lastName: "Ncldd", roleType: "admin" },
];

const PARTNERS = [
  {
    name: "QA Partner One",
    email: "ncldd56-partner-1@test.com",
    code: "QAPNRA56",
    linkUser: "PARTNER_1",
    terms: { commissionPercent: 20, scope: "lifetime", note: "NCLDD-56 QA: 20% lifetime" },
  },
  { name: "QA Partner Two", email: "ncldd56-partner-2@test.com", code: "QAPNRB56", linkUser: "PARTNER_2" },
  { name: "QA Partner Three", email: "ncldd56-partner-3@test.com", code: "QAPNRC56", linkUser: null },
];

async function findUserIdByEmail(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(admin, user) {
  const metadata = { first_name: user.firstName, last_name: user.lastName };
  const existingId = await findUserIdByEmail(admin, user.email);
  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw new Error(`updateUser ${user.email}: ${error.message}`);
    return existingId;
  }

  // referral_code in metadata is how the signup trigger attributes an invitee.
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: user.referredBy ? { ...metadata, referral_code: user.referredBy } : metadata,
  });
  if (error) throw new Error(`createUser ${user.email}: ${error.message}`);
  return data.user.id;
}

async function updateProfile(admin, user, userId) {
  const completedAt = new Date(Date.now() - 86400000).toISOString();
  const { error } = await admin
    .from("profiles")
    .update({
      firstName: user.firstName,
      lastName: user.lastName,
      ...(user.roleType ? { roleType: user.roleType } : {}),
      onboardingCompleted: true,
      onboardingCompletedAt: completedAt,
      isActive: true,
      deactivatedAt: null,
    })
    .eq("id", userId);
  if (error) throw new Error(`profile ${user.email}: ${error.message}`);

  if (!user.shareCode) return;
  // The share code is permanent once set; only write it when the profile has none yet.
  const { data: profile, error: readError } = await admin
    .from("profiles")
    .select("referralCode")
    .eq("id", userId)
    .single();
  if (readError) throw readError;
  if (profile.referralCode) {
    if (profile.referralCode !== user.shareCode) {
      console.warn(`  ${user.key}: keeps existing code ${profile.referralCode}`);
    }
    return;
  }
  const { error: codeError } = await admin
    .from("profiles")
    .update({ referralCode: user.shareCode })
    .eq("id", userId);
  if (codeError) throw new Error(`referralCode ${user.email}: ${codeError.message}`);
}

async function ensurePartner(admin, partner, ids) {
  const { data: existing, error: findError } = await admin
    .from("referralPartner")
    .select("id")
    .eq("referralCode", partner.code)
    .maybeSingle();
  if (findError) throw findError;

  const row = {
    name: partner.name,
    type: "coach",
    email: partner.email,
    status: "active",
    referralCode: partner.code,
    userId: partner.linkUser ? ids[partner.linkUser] : null,
    userLinkedAt: partner.linkUser ? new Date().toISOString() : null,
  };
  let partnerId = existing?.id;
  if (partnerId) {
    const { error } = await admin.from("referralPartner").update(row).eq("id", partnerId);
    if (error) throw new Error(`partner ${partner.name}: ${error.message}`);
  } else {
    const { data, error } = await admin.from("referralPartner").insert(row).select("id").single();
    if (error) throw new Error(`partner ${partner.name}: ${error.message}`);
    partnerId = data.id;
  }

  if (partner.terms) {
    const { data: terms, error } = await admin
      .from("referralPartnerTerms")
      .select("id")
      .eq("partnerId", partnerId)
      .eq("status", "confirmed")
      .maybeSingle();
    if (error) throw error;
    if (!terms) {
      const { error: insertError } = await admin.from("referralPartnerTerms").insert({
        partnerId,
        ...partner.terms,
        scopeMonths: null,
        effectiveFrom: new Date().toISOString(),
        confirmedBy: ids.ADMIN,
      });
      if (insertError) throw new Error(`terms ${partner.name}: ${insertError.message}`);
    }
  }
  return partnerId;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Referrers first, so INV-B1's referral_code resolves at signup.
  const ids = {};
  for (const user of USERS) {
    console.log(`Seeding ${user.key} ${user.email}...`);
    ids[user.key] = await ensureUser(admin, user);
    await updateProfile(admin, user, ids[user.key]);
  }

  for (const partner of PARTNERS) {
    console.log(`Seeding partner ${partner.name} (${partner.code})...`);
    await ensurePartner(admin, partner, ids);
  }

  const { data: invitee, error } = await admin
    .from("profiles")
    .select("referredByUserId, referredByReferralCode")
    .eq("id", ids.INV_B1)
    .single();
  if (error) throw error;
  const attributed = invitee.referredByUserId === ids.REF_B;
  console.log(`\nINV-B1 attributed to REF-B: ${attributed ? "yes" : "NO"}`);
  if (!attributed) {
    console.log("  (INV-B1 existed before REF-B had a code; attribution is permanent — delete and re-run)");
  }

  console.log("\nAll accounts use the password from SEED_PASSWORD.");
  console.log("REF-A link: https://uncloud360.vercel.app/signup?ref=QAREFA56");
  console.log("Partner One link: https://uncloud360.vercel.app/signup?ref=QAPNRA56");
  console.log("Partner Two link: https://uncloud360.vercel.app/signup?ref=QAPNRB56");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
