import fs from 'fs'
import path from 'path'
import { cac } from 'cac'
import { bundleRequire } from 'bundle-require'
import { Config, InputOptions, OutputOptions } from './config'
import { name, version } from '../package.json'

type SimpleConfig = InputOptions & { output: OutputOptions }

export const createCLI = () => {
  const cli = cac('yaup')

  cli
    .command('[options]', 'Build a project')
    .option('-c, --config <configFile>', 'Use a specific config file')
    .option('-w, --watch', 'Run in watch mode')
    .action(async (_, options) => {
      // Seems like a esbuild issue, using `require` as a workaround as using `import()` will return undefined
      const { yaup }: typeof import('.') = require('./')

      async function run(configs: Config[]) {
        if (configs == null)
          throw new Error(`No config file was found, try ${name}.config.ts`)

        const configItems: Array<SimpleConfig> = []
        for (const c of configs) {
          if (Array.isArray(c.output)) {
            for (const output of c.output) {
              configItems.push({ ...c, output })
            }
          } else {
            configItems.push(c as SimpleConfig)
          }
        }

        for (const c of configItems) {
          if (options.watch) {
            c.watch = true
          }
          const bundle = await yaup(c)
          await bundle.write(c.output)
        }
      }

      const configFile = findConfigFile(
        process.cwd(),
        typeof options.config === 'string' ? options.config : null,
      )
      const configs = configFile
        ? await bundleRequire({
            filepath: configFile,
            onRebuild:
              options.watch &&
              (({ mod }) => {
                if (mod) {
                  run([].concat(mod.default))
                }
              }),
          }).then((res) => {
            return [].concat(res.mod.default)
          })
        : null
      if (configs) {
        await run(configs)
      }
    })

  function findConfigFile(cwd: string, name: string | null) {
    if (name) {
      const abs = path.join(cwd)
      if (!fs.existsSync(abs)) throw new Error(`Could not find ${abs}`)
      return abs
    }
    const files = [
      'yaup.config.ts',
      'yaup.config.js',
      'yaup.config.cjs',
      'yaup.config.mjs',
    ]
    for (const file of files) {
      const abs = path.join(cwd, file)
      if (fs.existsSync(abs)) {
        return abs
      }
    }
  }

  cli.help()
  cli.version(version)
  cli.parse()
}
