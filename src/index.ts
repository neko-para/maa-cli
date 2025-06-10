import { program } from 'commander'

import pkg from '../package.json'
import AuthAction from './api/auth'
import CreateAction from './api/create.js'
import MaaFetchAction from './api/maa-fetch'
import UiFetchAction from './api/ui-fetch'
import UpdateAction from './api/update.js'
import { setProxy } from './utils/agent'
import { UiTypes, uis } from './utils/ui'

async function main() {
  let resp = true

  program.version(pkg.version).description('CLI tool for MaaFramework project')

  program.option('-s, --silence', 'disable interactive input')
  program.option('-p, --proxy <proxy>', 'config proxy')

  program
    .command('auth')
    .description(
      'login into github\ncheck https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens for help'
    )
    .action(async () => {
      const options = program.opts()
      if (options.proxy) {
        setProxy(options.proxy)
      }
      resp = await AuthAction({
        silence: options.silence
      })
    })

  program
    .command('update')
    .description('update template')
    .action(async () => {
      resp = await UpdateAction()
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
        resp = await CreateAction({
          silence: options.silence,
          folder,
          features
        })
      }
    )

  program
    .command('maa-fetch')
    .description('fetch maa')
    .option('-v, --version <version>', 'version of ui to fetch')
    .action(async (loptions: { version?: string }) => {
      const options = program.opts()
      if (options.proxy) {
        setProxy(options.proxy)
      }
      await MaaFetchAction({
        silence: options.silence,

        version: loptions.version
      })
    })

  program
    .command('ui-fetch <ui>')
    .description(
      `fetch ui. known values: ${Object.entries(uis)
        .map(([key, val]) => `${key}(${val.name})`)
        .join(' ')}`
    )
    .option('-v, --version <version>', 'version of ui to fetch')
    .action(async (ui: string, loptions: { version?: string }) => {
      const options = program.opts()
      if (options.proxy) {
        setProxy(options.proxy)
      }
      if (!Object.keys(uis).includes(ui)) {
        console.error(`invalid ui ${ui}`)
        resp = false
        return
      }
      resp = await UiFetchAction({
        silence: options.silence,

        ui: ui as UiTypes,
        version: loptions.version
      })
    })

  await program.parseAsync()

  return resp
}

main().then(suc => {
  process.exit(suc ? 0 : 1)
})
