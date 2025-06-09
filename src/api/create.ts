import { input, select } from '@inquirer/prompts'
import { execa } from 'execa'
import { select as multiselect } from 'inquirer-select-pro'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { checkRepo, repoDir, repos } from '../utils/repo'
import UpdateAction from './update'

type FeatureMetaChoice = {
  name: string
  desc: string
  apply?: string[]
}

type FeatureMetaItem = {
  name: string
} & (
  | {
      type: 'single'
      default: string
      choices: FeatureMetaChoice[]
    }
  | {
      type: 'multi'
      default: string[]
      choices: FeatureMetaChoice[]
    }
)

type FeatureMeta = {
  features: FeatureMetaItem[]
}

export type CreateOption = {
  silence?: boolean

  folder?: string
  features?: Record<string, string[]>
}

export default async function CreateAction(option: CreateOption) {
  if (!(await checkRepo(repos.template.subp))) {
    console.error('WARN: template not updated. start syncing.')
    if (!(await UpdateAction())) {
      return false
    }
  }

  let name: string = ''

  const checkName = async (folder: string) => {
    if (!folder.length) {
      return 'empty name'
    }
    if (/[\\\/]/.test(folder)) {
      return 'invalid name'
    }
    if (existsSync(folder)) {
      return 'folder exists'
    }
    return true
  }

  if (option.folder) {
    const err = await checkName(option.folder)
    if (typeof err === 'string') {
      console.error(err)
    } else {
      name = option.folder
    }
  }

  if (!name && !option.silence) {
    try {
      name = await input({ message: 'Input folder name', required: true, validate: checkName })
    } catch {
      return false
    }
  }

  if (!name) {
    console.error('no folder specified')
    return false
  }

  await fs.cp(repoDir(repos.template.subp, 'base'), path.resolve(name), {
    recursive: true
  })

  await execa`git -C ${name} init`

  const featureMeta = JSON.parse(
    await fs.readFile(repoDir(repos.template.subp, 'features', 'meta.json'), 'utf8')
  ) as FeatureMeta

  const applies: string[] = []
  const postHooks: {
    type: 'process'
    command: string[]
    cwd?: string
  }[] = []

  for (const feature of featureMeta.features) {
    switch (feature.type) {
      case 'single': {
        let choice = feature.default
        let needInput = !option.silence
        const cfg = option.features?.[feature.name]
        if (cfg !== undefined && cfg.length > 0) {
          if (feature.choices.find(x => x.name === cfg[0])) {
            choice = cfg[0]
            needInput = false
            console.log(`use ${cfg} for feature ${feature.name}`)
          } else {
            console.error(`unknown choice ${cfg} for feature ${feature.name}`)
          }
        }
        if (needInput) {
          try {
            choice = await select({
              message: `select feature ${feature.name}`,
              default: choice,
              choices: feature.choices.map(x => ({
                value: x.name,
                name: x.name,
                description: x.desc
              }))
            })
          } catch {
            return false
          }
        }
        console.log(`use ${choice} for feature ${feature.name}`)
        const choiceInfo = feature.choices.find(x => x.name === choice)
        applies.push(...(choiceInfo?.apply ?? []))
        break
      }
      case 'multi': {
        let choice = feature.default
        let needInput = !option.silence
        const cfg = option.features?.[feature.name]
        if (cfg !== undefined && cfg.length > 0) {
          const fail = cfg.find(c => !feature.choices.find(x => x.name === c))
          if (!fail) {
            choice = cfg
            needInput = false
            console.log(`use ${cfg.join(',')} for feature ${feature.name}`)
          } else {
            console.error(`unknown choice ${fail} for feature ${feature.name}`)
          }
        }
        if (needInput) {
          try {
            choice = await multiselect({
              message: `select feature ${feature.name}`,
              defaultValue: choice,
              options: feature.choices.map(x => ({
                value: x.name,
                name: x.name,
                description: x.desc
              }))
            })
          } catch {
            return false
          }
        }
        if (choice.length === 0) {
          console.log(`nothing for feature ${feature.name}`)
        } else {
          console.log(`use ${choice.join(',')} for feature ${feature.name}`)
        }
        const choiceInfo = choice.map(c => feature.choices.find(x => x.name === c)).flat()
        applies.push(
          ...(choiceInfo
            ?.map(x => x?.apply)
            .flat()
            .filter(x => x) as string[])
        )
        break
      }
    }
  }

  const applied = new Set<string>()
  for (const apply of applies) {
    if (applied.has(apply)) {
      continue
    }
    applied.add(apply)
    const patchFolder = repoDir(repos.template.subp, 'features', apply)
    for (const entry of await fs.readdir(patchFolder, {
      recursive: true
    })) {
      const source = path.join(patchFolder, entry)
      const stat = await fs.stat(source)
      if (stat.isFile()) {
        if (entry === '.patch') {
          await execa`git -C ${name} apply ${source}`
        } else if (entry === '.post-hook.json') {
          postHooks.push(...JSON.parse(await fs.readFile(source, 'utf8')))
        } else {
          await fs.copyFile(source, path.resolve(name, entry))
        }
      } else if (stat.isDirectory()) {
        await fs.mkdir(path.resolve(name, entry), { recursive: true })
      }
    }
  }

  for (const hook of postHooks) {
    switch (hook.type) {
      case 'process':
        await execa(hook.command[0], hook.command.slice(1), {
          cwd: hook.cwd,
          stdio: 'inherit'
        })
        break
    }
  }

  return true
}
