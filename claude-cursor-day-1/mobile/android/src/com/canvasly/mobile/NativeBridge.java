package com.canvasly.mobile;

import android.app.Activity;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/** window.CanvaslyNative – exports from the editor land in the app's Downloads folder. */
public class NativeBridge implements Runnable {
    private final Activity activity;
    private volatile String pendingToast;

    NativeBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public String saveFile(String name, String mime, String base64) {
        FileOutputStream out = null;
        try {
            File dir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir != null && !dir.exists()) dir.mkdirs();
            File f = new File(dir, name.replaceAll("[\\\\/:*?\"<>|]", "_"));
            out = new FileOutputStream(f);
            out.write(Base64.decode(base64, Base64.DEFAULT));
            pendingToast = "Saved " + f.getName() + " (" + f.length() / 1024 + " KB) to Downloads";
            activity.runOnUiThread(this);
            return f.getAbsolutePath();
        } catch (IOException e) {
            return "";
        } finally {
            if (out != null) try { out.close(); } catch (IOException ignored) { }
        }
    }

    @JavascriptInterface
    public String platform() {
        return "android";
    }

    @Override
    public void run() {
        Toast.makeText(activity, pendingToast, Toast.LENGTH_LONG).show();
    }
}
