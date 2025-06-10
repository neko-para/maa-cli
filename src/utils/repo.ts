import { select } from '@inquirer/prompts'
import { execa } from 'execa'
import { existsSync, statSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fetch } from 'undici'

import { getAgent } from './agent'
import { cacheDir } from './path'

async function isRepo(dir: string) {
  return await execa`git -C ${dir} status`.then(
    () => true,
    () => false
  )
}

export function repoDir(subp: string, ...secs: string[]) {
  return path.join(cacheDir, subp, ...secs)
}

export async function prepareRepo(subp: string, url: string, branch: string = 'main') {
  const dir = repoDir(subp)
  if (existsSync(dir) && statSync(dir).isDirectory() && (await isRepo(dir))) {
    await execa`git -C ${dir} remote set-url origin ${url}`
    await execa`git -C ${dir} fetch origin ${branch}`
    await execa`git -C ${dir} reset --hard origin/${branch}`
  } else {
    await execa`git clone ${url} ${dir}`
  }
}

export async function checkRepo(subp: string) {
  const dir = repoDir(subp)
  if (!(existsSync(dir) && statSync(dir).isDirectory())) {
    return false
  }
  return await isRepo(dir)
}

export async function authToken(token: string) {
  try {
    const resp = (await (
      await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    ).json()) as {
      login: string
    }
    return resp.login
  } catch {
    return undefined
  }
}

export async function getToken() {
  const filePath = path.join(cacheDir, '.token')
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return (await fs.readFile(filePath, 'utf8')).trim()
  } else {
    return undefined
  }
}

export async function setToken(token: string) {
  const filePath = path.join(cacheDir, '.token')
  await fs.writeFile(filePath, token)
}

export async function fetchWithToken(url: string) {
  const token = await getToken()
  const resp = await fetch(url, {
    dispatcher: getAgent(),
    headers: token
      ? {
          Authorization: `Bearer ${await getToken()}`
        }
      : {}
  })
  if (resp.status === 403 || resp.status === 429) {
    const reset = resp.headers.get('x-ratelimit-reset')
    let resetDate: string = '<unknown>'
    if (reset) {
      const date = new Date(parseInt(reset) * 1000)
      resetDate = date.toString()
    }
    console.error(`github api limit exceeeded. reset after ${reset}(${resetDate})`)
    if (!token) {
      console.info('consider use `auth` command to login for larger limit')
    }
    return null
  }
  return resp
}

type RepoInfo = {
  subp: string
  url: string
  triplet: () => string
}

export const repos = {
  template: {
    subp: 'template',
    url: 'https://github.com/neko-para/maa-template',
    triplet: () => '<no-release>'
  },
  maa: {
    subp: 'MaaFramework',
    url: 'https://github.com/MaaXYZ/MaaFramework',
    triplet: () => {
      const os = {
        win32: 'win',
        linux: 'linux',
        darwin: 'macos'
      } as Record<NodeJS.Platform, string>
      const arch = {
        x64: 'x86_64',
        arm64: 'aarch64'
      } as Record<NodeJS.Architecture, string>
      return `${os[process.platform]}-${arch[process.arch]}`
    }
  },
  mfaa: {
    subp: 'MFAAvalonia',
    url: 'https://github.com/SweetSmellFox/MFAAvalonia',
    triplet: () => {
      const os = {
        win32: 'win',
        linux: 'linux',
        darwin: 'osx'
      } as Record<NodeJS.Platform, string>
      const arch = {
        x64: 'x64',
        arm64: 'arm64'
      } as Record<NodeJS.Architecture, string>
      return `${os[process.platform]}-${arch[process.arch]}`
    }
  },
  mfw: {
    subp: 'MFW-PyQt6',
    url: 'https://github.com/overflow65537/MFW-PyQt6',
    triplet: () => {
      const os = {
        win32: 'win',
        linux: 'linux',
        darwin: 'macos'
      } as Record<NodeJS.Platform, string>
      const arch = {
        x64: 'x86_64',
        arm64: 'aarch64'
      } as Record<NodeJS.Architecture, string>
      return `${os[process.platform]}-${arch[process.arch]}`
    }
  }
} as const satisfies Record<string, RepoInfo>

export type RepoTypes = keyof typeof repos

export async function fetchReleaseInfo(repo: RepoTypes) {
  return ((await (
    await fetchWithToken(
      `https://api.github.com/repos/${repos[repo].url.replace('https://github.com/', '')}/releases`
    )
  )?.json()) ?? []) as {
    name: string
    tag_name: string
    draft: boolean
    prerelease: boolean
    assets: {
      name: string
      content_type: string
      browser_download_url: string
    }[]
  }[]
}

export async function downloadRelease(url: string) {
  return (await (await fetchWithToken(url))?.arrayBuffer()) ?? null
}

export async function prepareRelease(repo: RepoTypes, version?: string, silence: boolean = false) {
  const release = await fetchReleaseInfo(repo)
  const triplet = repos[repo].triplet()

  const cachePath = path.resolve(cacheDir, repos[repo].subp + '-release')
  const cacheDataPath = path.join(cachePath, 'data.zip')
  const cacheVerPath = path.join(cachePath, 'version')
  await fs.mkdir(cachePath, { recursive: true })

  if (!version) {
    const latest = release.find(x => !x.prerelease && !x.draft)
    if (latest) {
      if (silence) {
        console.log(`use latest version ${latest.name}: ${latest.tag_name}`)
      }
      version = latest.tag_name
    }
  }

  if (!silence) {
    const localVer = await fs.readFile(cacheVerPath, 'utf8')
    try {
      version = await select({
        message: 'select version',
        default: version,
        choices: release.map(x => {
          const asset = x.assets.find(x => x.name.includes(triplet))
          const attr = [
            x.tag_name === localVer ? '<downloaded>' : undefined,
            x.draft ? '<draft>' : undefined,
            x.prerelease ? '<prerelease>' : undefined,
            asset ? undefined : '<no-assets>'
          ]
            .filter(x => x)
            .join(' ')
          return {
            value: x.tag_name,
            name: `${x.name} ${attr}`,
            disabled: !asset
          }
        }),
        loop: false
      })
    } catch {
      return null
    }
  }

  if (!version) {
    console.error(`no version specified`)
    return null
  }

  const meta = release.find(x => x.tag_name === version)
  if (!meta) {
    console.error(`cannot find release of ${version}`)
    return null
  }

  const asset = meta.assets.find(x => x.name.includes(triplet))
  if (!asset) {
    console.error(`cannot find proper release for triplet ${triplet}`)
    return null
  }

  if (asset.content_type !== 'application/zip') {
    console.error(`unsupport content type ${asset.content_type}`)
    return null
  }

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
    const buf = await downloadRelease(asset.browser_download_url)
    if (!buf) {
      console.error('download failed')
      return null
    }
    zipData = Buffer.from(buf)
    console.log('download release done')
    await fs.writeFile(cacheDataPath, zipData)
    await fs.writeFile(cacheVerPath, version, 'utf8')
  }

  return zipData
}
