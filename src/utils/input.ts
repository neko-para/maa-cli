import readline from 'node:readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

export async function inputText(
  prompt: string,
  check: (result: string) => Promise<string | undefined>
) {
  while (true) {
    const result = await new Promise<string>(resolve => rl.question(prompt, resolve))
    const err = await check(result)
    if (err) {
      console.error(err)
    } else {
      return result
    }
  }
}
