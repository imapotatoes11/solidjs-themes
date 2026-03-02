import { defineConfig } from '@solidjs/start/config'

export default defineConfig({
  ssr: true,
  vite: {
    // solidjs-themes ships its raw source under the "solid" export condition
    // so that vite-plugin-solid can apply the correct babel transform.
    resolve: {
      conditions: ['solid'],
    },
  },
})
