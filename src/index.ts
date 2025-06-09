import { program } from 'commander'

import pkg from '../package.json'
import CreateAction from './api/create.js'
import UpdateAction from './api/update.js'

async function main() {
  program.version(pkg.version).description('CLI tool for MaaFramework project')

  program.option('-s, --silence', 'disable interactive input')

  program
    .command('update')
    .description('update template')
    .action(async () => {
      await UpdateAction()
    })
  program
    .command('create [folder]')
    .description('create project from template')
    .option('-f, --feature <feature...>', 'enable features')
    .action(
      async (
        folder,
        loptions: {
          feature?: string[]
        }
      ) => {
        const features: Record<string, string[]> = {}
        for (const feat of loptions.feature ?? []) {
          const m = /^(.+?)=(.+)$/.exec(feat)
          if (m) {
            const key = m[1].trim()
            const val = m[2].trim()
            features[key] = (features[key] ?? []).concat(val)
          }
        }

        const options = program.opts()
        await CreateAction({
          silence: options.silence,
          folder,
          features
        })
      }
    )

  await program.parseAsync()

  return true
}

main().then(suc => {
  process.exit(suc ? 0 : 1)
})
