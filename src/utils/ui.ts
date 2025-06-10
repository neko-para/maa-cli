import { fetchWithToken, repos } from './repo'

export type UiInfo = {
  name: string

  // where to extract
  folder: string

  // symlinks to associate resources
  symlink: {
    link: string
    target: string
  }[]
}

export const uis = {
  mfaa: {
    name: 'MFAAvalonia',
    folder: 'MFAAvalonia',
    symlink: [
      {
        link: 'MFAAvalonia/resource',
        target: '../assets/resource'
      },
      {
        link: 'MFAAvalonia/interface.json',
        target: '../assets/interface.json'
      }
    ]
  }
} as const satisfies Record<string, UiInfo>

export type UiTypes = keyof typeof uis
