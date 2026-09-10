import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => false),
}));

const syncNativePushIfGranted = vi.fn().mockResolvedValue({ status: "registered" });
const syncWebPushSubscriptionIfGranted = vi.fn().mockResolvedValue({ status: "subscribed" });

vi.mock("@/lib/notifications/nativePushRegistration", () => ({
  syncNativePushIfGranted: (...args: unknown[]) => syncNativePushIfGranted(...args),
}));

vi.mock("@/lib/notifications/webPushRegistration", () => ({
  syncWebPushSubscriptionIfGranted: (...args: unknown[]) => syncWebPushSubscriptionIfGranted(...args),
}));

import { isNativeApp } from "@/lib/platform/nativeApp";
import WebPushRegistrationEffect from "@/components/notifications/WebPushRegistrationEffect";

const mockIsNativeApp = vi.mocked(isNativeApp);

describe("WebPushRegistrationEffect (MOB-09)", () => {
  beforeEach(() => {
    syncNativePushIfGranted.mockClear();
    syncWebPushSubscriptionIfGranted.mockClear();
  });

  it("syncs native push and never touches the web-push path when native", () => {
    mockIsNativeApp.mockReturnValue(true);
    render(<WebPushRegistrationEffect />);

    expect(syncNativePushIfGranted).toHaveBeenCalled();
    expect(syncWebPushSubscriptionIfGranted).not.toHaveBeenCalled();
  });

  it("syncs web push when granted, on web", () => {
    mockIsNativeApp.mockReturnValue(false);
    vi.stubGlobal("Notification", { permission: "granted" });

    render(<WebPushRegistrationEffect />);

    expect(syncWebPushSubscriptionIfGranted).toHaveBeenCalled();
    expect(syncNativePushIfGranted).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
