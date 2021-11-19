import path from 'path'
import { build, Plugin as EsbuildPlugin } from 'esbuild'
import { rollup, watch as rollupWatch } from 'rollup'
import fs from 'fs'
import { isBinaryFile } from 'isbinaryfile'
import { InputOptions, OutputOptions } from './config'
import { timestamp, truthy } from './utils'

export * from './config'

export * from './cli'

export const yaup = async (inputOptions: InputOptions) => {
  const context = inputOptions.context || process.cwd()

  const inputFiles =
    typeof inputOptions.input === 'string'
      ? [inputOptions.input]
      : inputOptions.input

  const plugins = inputOptions.plugins || []

  const resolvePlugin: EsbuildPlugin = {
    name: 'resolve',

    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args) => {
        for (const plugin of plugins) {
          if (plugin.resolveId) {
            const resolved = await plugin.resolveId(args.path, args.importer)
            if (resolved == null) return
            if (resolved === false) return { path: args.path, external: true }
            if (typeof resolved === 'string') return { path: resolved }
          }
        }
      })
    },
  }

  const transformPlugin: EsbuildPlugin = {
    name: 'transform',

    setup(build) {
      const hasTransformHook = plugins.some((p) => p.transform)

      if (!hasTransformHook) return

      build.onLoad({ filter: /.*/ }, async (args) => {
        if (await isBinaryFile(args.path)) return

        const contents = await fs.promises.readFile(args.path)
        if (await isBinaryFile(contents)) return

        let textContents = contents.toString()

        for (const plugin of plugins) {
          if (plugin.transform) {
            const transformed = await plugin.transform(textContents, args.path)
            if (transformed == null) return
            if (typeof transformed === 'string')
              return { contents: transformed }
          }
        }
      })
    },
  }

  const watch = inputOptions.watch

  return {
    async write(o: OutputOptions) {
      if (o.format === 'dts') {
        const dtsPlugin = await import('rollup-plugin-dts')
        const rollupConfig = {
          input: inputFiles,
          plugins: [dtsPlugin.default()],
          output: {
            format: 'esm' as const,
            dir: o.dir,
          },
        }
        if (watch) {
          const watcher = rollupWatch(rollupConfig)
          watcher.on('event', (e) => {
            if (e.code === 'START') {
              console.log(`[${timestamp()}] [dts] Building..`)
            }
            if (e.code === 'END') {
              console.log(`[${timestamp()}] [dts] Finished..`)
            }
          })
        } else {
          console.log('[dts] Building..')
          const bundle = await rollup(rollupConfig)
          await bundle.write(rollupConfig.output)
          console.log('[dts] Finished..')
        }
        return
      }
      await build({
        absWorkingDir: context,
        entryPoints: inputFiles,
        format: o.format,
        outdir: o.dir,
        bundle: true,
        platform:
          !o.platform || o.platform === 'electron' ? 'node' : o.platform,
        splitting: o.splitting,
        watch,
        minify: o.minify,
        footer: o.footer,
        banner: o.banner,
        globalName: o.globalName,
        legalComments: o.legalComments,
        outExtension: o.extension,
        pure: o.pure,
        inject: [
          inputOptions.reactShim
            ? path.join(__dirname, '../runtime/react-shim.js')
            : '',
          ...(inputOptions.inject || []),
        ].filter(Boolean),
        plugins: [
          resolvePlugin,
          transformPlugin,
          {
            name: 'show-progress',
            setup(build) {
              build.onStart(() => {
                console.log(`[${timestamp()}] [${o.format}] Building..`)
              })
              build.onEnd(() => {
                console.log(`[${timestamp()}] [${o.format}] Finished..`)
              })
            },
          },
          ...(inputOptions.esbuildPlugins || []),
        ],
        external: [
          ...(inputOptions.external || []),
          o.platform === 'electron' && 'electron',
        ].filter(truthy),
      })
    },
  }
}
