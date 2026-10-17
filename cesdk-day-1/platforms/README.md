# Mobile platforms (checklist 59)

| Folder | SDK | Covers |
|--------|-----|--------|
| `react-native/` | `@imgly/editor-react-native@1.83.0` | iOS, Android, React Native |
| `flutter/` | `imgly_editor` (pub) | Flutter (iOS/Android) |

These are thin shells that open the official CE.SDK mobile editors. Run on a device or simulator with a valid license:

```bash
# React Native (after scaffolding metro/expo around App.tsx)
cd platforms/react-native && npm i

# Flutter
cd platforms/flutter && flutter pub get && flutter run
```
