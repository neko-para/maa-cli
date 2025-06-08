import { context } from 'esbuild'

const ctx = await context({
  entryPoints: ['src/index.ts'],
  outdir: 'out',
  platform: 'node',
  format: 'esm',
  bundle: true,
  banner: {
    js: `import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);\n`
  }
})
ctx.watch({})
