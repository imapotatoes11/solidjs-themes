# solidjs-themes

Theme management for **SolidJS** and **SolidStart** – a port of [next-themes](https://github.com/pacocoursey/next-themes) using native Solid primitives.

See [`packages/solidjs-themes/README.md`](./packages/solidjs-themes/README.md) for the full API reference, SSR/FOUC guidance, and migration notes.

---

## Install

```bash
npm install solidjs-themes
# or
pnpm add solidjs-themes
```

## Quick start

```tsx
import { ThemeProvider, useTheme } from 'solidjs-themes'

// Wrap your app:
<ThemeProvider defaultTheme="system">{props.children}</ThemeProvider>

// Inside any component:
const { theme, setTheme } = useTheme()
<button onClick={() => setTheme('dark')}>{theme()}</button>
```

## Publishing

```bash
# 1. Prerequisites: npm account at npmjs.com

# 2. Log in
npm login              # prompts for username / password / OTP

# 3. Build
cd packages/solidjs-themes
pnpm install
pnpm build             # produces dist/

# 4. Verify package contents
npm pack --dry-run     # lists what will be published (dist/ + src/)

# 5. Publish (unscoped – "solidjs-themes" if available)
npm publish            # v0.1.0 by default

# 6. Verify
npm info solidjs-themes

# 7. Subsequent releases
# Bump version in package.json (semver: patch/minor/major), then:
npm version patch      # 0.1.0 → 0.1.1
pnpm build
npm publish

# 8. Tag releases on GitHub
git tag v0.1.0
git push origin v0.1.0
```

## License

MIT
