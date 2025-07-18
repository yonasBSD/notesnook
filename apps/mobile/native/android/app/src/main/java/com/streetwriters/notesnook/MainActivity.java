package com.streetwriters.notesnook;

import com.facebook.react.ReactActivity;
import android.content.Intent;
import android.content.res.Configuration;
import androidx.core.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.core.view.OnApplyWindowInsetsListener;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.zoontek.rnbootsplash.RNBootSplash;

public class MainActivity extends ReactActivity {
  @Override
    protected void onCreate(Bundle savedInstanceState) {
    RNBootSplash.init(this);
    super.onCreate(null);
    if (BuildConfig.DEBUG) {
      WebView.setWebContentsDebuggingEnabled(true);
    }

    try {
      startService(new Intent(getBaseContext(), OnClearFromRecentService.class));
    } catch (Exception ignored) {}

    if (Build.VERSION.SDK_INT >= 35) {
      final View rootView = findViewById(android.R.id.content);
      ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, insets) -> {
        Insets innerPadding = insets.getInsets(WindowInsetsCompat.Type.ime());
        rootView.setPadding(
                innerPadding.left,
                innerPadding.top,
                innerPadding.right,
                innerPadding.bottom
        );
        return insets;
      });
    }
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            DefaultNewArchitectureEntryPoint.getFabricEnabled());
  }

@Override
public void onNewIntent(Intent intent) {
  super.onNewIntent(intent);
  setIntent(intent);
}

@Override
public void onConfigurationChanged(Configuration newConfig) {
  super.onConfigurationChanged(newConfig);
  getReactInstanceManager().onConfigurationChanged(this, newConfig);
  Intent intent = new Intent("onConfigurationChanged");
  intent.putExtra("newConfig", newConfig);
  this.sendBroadcast(intent);
}

  @Override
  protected String getMainComponentName() {
    return "Notesnook";
  }

  @Override
  public void invokeDefaultOnBackPressed() {
    moveTaskToBack(true);
  }

}
