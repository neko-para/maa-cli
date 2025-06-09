import { build } from 'esbuild'

build({
  entryPoints: ['src/index.ts'],
  outdir: 'out',
  sourcemap: true,
  platform: 'node',
  format: 'esm',
  bundle: true,
  banner: {
    js: `import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);\n`
  }
})
