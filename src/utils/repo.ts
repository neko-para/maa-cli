import { execa } from 'execa'
import { existsSync, statSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

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
    headers: {
      Authorization: `Bearer ${await getToken()}`
    }
  })
}

type RepoInfo = {
  subp: string
  url: string
  branch?: string
}

export const repos = {
  template: {
    subp: 'template',
    url: 'https://github.com/neko-para/maa-template'
  },
  mfaa: {
    subp: 'MFAAvalonia',
    url: 'https://github.com/SweetSmellFox/MFAAvalonia'
  }
} as const satisfies Record<string, RepoInfo>
