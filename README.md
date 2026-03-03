# Solidjs Themes

This is a port of [next-themes](https://github.com/pacocoursey/next-themes).

Most of it was vibe coded but everything should be working.

## Quick Start

```bash
npm install solidjs-themes
```

```tsx
import { ThemeProvider, useTheme } from 'solidjs-themes'

// Wrap your app:
<ThemeProvider defaultTheme="system">…</ThemeProvider>

// Inside any component:
const { theme, setTheme } = useTheme()
<button onClick={() => setTheme('dark')}>{theme()}</button>
```

See [`packages/solidjs-themes/README.md`](./packages/solidjs-themes/README.md)
for the full API reference, SSR/FOUC guidance, and migration notes.

---
