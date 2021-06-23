import pkg from './package.json'
import { defineConfig } from './src'

export default defineConfig([
  {
    input: ['./src/cli.ts', './src/index.ts'],
    output: {
      format: 'cjs',
      dir: './dist',
    },
    external: Object.keys(pkg.dependencies),
  },
  {
    input: ['./src/index.ts'],
    output: {
      format: 'dts',
      dir: 'dist',
    },
  },
])
