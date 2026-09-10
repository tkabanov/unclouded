import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => false),
}));

const getNativePushBannerState = vi.fn();
const enableNativePushNotifications = vi.fn();

vi.mock("@/lib/notifications/nativePushRegistration", () => ({
  getNativePushBannerState: (...args: unknown[]) => getNativePushBannerState(...args),
  enableNativePushNotifications: (...args: unknown[]) => enableNativePushNotifications(...args),
}));

import { isNativeApp } from "@/lib/platform/nativeApp";
import WebPushEnableBanner from "@/components/notifications/WebPushEnableBanner";

const mockIsNativeApp = vi.mocked(isNativeApp);

describe("WebPushEnableBanner (MOB-09 native path)", () => {
  it("uses native banner state and enable flow when native", async () => {
    mockIsNativeApp.mockReturnValue(true);
    getNativePushBannerState.mockResolvedValue("prompt");
    enableNativePushNotifications.mockResolvedValue({ status: "registered" });

    render(<WebPushEnableBanner />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enable notifications/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /enable notifications/i }));

    await waitFor(() => {
      expect(enableNativePushNotifications).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByTestId("web-push-enable-banner")).not.toBeInTheDocument();
    });
  });

  it("shows the denied copy when native permission is denied", async () => {
    mockIsNativeApp.mockReturnValue(true);
    getNativePushBannerState.mockResolvedValue("denied");

    render(<WebPushEnableBanner />);

    await waitFor(() => {
      expect(screen.getByText(/notifications are blocked/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /enable notifications/i })).not.toBeInTheDocument();
  });

  it("renders nothing when native reports no banner needed", async () => {
    mockIsNativeApp.mockReturnValue(true);
    getNativePushBannerState.mockResolvedValue(null);

    const { container } = render(<WebPushEnableBanner />);

    await waitFor(() => {
      expect(getNativePushBannerState).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });
});
