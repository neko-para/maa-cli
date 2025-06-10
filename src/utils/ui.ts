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
    folder: 'ui/MFAAvalonia',
    symlink: [
      {
        link: 'ui/MFAAvalonia/resource',
        target: '../../assets/resource'
      },
      {
        link: 'ui/MFAAvalonia/interface.json',
        target: '../../assets/interface.json'
      }
    ]
  },
  mfw: {
    name: 'MFW',
    folder: 'ui/MFW',
    symlink: [
      {
        link: 'ui/MFW/resource',
        target: '../../assets/resource'
      },
      {
        link: 'ui/MFW/interface.json',
        target: '../../assets/interface.json'
      }
    ]
  }
} as const satisfies Record<string, UiInfo>

export type UiTypes = keyof typeof uis
