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
  return await fetch(url, {
    dispatcher: getAgent(),
    headers: {
      Authorization: `Bearer ${await getToken()}`
    }
  })
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
  }
} as const satisfies Record<string, RepoInfo>

export type RepoTypes = keyof typeof repos

export async function fetchReleaseInfo(repo: RepoTypes) {
  return (await (
    await fetchWithToken(
      `https://api.github.com/repos/${repos[repo].url.replace('https://github.com/', '')}/releases`
    )
  ).json()) as {
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
  return await (await fetchWithToken(url)).arrayBuffer()
}

export async function prepareRelease(repo: RepoTypes, version?: string) {
  const release = await fetchReleaseInfo(repo)

  if (!version) {
    const latest = release.find(x => !x.prerelease && !x.draft)
    if (latest) {
      console.log(`use latest version ${latest.name}: ${latest.tag_name}`)
      version = latest.tag_name
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

  const triplet = repos[repo].triplet()
  const asset = meta.assets.find(x => x.name.includes(triplet))
  if (!asset) {
    console.error(`cannot find proper release for triplet ${triplet}`)
    return null
  }

  if (asset.content_type !== 'application/zip') {
    console.error(`unsupport content type ${asset.content_type}`)
    return null
  }

  const cachePath = path.resolve(cacheDir, repos[repo].subp + '-release')
  const cacheDataPath = path.join(cachePath, 'data.zip')
  const cacheVerPath = path.join(cachePath, 'version')

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

  return zipData
}
