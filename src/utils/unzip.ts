import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import yauzl from 'yauzl'

export async function unzip(data: Buffer, folder: string) {
  return await new Promise<boolean>(resolve => {
    yauzl.fromBuffer(data, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error(err)
        resolve(false)
        return
      }

      zipfile.readEntry()
      zipfile.on('entry', async entry => {
        const filePath = path.join(folder, entry.fileName)

        // 判断是否是目录
        if (/\/$/.test(entry.fileName)) {
          await fs.mkdir(filePath, { recursive: true })
          zipfile.readEntry()
        } else {
          await fs.mkdir(path.dirname(filePath), { recursive: true })
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) throw err

            const writeStream = createWriteStream(filePath)
            readStream.pipe(writeStream)

            writeStream.on('close', () => {
              zipfile.readEntry()
            })
          })
        }
      })

      zipfile.on('end', () => {
        resolve(true)
      })

      zipfile.on('error', err => {
        console.error(err)
        resolve(false)
      })
    })
  })
}
