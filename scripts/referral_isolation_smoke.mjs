/**
 * NCLDD-56 A8 — live access-isolation smoke for the referral program.
 *
 * Signs in as several TEST users and calls the referral RPCs / tables directly,
 * asserting each user sees only their own data and non-admins get 42501.
 * Read-only except for one INSERT attempt into "coachBooking" that must be denied.
 *
 * Run against a TEST environment only, after the NCLDD-56 migrations are applied:
 *   SUPABASE_URL=https://<project>.supabase.co \
 *   SUPABASE_ANON_KEY=... \
 *   REF_A_EMAIL=... REF_A_PASSWORD=... \
 *   REF_B_EMAIL=... REF_B_PASSWORD=... \
 *   PARTNER_1_EMAIL=... PARTNER_1_PASSWORD=... \
 *   USER_X_EMAIL=... USER_X_PASSWORD=... \
 *   node scripts/referral_isolation_smoke.mjs
 *
 * Optional: ADMIN_EMAIL / ADMIN_PASSWORD — checks the admin RPCs succeed for an admin.
 */
import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim();

const USERS = ["REF_A", "REF_B", "PARTNER_1", "USER_X"];
const missing = [
  ["SUPABASE_URL", SUPABASE_URL],
  ["SUPABASE_ANON_KEY", ANON_KEY],
  ...USERS.flatMap((u) => [
    [`${u}_EMAIL`, process.env[`${u}_EMAIL`]],
    [`${u}_PASSWORD`, process.env[`${u}_PASSWORD`]],
  ]),
]
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missing.length > 0) {
  console.error(`Missing: ${missing.join(", ")}`);
  process.exit(1);
}

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const EMAIL_RE = /[^\s"@]+@[^\s"@]+\.[a-z]{2,}/i;

const ADMIN_RPCS = [
  ["admin_referral_partner_metrics", {}],
  ["admin_get_user_referral_stats", { p_user_id: ZERO_UUID }],
  ["admin_get_referral_partner_program", { p_partner_id: ZERO_UUID }],
  ["admin_link_referral_partner_user", { p_partner_id: ZERO_UUID, p_email: "nobody@example.com" }],
  ["admin_list_coaching_bookings", {}],
];
const PRIVATE_TABLES = [
  "referralAttribution",
  "referralCoachCreditLedger",
  "referralPartnerCommission",
  "referralPartnerTerms",
  "referralLinkClick",
  "billingInvoicePayment",
];

let failures = 0;
function check(id, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}${detail ? ` — ${detail}` : ""}`);
}

function newClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(prefix) {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env[`${prefix}_EMAIL`],
    password: process.env[`${prefix}_PASSWORD`],
  });
  if (error) throw new Error(`${prefix}: sign-in failed (${error.message})`);
  return { client, userId: data.user.id };
}

function inviteeKeys(overview) {
  return new Set((overview?.invitees ?? []).map((i) => `${i.displayName}|${i.joinedAt}`));
}

/** Masked payloads must not leak emails or other users' ids. */
function leaks(payload, ownId) {
  const text = JSON.stringify(payload ?? null).replaceAll(ownId, "");
  const out = [];
  if (EMAIL_RE.test(text)) out.push("email");
  if (UUID_RE.test(text.replace(/"id":"[^"]+"/g, ""))) out.push("uuid");
  return out;
}

async function main() {
  const anon = newClient();
  const sessions = {};
  for (const prefix of USERS) sessions[prefix] = await signIn(prefix);

  // M-48: overview is per-user.
  const overviews = {};
  for (const prefix of USERS) {
    const { client, userId } = sessions[prefix];
    const { data, error } = await client.rpc("get_my_referral_overview");
    check(`M-48 ${prefix} get_my_referral_overview`, !error && data != null, error?.message);
    overviews[prefix] = data;
    const leaked = leaks(data?.invitees, userId);
    check(`M-48 ${prefix} invitees masked`, leaked.length === 0, leaked.join(", "));
  }
  check(
    "M-48 REF_A / REF_B codes differ",
    overviews.REF_A?.code && overviews.REF_A.code !== overviews.REF_B?.code,
  );
  const a = inviteeKeys(overviews.REF_A);
  const shared = [...inviteeKeys(overviews.REF_B)].filter((k) => a.has(k));
  check("M-48 REF_B sees none of REF_A invitees", shared.length === 0, shared.join("; "));

  // M-49: portal only for the linked partner, own data only.
  {
    const { client, userId } = sessions.PARTNER_1;
    const { data, error } = await client.rpc("get_my_referral_partner_portal");
    check("M-49 PARTNER_1 portal returned", !error && data?.partner != null, error?.message);
    const leaked = leaks(data, userId);
    check("M-49 PARTNER_1 portal has no emails / foreign ids", leaked.length === 0, leaked.join(", "));
  }
  for (const prefix of ["REF_A", "USER_X"]) {
    const { data, error } = await sessions[prefix].client.rpc("get_my_referral_partner_portal");
    check(`M-34/M-49 ${prefix} has no portal`, !error && data == null, error?.message ?? JSON.stringify(data));
  }

  // M-50: admin RPCs are 42501 for non-admins.
  for (const prefix of USERS) {
    for (const [fn, args] of ADMIN_RPCS) {
      const { error } = await sessions[prefix].client.rpc(fn, args);
      check(`M-50 ${prefix} ${fn} denied`, error?.code === "42501", error ? error.code : "no error");
    }
  }

  // M-51: anon is denied.
  for (const fn of ["get_my_referral_overview", "get_my_referral_partner_portal"]) {
    const { data, error } = await anon.rpc(fn);
    check(`M-51 anon ${fn} denied`, error != null, error ? error.code : JSON.stringify(data));
  }

  // M-52: private tables are not readable directly.
  for (const prefix of USERS) {
    for (const table of PRIVATE_TABLES) {
      const { data, error } = await sessions[prefix].client.from(table).select("*").limit(1);
      check(
        `M-52 ${prefix} select ${table}`,
        error != null || (data ?? []).length === 0,
        error ? error.code : `${data.length} row(s)`,
      );
    }
  }

  // M-53: direct booking INSERT is denied (row would be invalid anyway; must fail on privileges/RLS).
  {
    const { client, userId } = sessions.REF_A;
    const { error } = await client
      .from("coachBooking")
      .insert({ userId, paymentSource: "referral_credit" });
    check(
      "M-53 REF_A insert coachBooking denied",
      error != null && ["42501", "PGRST301"].includes(error.code),
      error ? `${error.code} ${error.message}` : "insert succeeded",
    );
  }

  // Optional: admin sees analytics.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const { client } = await signIn("ADMIN");
    const { error } = await client.rpc("admin_referral_partner_metrics");
    check("ADMIN admin_referral_partner_metrics allowed", error == null, error?.message);
    await client.auth.signOut();
  }

  for (const prefix of USERS) await sessions[prefix].client.auth.signOut();
  console.log(failures === 0 ? "\nA8 isolation smoke: ALL PASS" : `\nA8 isolation smoke: ${failures} FAIL`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
