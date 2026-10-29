#!/usr/bin/env bash
# Builds mobile/android/build/canvasly.apk without Gradle: javac → d8 → aapt2 → zipalign → apksigner.
# Needs: JDK 17+, Android SDK with "platforms;android-34" and "build-tools;34.0.0" (ANDROID_HOME).
# Bundles the web editor from dist/ – run `npm run build` first (or use `npm run build:android`).
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
BT="$SDK/build-tools/34.0.0"
JAR="$SDK/platforms/android-34/android.jar"
OUT=build
[ -f "$JAR" ] || { echo "android.jar not found – install platforms;android-34 into $SDK" >&2; exit 1; }
[ -f "$ROOT/dist/index.html" ] || { echo "dist/ missing – run npm run build" >&2; exit 1; }

rm -rf "$OUT" && mkdir -p "$OUT/classes" "$OUT/dex" "$OUT/assets/www"

# web editor: everything except the embed library copy (the app uses the full editor)
cp -r "$ROOT/dist/." "$OUT/assets/www/" && rm -rf "$OUT/assets/www/lib"
cp "$ROOT/headless/examples/badge.design.json" "$OUT/assets/www/sample.design.json"

javac --release 8 -Xlint:-options -nowarn -classpath "$JAR" -d "$OUT/classes" $(find src -name '*.java')
jar cf "$OUT/classes.jar" -C "$OUT/classes" .
"$BT/d8" --min-api 26 --lib "$JAR" --output "$OUT/dex" "$OUT/classes.jar"

"$BT/aapt2" compile --dir res -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/unsigned.apk" -I "$JAR" --manifest AndroidManifest.xml -A "$OUT/assets" \
  --min-sdk-version 26 --target-sdk-version 34 -0 wasm -0 onnx "$OUT/res.zip"
( cd "$OUT/dex" && zip -q -j ../unsigned.apk classes.dex )

"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
KS="$OUT/../debug.keystore"
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass android -keypass android -alias debug \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Canvasly Debug" >/dev/null 2>&1
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --out "$OUT/canvasly.apk" "$OUT/aligned.apk"
ls -la "$OUT/canvasly.apk"
