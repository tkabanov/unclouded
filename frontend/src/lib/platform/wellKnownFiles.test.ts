import { describe, expect, it } from "vitest";

import {
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  DEEP_LINK_PATHS,
  FINGERPRINT_PLACEHOLDER,
} from "./wellKnownFiles";

const APP_ID = "com.example.app";
const FINGERPRINT = Array.from({ length: 32 }, () => "AB").join(":");

describe("buildAppleAppSiteAssociation", () => {
  it("uses the team id and bundle id from input", () => {
    const parsed = JSON.parse(buildAppleAppSiteAssociation({ appId: APP_ID, appleTeamId: "ABCDE12345" }));
    expect(parsed.applinks.details).toEqual([
      { appID: "ABCDE12345.com.example.app", paths: [...DEEP_LINK_PATHS] },
    ]);
  });

  it("falls back to a visible placeholder when the team id is unset", () => {
    const parsed = JSON.parse(buildAppleAppSiteAssociation({ appId: APP_ID }));
    expect(parsed.applinks.details[0].appID).toBe("TODOTEAMID.com.example.app");
  });

  it("rejects a malformed team id", () => {
    expect(() => buildAppleAppSiteAssociation({ appId: APP_ID, appleTeamId: "abc" })).toThrow(/APPLE_TEAM_ID/);
  });
});

describe("buildAssetLinks", () => {
  it("lists every comma-separated fingerprint, normalized to upper case", () => {
    const parsed = JSON.parse(
      buildAssetLinks({ appId: APP_ID, androidCertSha256: ` ${FINGERPRINT.toLowerCase()} , ${FINGERPRINT}` }),
    );
    expect(parsed[0].target).toEqual({
      namespace: "android_app",
      package_name: APP_ID,
      sha256_cert_fingerprints: [FINGERPRINT, FINGERPRINT],
    });
  });

  it("falls back to a visible placeholder when no fingerprint is set", () => {
    const parsed = JSON.parse(buildAssetLinks({ appId: APP_ID, androidCertSha256: "" }));
    expect(parsed[0].target.sha256_cert_fingerprints).toEqual([FINGERPRINT_PLACEHOLDER]);
  });

  it("rejects a value that is not a SHA-256 fingerprint", () => {
    expect(() => buildAssetLinks({ appId: APP_ID, androidCertSha256: "deadbeef" })).toThrow(/ANDROID_CERT_SHA256/);
  });
});
