import { Entry, EntryStage } from '../interface/entry.js'
import { cacheDir } from '../utils/path.js'
import { prepareRepo, repos } from '../utils/repo.js'

export class UpdateEntry extends Entry {
  get command() {
    return 'update'
  }

  get help() {
    return 'update template info'
  }

  get subEntries() {
    return []
  }

  async execute(stage: EntryStage[]) {
    await prepareRepo(repos.template.subp, repos.template.url)

    return true
  }
}
