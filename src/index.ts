import path from 'path'
import { build, Plugin as EsbuildPlugin } from 'esbuild'
import { rollup, watch as rollupWatch } from 'rollup'
import fs from 'fs'
import { isBinaryFile } from 'isbinaryfile'

export type Config = InputOptions & {
  output: OutputOptions | OutputOptions[]
}

export type InputOptions = {
  /**
   * The context directory
   */
  context?: string
  /**
   * Input files
   */
  input?: string | string[]
  plugins?: Plugin[]
  esbuildPlugins?: EsbuildPlugin[]
  external?: string[]
  watch?: boolean
  inject?: string[]
}

export type OutputOptions = {
  dir?: string
  format?: 'cjs' | 'esm' | 'iife' | 'dts'
  name?: string
  splitting?: boolean
}

export const defineConfig = (config: Config | Config[]) => config

type MaybePromise<T> = T | Promise<T>

export type Plugin = {
  name: string

  resolveId?: (
    id: string,
    importer?: string,
  ) => MaybePromise<string | undefined | null | false>

  transform?: (
    code: string,
    id: string,
  ) => MaybePromise<string | undefined | null>
}

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
        if (isBinaryFile(args.path)) return

        const contents = await fs.promises.readFile(args.path)
        if (isBinaryFile(contents)) return

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
              console.log('[dts] Building..')
            }
            if (e.code === 'END') {
              console.log('[dts] finished..')
            }
          })
        } else {
          console.log('[dts] Building..')
          const bundle = await rollup(rollupConfig)
          await bundle.write(rollupConfig.output)
        }
        return
      }
      await build({
        absWorkingDir: context,
        entryPoints: inputFiles,
        format: o.format,
        outdir: o.dir,
        bundle: true,
        platform: 'node',
        splitting: o.splitting,
        watch,
        incremental: watch,
        inject: [
          path.join(__dirname, '../runtime/react-shim.js'),
          ...(inputOptions.inject || []),
        ],
        plugins: [
          resolvePlugin,
          transformPlugin,
          {
            name: 'show-progress',
            setup(build) {
              build.onStart(() => {
                console.log(`[${o.format}] Building..`)
              })
              build.onEnd(() => {
                console.log(`[${o.format}] Finished..`)
              })
            },
          },
          ...(inputOptions.esbuildPlugins || []),
        ],
        external: inputOptions.external,
      })
    },
  }
}
