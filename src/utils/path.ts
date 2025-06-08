import os from 'node:os'
import path from 'node:path'

export const cacheDir = path.join(os.homedir(), '.maacli')
