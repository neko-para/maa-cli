import { execa } from 'execa'
import { existsSync, statSync } from 'node:fs'
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

type RepoInfo = {
  subp: string
  url: string
  branch?: string
}

export const repos = {
  template: {
    subp: 'template',
    url: 'https://github.com/neko-para/maa-template.git'
  }
} satisfies Record<string, RepoInfo>
