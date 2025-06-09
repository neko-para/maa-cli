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

  // triplet to search for correct release
  triplet: () => string
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
    ],
    triplet: () => {
      const os = {
        win32: 'win',
        linux: 'linux',
        darwin: 'osx'
      } as Record<NodeJS.Platform, string>
      const arch = {
        x64: 'x64',
        arm64: 'arm64'
      } as Record<NodeJS.Architecture, string>
      return `${os[process.platform]}-${arch[process.arch]}`
    }
  }
} as const satisfies Record<string, UiInfo>

export type UiTypes = keyof typeof uis

export async function fetchRelease(ui: UiTypes) {
  return (await (
    await fetchWithToken(
      `https://api.github.com/repos/${repos[ui].url.replace('https://github.com/', '')}/releases`
    )
  ).json()) as {
    name: string
    tag_name: string
    draft: boolean
    prerelease: boolean
    assets: {
      name: string
      content_type: string
      browser_download_url: string
    }[]
  }[]
}

export async function downloadRelease(url: string) {
  return await (await fetchWithToken(url)).arrayBuffer()
}
