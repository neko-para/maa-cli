import { password } from '@inquirer/prompts'

import { authToken, setToken } from '../utils/repo'

export type AuthOption = {
  silence?: boolean

  token?: string
}

export default async function AuthAction(option: AuthOption) {
  let token: string = ''
  if (option.token) {
    token = option.token
  }
  if (!token && !option.silence) {
    token = await password({
      message: 'input github PAT'
    })
  }
  const user = await authToken(token)
  if (user) {
    console.log(`login as ${user}`)
    await setToken(token)
    return true
  } else {
    console.error('login failed')
    return false
  }
}
