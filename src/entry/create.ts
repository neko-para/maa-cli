import { existsSync } from 'fs'
import fs from 'fs/promises'
import path from 'path'

import { Entry, EntryStage } from '../interface/entry.js'
import { launch } from '../interface/loader.js'
import { inputText } from '../utils/input.js'
import { cacheDir } from '../utils/path.js'
import { checkRepo, prepareRepo, repoDir, repos } from '../utils/repo.js'

export class CreateEntry extends Entry {
  get command() {
    return 'create'
  }

  get help() {
    return 'create project from template'
  }

  get subEntries() {
    return []
  }

  async execute(stage: EntryStage[]) {
    if (!(await checkRepo(repos.template.subp))) {
      console.error('WARN: template not updated. start syncing.')
      if (!(await launch([...stage[0].options, 'update']))) {
        return false
      }
    }

    const name = await inputText('Input folder name: ', async folder => {
      if (!folder.length) {
        return 'empty name'
      }
      if (/\\\//.test(folder)) {
        return 'invalid name'
      }
      if (existsSync(folder)) {
        return 'folder exists'
      }
    })

    await fs.cp(repoDir(repos.template.subp, 'base'), path.resolve(name), {
      recursive: true
    })

    return true
  }
}
