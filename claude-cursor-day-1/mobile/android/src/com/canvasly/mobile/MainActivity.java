package com.canvasly.mobile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Canvasly for Android: the same web editor build (dist/) bundled in assets/www and served from a
 * private https origin (see AssetClient), so ES modules, WASM and fetch() work exactly as on the web.
 * A design file handed to the app ("Open with" / "Share") is served as /launch-design.json and
 * opened by the editor via ?design=.
 */
public class MainActivity extends Activity {
    private WebView web;
    private AssetClient client;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        client = new AssetClient(this);
        web.setWebViewClient(client);
        web.addJavascriptInterface(new NativeBridge(this), "CanvaslyNative");
        setContentView(web);
        open(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        open(intent);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private void open(Intent intent) {
        client.launchDesign = readDesign(intent);
        String url = AssetClient.ORIGIN + "/index.html";
        if (client.launchDesign != null) url += "?design=/launch-design.json&t=" + System.currentTimeMillis();
        web.loadUrl(url);
    }

    private byte[] readDesign(Intent intent) {
        if (intent == null) return null;
        try {
            Uri uri = null;
            if (Intent.ACTION_VIEW.equals(intent.getAction())) uri = intent.getData();
            else if (Intent.ACTION_SEND.equals(intent.getAction())) {
                String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (text != null && text.trim().startsWith("{")) return text.getBytes("UTF-8");
                uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            }
            if (uri == null) return null;
            InputStream in = "file".equals(uri.getScheme())
                    ? new FileInputStream(new File(uri.getPath()))
                    : getContentResolver().openInputStream(uri);
            return readAll(in);
        } catch (Exception e) {
            Toast.makeText(this, "Could not read design: " + e.getMessage(), Toast.LENGTH_LONG).show();
            return null;
        }
    }

    static byte[] readAll(InputStream in) throws IOException {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            in.close();
        }
    }
}
