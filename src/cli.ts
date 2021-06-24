import fs from 'fs'
import path from 'path'
import { cac } from 'cac'
import type { Loader } from 'esbuild'
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
        ? await bundleConfig(
            configFile,
            options.watch && ((configs) => run(configs)),
          )
        : null
      await run(configs)
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

  function removeFile(filepath: string) {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
    }
  }

  async function bundleConfig(
    configFile: string,
    onRebuild?: (configs: Config[]) => void,
  ) {
    const { build } = await import('esbuild')
    const outFile = configFile.replace(/\.[a-z]+$/, '.bundled.js')
    const readConfig = () => {
      delete require.cache[outFile]
      const result = require(outFile)
      removeFile(outFile)
      return Array.isArray(result.default) ? result.default : [result.default]
    }
    try {
      await build({
        entryPoints: [configFile],
        format: 'cjs',
        outfile: outFile,
        platform: 'node',
        bundle: true,
        watch: onRebuild && {
          onRebuild(error) {
            if (error) return
            console.log(`Reloading config..`)
            onRebuild(readConfig())
          },
        },
        plugins: [
          {
            name: 'ignore',
            setup(build) {
              build.onResolve({ filter: /.*/ }, (args) => {
                if (!path.isAbsolute(args.path) && !/^[\.\/]/.test(args.path)) {
                  return { external: true }
                }
              })
              build.onLoad(
                { filter: /\.(js|ts|mjs|jsx|tsx)$/ },
                async (args) => {
                  const contents = await fs.promises.readFile(args.path, 'utf8')
                  const ext = path.extname(args.path)
                  return {
                    contents: contents
                      .replace(
                        /\b__dirname\b/g,
                        JSON.stringify(path.dirname(args.path)),
                      )
                      .replace(/\b__filename\b/g, JSON.stringify(args.path))
                      .replace(
                        /\bimport\.meta\.url\b/g,
                        JSON.stringify(`file://${args.path}`),
                      ),
                    loader: ext === '.mjs' ? 'js' : (ext.slice(1) as Loader),
                  }
                },
              )
            },
          },
        ],
      })
      const config = readConfig()
      return config
    } catch (error) {
      removeFile(outFile)
      throw error
    }
  }

  cli.help()
  cli.version(version)
  cli.parse()
}
