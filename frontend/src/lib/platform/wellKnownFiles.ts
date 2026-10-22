/**
 * MOB-12 association files (`/.well-known/apple-app-site-association`,
 * `/.well-known/assetlinks.json`), generated at build time by the Vite plugin
 * in `vite.config.ts` instead of being committed with account-specific values.
 *
 * Client-account migration: the Apple Team ID and Android signing SHA-256
 * fingerprints come from build env (`APPLE_TEAM_ID`, `ANDROID_CERT_SHA256`,
 * comma-separated), the bundle id from `mobile/app-identity.json`. Unset env →
 * a visible TODO placeholder (the OS simply fails verification), never a
 * guessed value.
 *
 * Build-time only: no `import.meta.env`, not imported by the app bundle.
 */

/** In-app routes the OS may open in the app instead of the browser. */
export const DEEP_LINK_PATHS = [
  "/reset_pw",
  "/reset_pw/*",
  "/dashboard",
  "/join/*",
  "/coach-session/*",
] as const;

export const TEAM_ID_PLACEHOLDER = "TODOTEAMID";
export const FINGERPRINT_PLACEHOLDER =
  "TODO(owner): SHA-256 fingerprint of the release signing keystore — set ANDROID_CERT_SHA256";

export type WellKnownInput = {
  appId: string;
  appleTeamId?: string | null;
  androidCertSha256?: string | null;
};

const TEAM_ID_PATTERN = /^[A-Z0-9]{10}$/;
const SHA256_PATTERN = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

function parseFingerprints(raw: string | null | undefined): string[] {
  const values = (raw ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  for (const value of values) {
    if (!SHA256_PATTERN.test(value)) {
      throw new Error(`ANDROID_CERT_SHA256: not a colon-separated SHA-256 fingerprint: ${value}`);
    }
  }
  return values;
}

export function buildAppleAppSiteAssociation(input: WellKnownInput): string {
  const teamId = input.appleTeamId?.trim() || TEAM_ID_PLACEHOLDER;
  if (teamId !== TEAM_ID_PLACEHOLDER && !TEAM_ID_PATTERN.test(teamId)) {
    throw new Error(`APPLE_TEAM_ID: expected 10 uppercase letters/digits, got ${teamId}`);
  }
  const body = {
    applinks: {
      apps: [],
      details: [{ appID: `${teamId}.${input.appId}`, paths: [...DEEP_LINK_PATHS] }],
    },
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}

export function buildAssetLinks(input: WellKnownInput): string {
  const fingerprints = parseFingerprints(input.androidCertSha256);
  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: input.appId,
        sha256_cert_fingerprints: fingerprints.length > 0 ? fingerprints : [FINGERPRINT_PLACEHOLDER],
      },
    },
  ];
  return `${JSON.stringify(body, null, 2)}\n`;
}
