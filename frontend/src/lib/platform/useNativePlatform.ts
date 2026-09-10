import { useMemo } from "react";

import {
  getAppPlatform,
  getNativeAppVersion,
  getNativePlatform,
  isNativeApp,
  type AppPlatform,
  type NativePlatform,
} from "@/lib/platform/nativeApp";

export interface NativePlatformSnapshot {
  isNative: boolean;
  platform: NativePlatform | null;
  appPlatform: AppPlatform;
  version: string | null;
}

/** Snapshot is memoized: the bridge/UA marker are fixed for the app's lifetime. */
export function useNativePlatform(): NativePlatformSnapshot {
  return useMemo(
    () => ({
      isNative: isNativeApp(),
      platform: getNativePlatform(),
      appPlatform: getAppPlatform(),
      version: getNativeAppVersion(),
    }),
    [],
  );
}
