import { Plugin as EsbuildPlugin, BuildOptions } from 'esbuild'

export const defineConfig = (config: Config | Config[]) => config

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
  extension?: BuildOptions['outExtension']
}

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
