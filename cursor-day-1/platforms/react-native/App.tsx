import { SafeAreaView, Text, View, StyleSheet, Linking } from 'react-native'

/** Thin shell: opens exported JSON / web preview URL for the same document model. */
export default function App() {
  const previewUrl = 'http://localhost:5173'
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>cursor-day-1 · React Native</Text>
      <Text style={styles.body}>
        Load a design JSON exported from the web editor. This shell proves the document format is
        not React-only.
      </Text>
      <Text style={styles.link} onPress={() => Linking.openURL(previewUrl)}>
        Open web editor
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, backgroundColor: '#0f172a' },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  body: { color: '#cbd5e1', fontSize: 16, lineHeight: 22 },
  link: { marginTop: 24, color: '#60a5fa', fontSize: 16 },
})
