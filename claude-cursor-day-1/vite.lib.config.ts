import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Framework-neutral library build of the editor (React bundled inside) for plain JS / Vue / Angular / Svelte hosts.
// Output goes to public/lib so the app build ships it at /lib/canvasly-editor.js.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'public/lib',
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    lib: {
      entry: 'src/embed.tsx',
      formats: ['es'],
      fileName: () => 'canvasly-editor.js',
    },
  },
})
