#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { cac } from 'cac'

const cli = cac('yaup')

cli
  .command('[options]', 'Build a project')
  .option('-c, --config [configFile]', 'Use a config file')
  .action(async (_, options) => {
    const { yaup } = await import('./')
    const configFile =
      options.config &&
      findConfigFile(
        process.cwd(),
        typeof options.config === 'string' ? options.config : null,
      )
    const config = configFile ? await bundleConfig(configFile) : {}
    const configItems = []
    for (const c of config) {
      if (Array.isArray(c.output)) {
        for (const output of c.output) {
          configItems.push({ ...c, output })
        }
      } else {
        configItems.push(c)
      }
    }

    for (const c of configItems) {
      const bundle = await yaup(c)
      await bundle.write(c.output)
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

async function bundleConfig(configFile: string) {
  const { build } = await import('esbuild')
  const outFile = configFile.replace(/\.[a-z]+$/, '.bundled.js')
  try {
    await build({
      entryPoints: [configFile],
      format: 'cjs',
      outfile: outFile,
      platform: 'node',
      bundle: true,
      plugins: [
        {
          name: 'ignore',
          setup(build) {
            build.onResolve({ filter: /.*/ }, (args) => {
              if (!path.isAbsolute(args.path) && !/^[\.\/]/.test(args.path)) {
                return { external: true }
              }
            })
          },
        },
      ],
    })
    const result = require(outFile)
    fs.unlinkSync(outFile)
    return Array.isArray(result.default) ? result.default : [result.default]
  } catch (error) {
    fs.unlinkSync(outFile)
    throw error
  }
}

cli.help()
cli.parse()
