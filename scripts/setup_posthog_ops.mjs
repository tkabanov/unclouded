#!/usr/bin/env node
/**
 * US-900/901 ops: configure PostHog funnel + Vercel production env.
 *
 * Required env:
 *   POSTHOG_PERSONAL_API_KEY — Personal API key (insight:write, project:read)
 *   VITE_POSTHOG_KEY — Project API key (phc_...) for the web app
 *
 * Optional env:
 *   POSTHOG_HOST — default https://us.i.posthog.com
 *   POSTHOG_PROJECT_ID — skip project discovery when set
 *   VERCEL_TOKEN — set VITE_POSTHOG_* on Vercel production when set
 *
 * Usage:
 *   node scripts/setup_posthog_ops.mjs
 */

const POSTHOG_HOST = (process.env.POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
const PERSONAL_KEY = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
const PROJECT_KEY = process.env.VITE_POSTHOG_KEY?.trim();
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID?.trim();

const FUNNEL_STEPS = [
  "signup_completed",
  "onboarding_started",
  "onboarding_completed",
  "plan_upgrade_clicked",
  "free_to_pro_conversion",
];

const FUNNEL_NAME = "PuP 360 conversion funnel (US-901)";

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function posthog(path, { method = "GET", body } = {}) {
  const res = await fetch(`${POSTHOG_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PERSONAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`${method} ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return json;
}

async function resolveProjectId() {
  if (PROJECT_ID) return PROJECT_ID;
  const projects = await posthog("/api/projects/");
  const list = projects.results ?? projects;
  if (!Array.isArray(list) || list.length === 0) {
    fail("No PostHog projects found. Create one at https://us.posthog.com/signup");
  }
  const match =
    list.find((p) => /uncloud/i.test(p.name ?? "")) ??
    list.find((p) => /pup|360/i.test(p.name ?? "")) ??
    list[0];
  console.log(`Using PostHog project: ${match.name} (${match.id})`);
  return String(match.id);
}

async function ensureFunnel(projectId) {
  const existing = await posthog(`/api/projects/${projectId}/insights/?search=${encodeURIComponent(FUNNEL_NAME)}`);
  const rows = existing.results ?? [];
  const found = rows.find((row) => row.name === FUNNEL_NAME);
  if (found) {
    console.log(`Funnel insight already exists: ${found.id}`);
    return found;
  }

  const payload = {
    name: FUNNEL_NAME,
    description: "Auto-created from PRODUCT_FUNNEL_STEPS in frontend/src/lib/analytics/productAnalytics.ts",
    saved: true,
    query: {
      kind: "InsightVizNode",
      source: {
        kind: "FunnelsQuery",
        series: FUNNEL_STEPS.map((event) => ({
          kind: "EventsNode",
          event,
          name: event,
        })),
        dateRange: { date_from: "-30d" },
        funnelWindowInterval: 30,
        funnelWindowIntervalUnit: "day",
      },
    },
  };

  const created = await posthog(`/api/projects/${projectId}/insights/`, {
    method: "POST",
    body: payload,
  });
  console.log(`Created funnel insight: ${created.id}`);
  return created;
}

async function setVercelEnv() {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.log("VERCEL_TOKEN not set — skipping Vercel env update.");
    console.log(`Add manually: VITE_POSTHOG_KEY=${PROJECT_KEY}`);
    console.log(`Add manually: VITE_POSTHOG_HOST=${POSTHOG_HOST}`);
    return;
  }

  const { execFileSync } = await import("node:child_process");
  const projectRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const run = (args, input) =>
    execFileSync("vercel", args, {
      cwd: projectRoot,
      env: { ...process.env, VERCEL_TOKEN: token },
      input,
      stdio: ["pipe", "inherit", "inherit"],
    });

  for (const [name, value] of [
    ["VITE_POSTHOG_KEY", PROJECT_KEY],
    ["VITE_POSTHOG_HOST", POSTHOG_HOST],
  ]) {
    console.log(`Setting Vercel production env: ${name}`);
    run(["env", "add", name, "production", "--force"], `${value}\n`);
  }
}

async function main() {
  if (!PERSONAL_KEY) {
    fail("Set POSTHOG_PERSONAL_API_KEY (Personal API key from PostHog → Settings → Personal API keys)");
  }
  if (!PROJECT_KEY) {
    fail("Set VITE_POSTHOG_KEY (Project API key phc_... from PostHog → Project settings → Project API key)");
  }

  const projectId = await resolveProjectId();
  await ensureFunnel(projectId);
  await setVercelEnv();

  console.log("\nDone.");
  console.log(`PostHog host: ${POSTHOG_HOST}`);
  console.log(`Funnel steps: ${FUNNEL_STEPS.join(" → ")}`);
  console.log("Redeploy production after Vercel env changes.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
