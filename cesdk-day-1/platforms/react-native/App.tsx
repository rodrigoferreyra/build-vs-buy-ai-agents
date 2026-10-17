/**
 * React Native CE.SDK shell (iOS + Android via @imgly/editor-react-native).
 * Checklist 59 — run with a device/simulator after `npm i` in this folder.
 */
import { useState } from 'react';
import { Button, SafeAreaView, Text, View } from 'react-native';
// Official mobile editor package (pins iOS + Android native SDKs).
import IMGLYEditor from '@imgly/editor-react-native';

const LICENSE = process.env.EXPO_PUBLIC_CESDK_LICENSE ?? '';

export default function App() {
  const [status, setStatus] = useState('idle');

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text accessibilityRole="header">cesdk-day-1 React Native</Text>
      <Text>Status: {status}</Text>
      <View style={{ height: 12 }} />
      <Button
        title="Open design editor"
        accessibilityLabel="Open design editor"
        onPress={async () => {
          setStatus('opening');
          try {
            await IMGLYEditor.openEditor({
              license: LICENSE,
              source: undefined,
            });
            setStatus('closed');
          } catch (e) {
            setStatus(`error: ${(e as Error).message}`);
          }
        }}
      />
    </SafeAreaView>
  );
}
