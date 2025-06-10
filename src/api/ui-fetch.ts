import { select } from '@inquirer/prompts'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'

import { getToken, prepareRelease } from '../utils/repo'
import { UiTypes, uis } from '../utils/ui'
import { unzip } from '../utils/unzip'

export type UiFetchOption = {
  silence?: boolean

  ui?: UiTypes
  version?: string
}

export default async function UiFetchAction(option: UiFetchOption) {
  if (!(await getToken())) {
    console.error('you must login before fetch')
    return false
  }

  if (!existsSync('assets/interface.json')) {
    console.error('you must run this command at your project root')
    return false
  }

  let ui: UiTypes | undefined = option.ui

  if (!ui && !option.silence) {
    ui = (await select({
      message: 'select target ui',
      choices: Object.keys(uis)
    })) as UiTypes
  }

  if (!ui) {
    console.error('you must specific a ui')
    return false
  }

  const zipData = await prepareRelease(ui, option.version)
  if (!zipData) {
    return false
  }

  if (!(await unzip(zipData, uis[ui].folder))) {
    return false
  }

  for (const link of uis[ui].symlink) {
    await fs.symlink(link.target, link.link)
  }

  return true
}
