import { build, Plugin as EsbuildPlugin } from 'esbuild'
import { rollup } from 'rollup'

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
  external?: string[]
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

  resolveId: (
    id: string,
    importer?: string,
  ) => MaybePromise<string | undefined | null | false>
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

  return {
    async write(o: OutputOptions) {
      if (o.format === 'dts') {
        const dtsPlugin = await import('rollup-plugin-dts')
        const bundle = await rollup({
          input: inputFiles,
          plugins: [dtsPlugin.default()],
        })
        await bundle.write({
          format: 'esm',
          dir: o.dir,
        })
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
        plugins: [resolvePlugin],
        external: inputOptions.external,
      })
    },
  }
}
