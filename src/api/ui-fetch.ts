import { select } from '@inquirer/prompts'
import fs from 'node:fs/promises'

import { getToken, prepareRepo, repos } from '../utils/repo'
import { UiTypes, downloadRelease, fetchRelease, uis } from '../utils/ui'

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

  let version = option.version
  if (!version) {
    const latest = release.find(x => !x.prerelease && !x.draft)
    if (latest) {
      console.log(`use latest version ${latest.name}: ${latest.tag_name}`)
      version = latest.tag_name
    }
  }

  if (!version) {
    console.error(`no version specified`)
    return false
  }

  const meta = release.find(x => x.tag_name === version)
  if (!meta) {
    console.error(`cannot find release of ${version}`)
    return false
  }

  const triplet = uis[ui].triplet()
  const asset = meta.assets.find(x => x.name.includes(triplet))
  if (!asset) {
    console.error(`cannot find proper release for triplet ${triplet}`)
    return false
  }

  if (asset.content_type !== 'application/zip') {
    console.error(`unsupport content type ${asset.content_type}`)
    return false
  }

  console.log('download release started')
  const data = await downloadRelease(asset.browser_download_url)
  console.log('download release done')

  await fs.writeFile(`${uis[ui].name}-${version}.zip`, Buffer.from(data))

  return true
}
