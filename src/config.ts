import { Plugin as EsbuildPlugin, BuildOptions } from 'esbuild'

export const defineConfig = (
  /**
   * Multiple configurations = multiple builds
   */
  config: Config | Config[],
) => config

export type Config = InputOptions & {
  /**
   * You can also supply multiple output configurations
   */
  output: OutputOptions | OutputOptions[]
}

export type InputOptions = {
  /**
   * The context directory
   *
   * @default `process.cwd()`
   */
  context?: string
  /**
   * Input files
   */
  input?: string | string[]
  plugins?: Plugin[]
  esbuildPlugins?: EsbuildPlugin[]
  /**
   * Mark modules as external
   *
   * TODO: mark nesting module as external too,
   * e.g. `external: ['preact']` should also mark `preact/compat` as external.
   */
  external?: string[]
  watch?: boolean
  /**
   * @see https://esbuild.github.io/api/#inject
   */
  inject?: string[]
  /**
   * Allow JSX without importing `react`
   */
  reactShim?: boolean
}

export type OutputOptions = {
  dir?: string
  format?: 'cjs' | 'esm' | 'iife' | 'dts'
  /**
   * Global name for IIFE module
   */
  globalName?: string
  /**
   * Code splitting, for `esm` format only
   */
  splitting?: boolean
  minify?: boolean
  banner?: {
    js?: string
    css?: string
  }
  footer?: {
    js?: string
    css?: string
  }
  legalComments?: BuildOptions['legalComments']
  /**
   * @see https://esbuild.github.io/api/#out-extension
   */
  extension?: BuildOptions['outExtension']
  /**
   * @see https://esbuild.github.io/api/#pure
   */
  pure?: string[]
}

type MaybePromise<T> = T | Promise<T>

/**
 * yaup plugin, modeled after rollup plugin
 */
export type Plugin = {
  name: string

  /**
   * Similar to rollup's `resolveId` hook
   */
  resolveId?: (
    id: string,
    importer?: string,
  ) => MaybePromise<string | undefined | null | false>

  /**
   * Similar to rollup's `transform` hook
   */
  transform?: (
    code: string,
    id: string,
  ) => MaybePromise<string | undefined | null>
}
