export type EntryStage = {
  command: string
  options: string[]
}

export abstract class Entry {
  abstract get command(): string
  abstract get help(): string
  abstract get subEntries(): Entry[]

  abstract execute(stage: EntryStage[]): Promise<boolean>
}
