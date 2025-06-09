import { applyEdits, modify } from 'jsonc-parser'
import fs from 'node:fs/promises'

export type JsonPatch = (
  | {
      op: 'add'
      path: string
      value: any
    }
  | {
      op: 'remove'
      path: string
    }
  | {
      op: 'replace'
      path: string
      value: any
    }
  | {
      op: 'move'
      path: string
      from: string
    }
  | {
      op: 'copy'
      path: string
      from: string
    }
)[]

function parsePath(path: string) {
  return path
    .split('/')
    .filter(x => x)
    .map(x => x.replaceAll('~1', '/').replaceAll('~0', '~'))
}

export async function patchJson(patches: JsonPatch, file: string) {
  const content = await fs.readFile(file, 'utf8')
  for (const patch of patches) {
    const jsonPath = parsePath(patch.path)
    switch (patch.op) {
      case 'add':

      case 'remove':
      case 'replace':
      case 'move':
      case 'copy':
    }
  }
}
