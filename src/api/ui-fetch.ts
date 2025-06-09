import { select } from '@inquirer/prompts'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import yauzl from 'yauzl'

import { cacheDir } from '../utils/path'
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

  const cachePath = path.resolve(cacheDir, ui)
  const cacheDataPath = path.resolve(cacheDir, ui, 'data.zip')
  const cacheVerPath = path.resolve(cacheDir, ui, 'version')

  await fs.mkdir(cachePath, { recursive: true })

  let zipData: Buffer

  if (
    existsSync(cacheVerPath) &&
    existsSync(cacheDataPath) &&
    (await fs.readFile(cacheVerPath, 'utf8')) === version
  ) {
    console.log('use downloaded release')
    zipData = await fs.readFile(cacheDataPath)
  } else {
    console.log('download release started')
    zipData = Buffer.from(await downloadRelease(asset.browser_download_url))
    console.log('download release done')
    await fs.writeFile(cacheDataPath, zipData)
    await fs.writeFile(cacheVerPath, version, 'utf8')
  }

  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(zipData, { lazyEntries: true }, (err, zipfile) => {
      if (err) throw err

      zipfile.readEntry()

      zipfile.on('entry', async entry => {
        const filePath = path.join(uis[ui].folder, entry.fileName)

        // 判断是否是目录
        if (/\/$/.test(entry.fileName)) {
          await fs.mkdir(filePath, { recursive: true })
          zipfile.readEntry()
        } else {
          await fs.mkdir(path.dirname(filePath), { recursive: true })
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) throw err

            const writeStream = createWriteStream(filePath)
            readStream.pipe(writeStream)

            writeStream.on('close', () => {
              zipfile.readEntry()
            })
          })
        }
      })

      zipfile.on('end', () => {
        resolve()
      })

      zipfile.on('error', err => {
        reject(err)
      })
    })
  })

  for (const link of uis[ui].symlink) {
    await fs.symlink(link.target, link.link)
  }

  return true
}
