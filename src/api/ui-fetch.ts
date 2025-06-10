import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'

import { getToken, prepareRelease } from '../utils/repo'
import { UiTypes, uis } from '../utils/ui'
import { unzip } from '../utils/unzip'

export type UiFetchOption = {
  silence?: boolean

  ui: UiTypes
  version?: string
}

export default async function UiFetchAction(option: UiFetchOption) {
  if (!existsSync('assets/interface.json')) {
    console.error('you must run this command at your project root')
    return false
  }

  const zipData = await prepareRelease(option.ui, option.version)
  if (!zipData) {
    return false
  }

  if (!(await unzip(zipData, uis[option.ui].folder))) {
    return false
  }

  for (const link of uis[option.ui].symlink) {
    if (existsSync(link.link)) {
      await fs.rm(link.link)
    }
    await fs.symlink(link.target, link.link)
  }

  return true
}
