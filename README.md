## quick start

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
