// Bundles the headless renderer (shared src/render.ts + src/pdf.ts) into headless/dist with esbuild.
import { build } from 'esbuild'
import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const outdir = path.resolve('headless/dist')
await mkdir(path.join(outdir, 'fonts'), { recursive: true })

const assets = {
  name: 'assets',
  setup(b) {
    b.onResolve({ filter: /\.css$/ }, (a) => ({ path: a.path, namespace: 'empty' }))
    b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '', loader: 'js' }))
    b.onResolve({ filter: /\.(woff2?|ttf|otf)\?url$/ }, (a) => ({ path: require.resolve(a.path.replace(/\?url$/, ''), { paths: [a.resolveDir] }), namespace: 'fonturl' }))
    b.onLoad({ filter: /.*/, namespace: 'fonturl' }, async (a) => {
      const name = path.basename(a.path)
      await copyFile(a.path, path.join(outdir, 'fonts', name))
      return { contents: `export default new URL('./fonts/${name}', import.meta.url).href`, loader: 'js' }
    })
  },
}

await build({
  entryPoints: ['headless/cli.ts'],
  outfile: path.join(outdir, 'canvasly-render.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['@napi-rs/canvas'],
  plugins: [assets],
  banner: { js: "#!/usr/bin/env node\nimport { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'info',
})
