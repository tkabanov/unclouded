package com.provenunderpressure.unclouded;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

/**
 * MOB-03 — Android hardware back: if the WebView has in-app history, go back
 * in it; at the app root, minimize the task instead of killing the session
 * (so the user's chat/session state and auth stay alive when they return).
 */
public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override
      public void handleOnBackPressed() {
        if (bridge.getWebView().canGoBack()) {
          bridge.getWebView().goBack();
        } else {
          moveTaskToBack(false);
        }
      }
    });
  }
}
