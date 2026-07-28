/**
 * Seed code2@test.com … code5@test.com with completed onboarding,
 * optional path progress, and daily check-ins.
 *
 * Usage (service role key required, do not commit):
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_code_test_users.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://szkextipgpupqoppccoy.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const PATHS = {
  focus: {
    id: "996337fe-0a1b-5d13-9052-87fd77415197",
    sessionsCount: 7,
    sessions: [
      "cb29aeb4-c674-57d9-b4f1-92ab9f5a0ee5",
      "4ea17a52-2cf6-5414-a97c-fccd9cc8c2d0",
      "d47c5ab0-25b6-5eee-9fcd-4684d53fd32f",
      "9f0dc71d-f477-5fef-9046-2b6e8206bb71",
      "3f619a4b-ff34-5fd5-a4fc-8fb528ed52f7",
      "28a14803-6625-52a1-99c6-dc836e3aeccc",
      "aedcbb38-0cda-52d6-9ce4-6e1f640749d9",
    ],
  },
  burnout: {
    id: "23c1f8da-4f08-51c0-bcc0-e4ed845a5b7e",
    sessionsCount: 6,
    sessions: [
      "e3fb4e4d-f09d-5696-b35a-f9b492c4df3b",
      "41101983-f03e-5854-bb45-ec64b1f1b42a",
      "4353d4be-f1c3-5a0d-ae64-ca01e6d52bdc",
      "4b76140a-d1ca-59e6-a99b-f36ce2b4200e",
      "ba89b88f-429d-5d25-ae65-7921a5ba5807",
      "17aa4766-f8b6-5aae-9720-5673f4f8ebc8",
    ],
  },
  hardSeasons: {
    id: "fd060ad2-064d-5c57-82bb-92d0dcba3dd2",
    sessionsCount: 6,
    sessions: [
      "ff199e57-67ec-580e-a13c-9732f1e28955",
      "3ccfdeb3-4652-548b-a0dc-2849fda4d07e",
      "9b949f2c-bd68-570f-99ad-9f074135189d",
      "75ccf166-657f-511a-80f2-cd71bb15881e",
      "7a7ead6c-1847-5bef-89e1-e33bc292ecce",
      "45009548-7a71-58ad-9da9-2616f3f26066",
    ],
  },
  dailyStructure: {
    id: "a144fb82-a164-58a1-b777-d756b88785ec",
    sessionsCount: 6,
    sessions: [
      "73ebb1a3-da7a-50d1-9c7e-e76b2562352a",
      "8613cb9c-f33a-50cc-ba5b-b8963b780481",
      "8917ec65-cffa-543d-bdfb-f72b9c6358d0",
      "62103e33-3d2c-5b6f-95e9-553e62847f4f",
      "32a3f8a1-f216-5019-8cec-5ce6f359bae9",
      "53d12b2c-41d8-5eb9-ae4c-af7cca998c8a",
    ],
  },
};

const ONBOARDING_VARIANTS = [
  {
    loadSignals: {
      cognitive_load_signal: "mind_feels_clear_most_of_the_time",
      relational_load_signal: "relationships_feel_mostly_supportive",
      environmental_load_signal: "life_feels_mostly_manageable",
      financial_load_signal: "financial_situation_feels_stable",
    },
    stateSignals: { nervous_system_state: "regulated", energy_level_signal: "strong" },
    behavioralPatterns: {
      pressure_response_pattern: "push_through",
      non_followthrough_reason: "unclear_priorities",
    },
    healthFlags: {
      selected_flags: ["none_of_the_above"],
      health_none_of_the_above: true,
      recovery_mode_active: false,
      grief_mode_active: false,
    },
    scores: { stability: 4.2, performance: 3.8, alignment: 4.0, orientation: 4 },
    classificationKey: "building_momentum",
  },
  {
    loadSignals: {
      cognitive_load_signal: "mental_clarity_is_inconsistent",
      relational_load_signal: "some_relationships_are_draining_right_now",
      environmental_load_signal: "managing_but_it_takes_effort",
      financial_load_signal: "some_financial_stress_but_manageable",
    },
    stateSignals: { nervous_system_state: "activated", energy_level_signal: "moderate" },
    behavioralPatterns: {
      pressure_response_pattern: "seek_help",
      non_followthrough_reason: "overwhelm",
    },
    healthFlags: {
      selected_flags: ["none_of_the_above"],
      health_none_of_the_above: true,
      recovery_mode_active: false,
      grief_mode_active: false,
    },
    scores: { stability: 3.2, performance: 3.0, alignment: 3.4, orientation: 3 },
    classificationKey: "performance_stagnation",
  },
  {
    loadSignals: {
      cognitive_load_signal: "head_rarely_feels_quiet___constant",
      relational_load_signal: "significant_conflict_or_strain_in_key_relationships",
      environmental_load_signal: "overwhelmed_by_practical_demands",
      financial_load_signal: "financial_stress_is_significant_daily_presence",
    },
    stateSignals: { nervous_system_state: "shut_down", energy_level_signal: "low" },
    behavioralPatterns: {
      pressure_response_pattern: "withdraw",
      non_followthrough_reason: "overwhelm",
    },
    healthFlags: {
      selected_flags: ["i_m_navigating_an_eating_or_body_image_challenge"],
      health_flag3: true,
      health_none_of_the_above: false,
      recovery_mode_active: false,
      grief_mode_active: false,
    },
    scores: { stability: 2.6, performance: 2.4, alignment: 3.0, orientation: 3 },
    classificationKey: "capacity_erosion",
  },
  {
    loadSignals: {
      cognitive_load_signal: "hard_to_focus_for_long_stretches",
      relational_load_signal: "relationships_feel_mostly_supportive",
      environmental_load_signal: "life_feels_mostly_manageable",
      financial_load_signal: "some_financial_stress_but_manageable",
    },
    stateSignals: { nervous_system_state: "regulated", energy_level_signal: "moderate" },
    behavioralPatterns: {
      pressure_response_pattern: "slow_down",
      non_followthrough_reason: "competing_priorities",
    },
    healthFlags: {
      selected_flags: ["none_of_the_above"],
      health_none_of_the_above: true,
      recovery_mode_active: false,
      grief_mode_active: false,
    },
    scores: { stability: 3.6, performance: 3.2, alignment: 3.8, orientation: 4 },
    classificationKey: "building_momentum",
  },
];

const CLASSIFICATIONS = {
  capacity_erosion: {
    key: "capacity_erosion",
    name: "Capacity Erosion",
    description:
      "Your internal capacity is being stretched beyond what's sustainable right now. This isn't a character flaw — it's a system under load. The first priority is stabilization, not optimization.",
    focusAreas: [
      "Reduce cognitive and emotional load before adding new goals",
      "Rebuild daily recovery rituals that actually stick",
      "Identify the 1–2 changes that create the most relief fastest",
    ],
  },
  performance_stagnation: {
    key: "performance_stagnation",
    name: "Performance Stagnation",
    description:
      "You have the foundation, but forward motion has stalled. This isn't laziness — it's a signal that something in your system needs recalibrating. Clarity and follow-through are your leverage points.",
    focusAreas: [
      "Identify what's blocking consistent execution",
      "Rebuild clarity on the next right move",
      "Create accountability structures that match how you actually work",
    ],
  },
  building_momentum: {
    key: "building_momentum",
    name: "Building Momentum",
    description:
      "You're in a growth phase — capacity is returning and forward motion is possible. The opportunity now is to channel that energy into sustainable progress rather than unsustainable sprints.",
    focusAreas: [
      "Protect the habits that are working",
      "Set goals that stretch without breaking",
      "Build systems that sustain progress when motivation dips",
    ],
  },
};

const USER_SPECS = [
  {
    email: "code2@test.com",
    firstName: "Alex",
    lastName: "Rivera",
    primaryPillar: "emotional",
    roleTypes: ["pro"],
    variantIndex: 0,
    paths: [],
    checkinDays: 0,
  },
  {
    email: "code3@test.com",
    firstName: "Jordan",
    lastName: "Lee",
    primaryPillar: "professional",
    roleTypes: ["student"],
    variantIndex: 1,
    paths: [{ key: "focus", status: "active", completedSessions: 3 }],
    checkinDays: 4,
  },
  {
    email: "code4@test.com",
    firstName: "Sam",
    lastName: "Taylor",
    primaryPillar: "health",
    roleTypes: ["caregiver"],
    variantIndex: 2,
    paths: [{ key: "burnout", status: "completed", completedSessions: 6 }],
    checkinDays: 5,
  },
  {
    email: "code5@test.com",
    firstName: "Riley",
    lastName: "Chen",
    primaryPillar: "emotional",
    roleTypes: ["transition"],
    variantIndex: 3,
    paths: [
      { key: "hardSeasons", status: "completed", completedSessions: 6 },
      { key: "dailyStructure", status: "active", completedSessions: 2 },
    ],
    checkinDays: 3,
  },
];

const FEELING_WORDS = ["calm", "steady", "tired", "hopeful", "anxious", "focused", "grateful"];
const REFLECTIONS = [
  "Taking things one step at a time today.",
  "Energy was lower than usual but I showed up anyway.",
  "Felt more grounded after a short walk.",
  "Work felt heavy; trying to protect some recovery time.",
  "A good conversation helped reset my mood.",
];

function randomScores(base) {
  const jitter = () => Math.max(1, Math.min(5, Math.round((base + (Math.random() * 1.2 - 0.6)) * 10) / 10));
  return {
    sq1: jitter(),
    sq2: jitter(),
    sq3: jitter(),
    sq4: jitter(),
    sq5: jitter(),
    stability_score: base.stability,
    pq1: jitter(),
    pq2: jitter(),
    pq3: jitter(),
    pq4: jitter(),
    pq5: jitter(),
    performance_score: base.performance,
    aq1: jitter(),
    aq2: jitter(),
    aq3: jitter(),
    aq4: jitter(),
    aq5: jitter(),
    alignment_score: base.alignment,
  };
}

function buildModuleSchedules(completedAt) {
  const day = (offset) => new Date(completedAt.getTime() + offset * 86400000).toISOString();
  return {
    financial: { unlockedAt: null, completedAt: null, scheduledAt: day(0) },
    body: { unlockedAt: null, completedAt: null, scheduledAt: day(3) },
    identity: { unlockedAt: null, completedAt: null, scheduledAt: day(7) },
    relational: { unlockedAt: null, completedAt: null, scheduledAt: day(7) },
    history: { unlockedAt: null, completedAt: null, scheduledAt: day(14) },
    meaning: { unlockedAt: null, completedAt: null, scheduledAt: day(28) },
  };
}

function buildProfilePayload(spec, variant) {
  const completedAt = new Date(Date.now() - (7 + spec.variantIndex) * 86400000);
  const scoreRows = randomScores(variant.scores);
  const classification = CLASSIFICATIONS[variant.classificationKey];

  const onboardingData = {
    stabilityScores: {
      sq1: scoreRows.sq1,
      sq2: scoreRows.sq2,
      sq3: scoreRows.sq3,
      sq4: scoreRows.sq4,
      sq5: scoreRows.sq5,
      stability_score: variant.scores.stability,
    },
    performanceScores: {
      pq1: scoreRows.pq1,
      pq2: scoreRows.pq2,
      pq3: scoreRows.pq3,
      pq4: scoreRows.pq4,
      pq5: scoreRows.pq5,
      performance_score: variant.scores.performance,
    },
    alignmentScores: {
      aq1: scoreRows.aq1,
      aq2: scoreRows.aq2,
      aq3: scoreRows.aq3,
      aq4: scoreRows.aq4,
      aq5: scoreRows.aq5,
      alignment_score: variant.scores.alignment,
    },
    orientationScore: variant.scores.orientation,
    loadSignals: variant.loadSignals,
    stateSignals: variant.stateSignals,
    behavioralPatterns: variant.behavioralPatterns,
    healthFlags: variant.healthFlags,
    modules_completed_count_number: 0,
    stabilityScore: variant.scores.stability,
    performanceScore: variant.scores.performance,
    alignmentScore: variant.scores.alignment,
    classification: variant.classificationKey,
    pressureProfile: "Seeded test profile",
    ai_coaching_mode_os: "stabilizer",
    "ai_coaching_mode_list_list_option_ai_coaching_mode_os": ["stabilizer", "simplifier"],
  };

  const results = {
    stability_score: variant.scores.stability,
    performance_score: variant.scores.performance,
    alignment_score: variant.scores.alignment,
    orientation_score: variant.scores.orientation,
    pressure_profile: "Seeded test profile",
    tradeoff_statement: "Small, targeted adjustments will move the needle faster than a complete overhaul.",
    classification,
    recovery_mode_active: false,
    grief_mode_active: false,
    trauma_informed_mode: false,
    first_module: "Financial Reality",
    module_days: 0,
  };

  return {
    firstName: spec.firstName,
    lastName: spec.lastName,
    roleTypes: spec.roleTypes,
    roleType: spec.roleTypes[0],
    primaryPillar: spec.primaryPillar,
    stabilityScore: variant.scores.stability,
    performanceScore: variant.scores.performance,
    alignmentScore: variant.scores.alignment,
    classification: variant.classificationKey,
    onboardingCompleted: true,
    onboardingCompletedAt: completedAt.toISOString(),
    lastAssessmentDate: completedAt.toISOString(),
    nextReassessmentDate: new Date(completedAt.getTime() + 90 * 86400000).toISOString(),
    onboardingData,
    results,
    moduleSchedules: buildModuleSchedules(completedAt),
    modulesCompletedCount: 0,
    dailyCheckInStreak: spec.checkinDays,
    streakDays: spec.checkinDays,
  };
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

async function ensureUser(admin, email) {
  const existingId = await findUserIdByEmail(admin, email);
  if (existingId) {
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "qwerty123",
    email_confirm: true,
    user_metadata: { first_name: email.split("@")[0] },
  });

  if (error) {
    throw new Error(`createUser ${email}: ${error.message}`);
  }

  return data.user.id;
}

async function seedPaths(admin, userId, pathSpecs) {
  await admin.from("pathEnrollment").delete().eq("userId", userId);

  for (const pathSpec of pathSpecs) {
    const path = PATHS[pathSpec.key];
    if (!path) throw new Error(`Unknown path key: ${pathSpec.key}`);

    const completedCount = pathSpec.completedSessions;
    const isCompleted = pathSpec.status === "completed";
    const currentSessionId =
      isCompleted || completedCount >= path.sessionsCount
        ? null
        : path.sessions[completedCount] ?? path.sessions[path.sessions.length - 1];

    const { error: insertError } = await admin.from("pathEnrollment").insert({
      userId,
      pathId: path.id,
      status: isCompleted ? "completed" : "active",
      completedSessionsCount: completedCount,
      currentSessionId,
      focusedMicroCommitmentSessionId: null,
      isMicroCommitmentInFocus: false,
      completedMicroCommitmentSessionIds: [],
    });
    if (insertError) throw insertError;
  }
}

async function seedCheckins(admin, userId, days) {
  if (days <= 0) return;

  await admin.from("dailyCheckin").delete().eq("userId", userId);

  const rows = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    date.setUTCHours(12, 0, 0, 0);
    rows.push({
      userId,
      date: date.toISOString(),
      mood: 2 + Math.floor(Math.random() * 4),
      energyStressLevel: 2 + Math.floor(Math.random() * 4),
      reflection: REFLECTIONS[i % REFLECTIONS.length],
      feelingWord: FEELING_WORDS[i % FEELING_WORDS.length],
    });
  }

  const { error } = await admin.from("dailyCheckin").insert(rows);
  if (error) throw error;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const spec of USER_SPECS) {
    console.log(`Seeding ${spec.email}...`);
    const userId = await ensureUser(admin, spec.email);
    const variant = ONBOARDING_VARIANTS[spec.variantIndex];
    const profile = buildProfilePayload(spec, variant);

    const { error: profileError } = await admin.from("profiles").update(profile).eq("id", userId);
    if (profileError) {
      throw new Error(`profile ${spec.email}: ${profileError.message}`);
    }

    if (spec.paths.length > 0) {
      await seedPaths(admin, userId, spec.paths);
    }

    await seedCheckins(admin, userId, spec.checkinDays);
    console.log(`  ok (${userId})`);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
