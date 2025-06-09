import { ProxyAgent } from 'undici'

let proxy: string | undefined = undefined

export function setProxy(url: string) {
  proxy = url
}

export function getAgent() {
  if (!proxy) {
    return undefined
  }
  return new ProxyAgent(proxy)
}
