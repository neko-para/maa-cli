import { CreateEntry } from '../entry/create'
import { UpdateEntry } from '../entry/update'
import { Entry, EntryStage } from './entry'

class RootEntry extends Entry {
  get command() {
    return ''
  }

  get help() {
    return 'CLI tool for MaaFramework project'
  }

  get subEntries() {
    return [new UpdateEntry(), new CreateEntry()]
  }

  async execute(stage: EntryStage[]) {
    return true
  }
}

function printUsage(stages: EntryStage[], entry: Entry) {
  const prevCommands = stages?.map(x => `${x.command} [options...] `).join('') ?? ''

  if (entry.subEntries.length > 0) {
    console.log(`Usage: maa-cli${prevCommands}<command>`)
    console.log(`    ${entry.help}`)
    console.log('Commands:')
    for (const sube of entry.subEntries) {
      console.log(`    ${sube.command}: ${sube.help}`)
    }
  } else {
    console.log(`Usage: maa-cli${prevCommands}`)
    console.log(`    ${entry.help}`)
  }
}

async function processEntry(entry: Entry, args: string[], stages: EntryStage[] = []) {
  const stage: EntryStage = {
    command: entry.command,
    options: []
  }
  stages.push(stage)

  let showHelp = false
  while (args.length > 0) {
    const arg = args.shift()!
    if (arg.startsWith('-')) {
      if (arg === '--help') {
        showHelp = true
      } else {
        stage.options.push(arg)
      }
    } else {
      args.unshift(arg)
      break
    }
  }

  if (showHelp) {
    printUsage(stages, entry)
    return true
  }

  const subEntries = entry.subEntries
  if (subEntries.length > 0) {
    if (args.length === 0) {
      console.error('FATAL: no command specified!')
      printUsage(stages, entry)
      return false
    } else {
      const command = args.shift()!
      for (const sube of subEntries) {
        if (sube.command === command) {
          return processEntry(sube, [...args], [...stages])
        }
      }

      console.error(`FATAL: unknown command ${command}!`)
      printUsage(stages, entry)
      return false
    }
  } else {
    return await entry.execute(stages)
  }
}

export function launch(args: string[]) {
  return processEntry(new RootEntry(), args)
}
