import { select } from '@inquirer/prompts'

import { getToken, prepareRepo, repos } from '../utils/repo'
import { UiTypes, fetchRelease, uis } from '../utils/ui'

export type UiFetchOption = {
  silence?: boolean

  ui?: keyof typeof uis
}

export default async function UiFetchAction(option: UiFetchOption) {
  if (!(await getToken())) {
    console.error('you must login before fetch')
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

  const release = await fetchRelease(ui)
  const latest = release.find(x => !x.prerelease && !x.draft)
  if (latest) {
    console.log(`find latest version ${latest.name}: ${latest.tag_name}`)
  }

  return true
}
