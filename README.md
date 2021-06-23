**💛 You can help the author become a full-time open-source maintainer by [sponsoring him on GitHub](https://github.com/sponsors/egoist).**

---

# yaup

[![npm version](https://badgen.net/npm/v/yaup)](https://npm.im/yaup)

## Why this over other esbuild/rollup wrappers?

- Unopinionated: close to raw esbuild, flexible configration
- Minimal: minimal API interface so it's easier to maintain

## Install

```bash
npm i yaup -D
```

## Usage

It's common to publish dual CommonJS/ES module packages with an extra TypeScript declaration file, all you need is creating a `yaup.config.ts`:

```ts
import { defineConfig } from 'yaup'

export default defineConfig({
  input: './src/index.ts',
  output: [
    {
      format: 'esm',
      dir: 'dist/esm',
    },
    {
      format: 'cjs',
      dir: 'dist/cjs',
    },
    {
      format: 'dts',
      dir: 'dist/types',
    },
  ],
})
```

Run `yaup` in this directory, it will emit:

- `dist/esm/index.js`
- `dist/cjs/index.js`
- `dist/types/index.d.ts`

Then, configure `package.json` accordingly:

```json
{
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.js",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "default": "./dist/cjs/index.js"
    }
  }
}
```

## License

MIT &copy; [EGOIST](https://github.com/sponsors/egoist)
