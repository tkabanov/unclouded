package com.provenunderpressure.unclouded;

import com.getcapacitor.BridgeActivity;

/**
 * MOB-UI-002 — hardware back is handled entirely in JS via
 * initNativeBackButtonListener() (frontend/src/lib/platform/deepLinkRouting.ts),
 * which listens for @capacitor/app's "backButton" event and unwinds SPA
 * history with window.history.back(). That JS-side history is the source of
 * truth for a client-routed SPA; the native WebView's own back-forward list
 * (bridge.getWebView().canGoBack()) does not reliably track pushState
 * navigations, so a native onBackPressed override here would (and did)
 * short-circuit the JS listener with a check that's almost always false.
 * Leave back-press handling to BridgeActivity's default, which dispatches
 * the JS event instead of resolving it natively.
 */
public class MainActivity extends BridgeActivity {}
