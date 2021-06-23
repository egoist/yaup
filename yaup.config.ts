import pkg from './package.json'
import { defineConfig } from './src'

export default defineConfig({
  input: ['./src/index.ts'],
  output: [
    {
      format: 'cjs',
      dir: './dist',
    },
    {
      format: 'dts',
      dir: './dist',
    },
  ],
  external: [...Object.keys(pkg.dependencies), 'typescript'],
})
