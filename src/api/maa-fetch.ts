import { existsSync } from 'node:fs'

import { getToken, prepareRelease } from '../utils/repo'
import { unzip } from '../utils/unzip'

export type MaaFetchOption = {
  silence?: boolean

  version?: string
}

export default async function MaaFetchAction(option: MaaFetchOption) {
  if (!existsSync('assets/interface.json')) {
    console.error('you must run this command at your project root')
    return false
  }

  const zipData = await prepareRelease('maa', option.version)
  if (!zipData) {
    return false
  }

  if (!(await unzip(zipData, 'deps'))) {
    return false
  }

  return true
}
