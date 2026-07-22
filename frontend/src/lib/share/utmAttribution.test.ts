import { beforeEach, describe, expect, it } from "vitest";

import {
  UTM_CAMPAIGN_AUTH_METADATA_KEY,
  UTM_MEDIUM_AUTH_METADATA_KEY,
  UTM_SOURCE_AUTH_METADATA_KEY,
  buildSignupUtmMetadata,
  captureUtmFromSearch,
  clearPendingUtmParams,
  normalizeUtmValue,
  peekPendingUtmParams,
  readUtmFromSearch,
} from "./utmAttribution";

describe("utmAttribution", () => {
  beforeEach(() => {
    clearPendingUtmParams();
  });

  it("normalizes UTM values by trimming", () => {
    expect(normalizeUtmValue("  wix  ")).toBe("wix");
  });

  it("rejects malformed UTM values", () => {
    expect(normalizeUtmValue("bad value!")).toBeNull();
    expect(normalizeUtmValue("")).toBeNull();
  });

  it("reads UTM params from search params", () => {
    expect(
      readUtmFromSearch("?utm_source=wix&utm_medium=homepage&utm_campaign=launch"),
    ).toEqual({
      utm_source: "wix",
      utm_medium: "homepage",
      utm_campaign: "launch",
    });
  });

  it("persists pending UTM params for signup", () => {
    captureUtmFromSearch("?utm_source=wix&utm_medium=homepage&utm_campaign=launch");
    expect(peekPendingUtmParams()).toEqual({
      utm_source: "wix",
      utm_medium: "homepage",
      utm_campaign: "launch",
    });
  });

  it("merges later UTM params without clearing earlier values", () => {
    captureUtmFromSearch("?utm_source=wix&utm_medium=homepage");
    captureUtmFromSearch("?utm_campaign=launch");
    expect(peekPendingUtmParams()).toEqual({
      utm_source: "wix",
      utm_medium: "homepage",
      utm_campaign: "launch",
    });
  });

  it("builds signup auth metadata", () => {
    expect(
      buildSignupUtmMetadata({
        utm_source: "wix",
        utm_medium: "homepage",
        utm_campaign: "launch",
      }),
    ).toEqual({
      [UTM_SOURCE_AUTH_METADATA_KEY]: "wix",
      [UTM_MEDIUM_AUTH_METADATA_KEY]: "homepage",
      [UTM_CAMPAIGN_AUTH_METADATA_KEY]: "launch",
    });
    expect(buildSignupUtmMetadata(null)).toBeUndefined();
  });
});
