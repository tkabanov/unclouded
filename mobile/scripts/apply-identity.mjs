#!/usr/bin/env node
/**
 * Single source of truth for the shell's origin/identity values:
 * `mobile/app-identity.json`. `capacitor.config.ts` reads it directly; the
 * native files below cannot, so this script writes the values into them.
 *
 * Client-account migration: change `appHost` / `supabaseHost` in
 * app-identity.json, run `npm run identity`, then `npx cap sync`.
 *
 *   node scripts/apply-identity.mjs          # write values into native files
 *   node scripts/apply-identity.mjs --check  # fail (exit 1) if any file drifted
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const identity = JSON.parse(readFileSync(join(root, "app-identity.json"), "utf8"));
const checkOnly = process.argv.includes("--check");

const HOST_PATTERN = /^[a-z0-9.-]+$/i;
const APP_ID_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
for (const key of ["appHost", "supabaseHost"]) {
  if (!HOST_PATTERN.test(identity[key] ?? "")) {
    throw new Error(`app-identity.json: "${key}" must be a bare host (no scheme/path), got ${JSON.stringify(identity[key])}`);
  }
}
if (!APP_ID_PATTERN.test(identity.appId ?? "")) {
  throw new Error(`app-identity.json: "appId" is not a valid bundle id: ${JSON.stringify(identity.appId)}`);
}

/** Each target: file + regex whose single capture group is replaced by `value`. */
const targets = [
  {
    file: "www/offline.html",
    pattern: /const APP_ORIGIN = "(https:\/\/[^"]*)";/,
    value: `https://${identity.appHost}/`,
  },
  {
    file: "android/app/src/main/AndroidManifest.xml",
    pattern: /<data android:scheme="https" android:host="([^"]*)" \/>/,
    value: identity.appHost,
  },
  {
    file: "ios/App/App/App.entitlements",
    pattern: /<string>applinks:([^<]*)<\/string>/,
    value: identity.appHost,
  },
  {
    file: "android/app/build.gradle",
    pattern: /applicationId "([^"]*)"/,
    value: identity.appId,
  },
  {
    file: "ios/App/App.xcodeproj/project.pbxproj",
    pattern: /PRODUCT_BUNDLE_IDENTIFIER = ([^;]*);/g,
    value: identity.appId,
  },
];

const drifted = [];
for (const { file, pattern, value } of targets) {
  const path = join(root, file);
  const before = readFileSync(path, "utf8");
  if (!pattern.test(before)) {
    throw new Error(`${file}: expected pattern ${pattern} not found — update apply-identity.mjs`);
  }
  pattern.lastIndex = 0;
  const after = before.replace(pattern, (match, current) => match.replace(current, value));
  if (after === before) continue;
  drifted.push(file);
  if (!checkOnly) writeFileSync(path, after);
}

if (checkOnly && drifted.length > 0) {
  console.error(`Out of sync with app-identity.json: ${drifted.join(", ")}\nRun: npm run identity`);
  process.exit(1);
}
console.log(
  drifted.length === 0
    ? "Native files match app-identity.json."
    : `Updated from app-identity.json: ${drifted.join(", ")}. Now run: npx cap sync`,
);
