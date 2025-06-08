import { launch } from './interface/loader.js'

function main() {
  const args = [...process.argv].slice(2)
  return launch(args)
}

main().then(suc => {
  process.exit(suc ? 0 : 1)
})
