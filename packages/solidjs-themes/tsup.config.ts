import { defineConfig } from 'tsup'
import { solidPlugin } from 'esbuild-plugin-solid'

export default defineConfig({
  entry: ['src/index.tsx'],
  // Ship both ESM and CJS for maximum compatibility
  format: ['esm', 'cjs'],
  // Generate TypeScript declaration files
  dts: true,
  // Remove previous build artifacts before each build
  clean: true,
  // solid-js is a peer dependency; do not bundle it
  external: ['solid-js', 'solid-js/web'],
  // Transform SolidJS JSX → createComponent / template calls
  esbuildPlugins: [solidPlugin()],
  splitting: false,
  sourcemap: true,
  minify: false,
  // Preserve JSX-adjacent comments for documentation tools
  banner: {},
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    }
  },
})
