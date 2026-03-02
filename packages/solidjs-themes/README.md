# solidjs-themes

> Theme management for **SolidJS** and **SolidStart** – a faithful port of
> [next-themes](https://github.com/pacocoursey/next-themes) using native Solid
> primitives.

---

## Features

- **Theme switching** – light, dark, and any number of custom themes
- **System mode** – follows `prefers-color-scheme` automatically
- **Persistence** – saves the user's choice to `localStorage`
- **Configurable attribute** – `data-*` attribute, CSS class, or multiple attributes
- **Value mapping** – map theme names to custom CSS class / attribute values
- **Transition disabling** – prevents CSS-transition flicker during theme switch
- **FOUC prevention** – a tiny inline `<script>` ensures the correct theme is
  applied before the first paint, even on a cold SSR page load
- **SSR-safe** – designed for SolidStart's server-rendering + client hydration
- **Zero runtime dependencies** (only a `solid-js` peer)
- **Tree-shakeable** ESM-first build

---

## Installation

```bash
npm install solidjs-themes
# or
pnpm add solidjs-themes
# or
yarn add solidjs-themes
```

`solid-js >= 1.8` is the only peer dependency.

---

## Quick start

### 1 – Wrap your app with `<ThemeProvider>`

```tsx
// src/app.tsx
import { ThemeProvider } from 'solidjs-themes'

export default function App(props) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="theme">
      {props.children}
    </ThemeProvider>
  )
}
```

### 2 – Use the theme in any component

```tsx
import { useTheme } from 'solidjs-themes'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  return (
    <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
      Current: {resolvedTheme()}
    </button>
  )
}
```

> **SolidJS note:** All reactive values returned by `useTheme()` are
> **Accessor functions** – you must call them (e.g. `theme()`, not `theme`)
> inside JSX or a reactive context.

---

## SolidStart SSR: preventing flash (FOUC)

Flash-of-Unstyled-Content (FOUC) happens when the browser first paints the page
using the server-rendered HTML (which doesn't know the user's stored theme) and
then the client JavaScript corrects it.

### How solidjs-themes prevents FOUC

1. `<ThemeProvider>` automatically embeds a `<ThemeScript>` as its first rendered
   child.  During SSR, SolidStart serialises this into the HTML response as a
   tiny `<script>` tag.
2. The browser parses and **synchronously executes** that script before any
   JavaScript framework hydrates.
3. The script reads `localStorage` and/or `window.matchMedia` and immediately
   sets the theme attribute/class on `<html>`.
4. By the time the browser paints, the correct theme is already active – no
   flash.

### Maximum FOUC protection: `<ThemeScript>` in `<head>`

For the best results, **also place `<ThemeScript>` inside `<head>`** in your
SolidStart root document.  Scripts in `<head>` run before `<link rel="stylesheet">`
blocks are processed, which is the earliest possible moment.

```tsx
// src/root.tsx
import { Head, Html, Body, Scripts } from '@solidjs/start'
import { ThemeScript } from 'solidjs-themes'

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        {/* ← Must use the same storageKey / defaultTheme as ThemeProvider */}
        <ThemeScript
          storageKey="theme"
          defaultTheme="system"
          enableSystem={true}
          attribute="data-theme"
        />
        <link rel="stylesheet" href="/styles.css" />
      </Head>
      <Body>
        {/* ThemeProvider goes around your app content */}
        <App>…</App>
        <Scripts />
      </Body>
    </Html>
  )
}
```

> Keep the props on `<ThemeScript>` in sync with those on `<ThemeProvider>` –
> they describe the same logic.  Using a shared config object is a good pattern:
>
> ```ts
> // src/theme-config.ts
> export const THEME_CONFIG = {
>   storageKey: 'theme',
>   defaultTheme: 'system',
>   attribute: 'data-theme',
>   enableSystem: true,
> } as const
> ```
>
> ```tsx
> <ThemeScript {...THEME_CONFIG} />
> <ThemeProvider {...THEME_CONFIG}>…</ThemeProvider>
> ```

### What runs where

| Code | Environment |
|---|---|
| `<ThemeScript>` script content | SSR (serialised to HTML) + browser (runs during HTML parse) |
| `createSignal` initial value | SSR + browser (server uses `defaultTheme`, client reads localStorage) |
| `createEffect` (DOM attribute write) | **Browser only** (Solid does not run effects during SSR) |
| `onMount` (matchMedia, storage listener) | **Browser only** |

---

## API reference

### `<ThemeProvider>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `themes` | `string[]` | `['light', 'dark']` | All available theme names |
| `defaultTheme` | `string` | `'system'` (or `'light'` when `enableSystem=false`) | Theme used when nothing is stored |
| `forcedTheme` | `string \| undefined` | – | Lock the page to a specific theme |
| `enableSystem` | `boolean` | `true` | Follow `prefers-color-scheme`; adds `'system'` to theme list |
| `disableTransitionOnChange` | `boolean` | `false` | Inject a no-transition style during theme switch |
| `enableColorScheme` | `boolean` | `true` | Set `document.documentElement.style.colorScheme` |
| `storageKey` | `string` | `'theme'` | `localStorage` key |
| `attribute` | `Attribute \| Attribute[]` | `'data-theme'` | HTML attribute(s) set on `<html>` |
| `value` | `Record<string, string>` | – | Map theme name → attribute / class value |
| `nonce` | `string` | – | CSP nonce for inline `<script>` and `<style>` |
| `children` | `JSX.Element` | – | App content |

### `useTheme()`

Returns a `UseThemeProps` object.  All reactive fields are `Accessor<T>`:

```ts
const {
  theme,          // Accessor<string | undefined> – stored theme name
  setTheme,       // (value: string | ((prev: string) => string)) => void
  forcedTheme,    // Accessor<string | undefined>
  resolvedTheme,  // Accessor<string | undefined> – 'system' resolved to 'light'/'dark'
  systemTheme,    // Accessor<'light' | 'dark' | undefined>
  themes,         // Accessor<string[]> – full list including 'system'
} = useTheme()
```

#### `setTheme`

Accepts a literal string or an updater function (same API as a SolidJS signal setter):

```ts
setTheme('dark')                         // literal
setTheme(prev => prev === 'dark' ? 'light' : 'dark')  // updater
```

### `<ThemeScript>`

Renders a synchronous inline `<script>` for FOUC prevention.

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultTheme` | `string` | **required** | Must match `<ThemeProvider defaultTheme>` |
| `storageKey` | `string` | `'theme'` | Must match `<ThemeProvider storageKey>` |
| `attribute` | `Attribute \| Attribute[]` | `'data-theme'` | Must match `<ThemeProvider attribute>` |
| `enableSystem` | `boolean` | `true` | Must match `<ThemeProvider enableSystem>` |
| `enableColorScheme` | `boolean` | `true` | Must match `<ThemeProvider enableColorScheme>` |
| `forcedTheme` | `string` | – | |
| `themes` | `string[]` | `['light', 'dark']` | |
| `value` | `Record<string, string>` | – | |
| `nonce` | `string` | – | |

---

## Recipes

### Class-based theming (Tailwind)

```tsx
<ThemeProvider attribute="class" defaultTheme="system">
  {/* Tailwind dark: variants now work automatically */}
  {props.children}
</ThemeProvider>
```

```css
/* tailwind.config.js */
module.exports = {
  darkMode: 'class',
  // ...
}
```

### Custom themes

```tsx
<ThemeProvider
  themes={['light', 'dark', 'solarized', 'nord']}
  defaultTheme="system"
  attribute="data-theme"
>
  {props.children}
</ThemeProvider>
```

```css
[data-theme="solarized"] { --bg: #fdf6e3; --fg: #657b83; }
[data-theme="nord"]       { --bg: #2e3440; --fg: #d8dee9; }
```

### Custom value mapping

Use when your CSS class names differ from theme names:

```tsx
<ThemeProvider
  attribute="class"
  themes={['brand-light', 'brand-dark']}
  value={{ 'brand-light': 'light-mode', 'brand-dark': 'dark-mode' }}
>
  {props.children}
</ThemeProvider>
```

The `<html>` element will receive `class="light-mode"` or `class="dark-mode"`.

### Multiple attributes simultaneously

```tsx
<ThemeProvider attribute={['data-theme', 'data-color-mode']} defaultTheme="dark">
  {props.children}
</ThemeProvider>
```

### Forced theme on a specific page/route

```tsx
// src/routes/print.tsx
import { ThemeProvider } from 'solidjs-themes'

export default function PrintPage() {
  return (
    <ThemeProvider forcedTheme="light">
      <article>Print-friendly content always in light mode.</article>
    </ThemeProvider>
  )
}
```

> **Note:** `forcedTheme` overrides the DOM attribute but does **not** change
> the user's stored preference.  Once `forcedTheme` is removed the stored theme
> is restored automatically.

### Disable transition flicker

```tsx
<ThemeProvider disableTransitionOnChange>
  {props.children}
</ThemeProvider>
```

A `<style>` tag with `transition: none !important` is injected just before and
removed just after the attribute is updated.

### CSP nonce

```tsx
// Obtain the nonce from your SSR framework / HTTP headers
const nonce = getRequestNonce()

<ThemeScript nonce={nonce} ... />
<ThemeProvider nonce={nonce} ...>
  {props.children}
</ThemeProvider>
```

---

## Nested providers

`<ThemeProvider>` detects if it is rendered inside another `<ThemeProvider>`.
If so, it acts as a **transparent pass-through** – it renders its children
without creating a new context.  Only the **outermost** provider governs the
theme for the whole application.

This means nested providers will **not**:
- Override the theme
- Write conflicting attributes to `<html>`
- Create separate localStorage entries

If you need per-subtree theming, open a GitHub issue – this is a deliberate
design decision that can be revisited.

---

## Migration from next-themes

| next-themes | solidjs-themes | Notes |
|---|---|---|
| `import { ThemeProvider, useTheme } from 'next-themes'` | `import { ThemeProvider, useTheme } from 'solidjs-themes'` | Same name |
| `const { theme } = useTheme()` | `const { theme } = useTheme()` | **Different**: `theme` is now `Accessor<string>`, call as `theme()` |
| `const { resolvedTheme } = useTheme()` | Same | Call as `resolvedTheme()` |
| `const { systemTheme } = useTheme()` | Same | Call as `systemTheme()` |
| `const { themes } = useTheme()` | Same | Call as `themes()` |
| `setTheme('dark')` | `setTheme('dark')` | Identical |
| `setTheme(prev => …)` | `setTheme(prev => …)` | Identical |
| `<ThemeScript>` in Next.js `<head>` | `<ThemeScript>` in SolidStart `root.tsx <Head>` | Placement is similar |
| `scriptProps` | Not supported | Removed (SolidStart doesn't need it) |

### Key SolidJS differences

- Reactive values are **accessor functions** – you call them: `theme()` not `theme`
- There is no `useMemo` / `useCallback` – Solid's fine-grained reactivity makes
  these unnecessary
- `createEffect` in SolidJS does **not** run during SSR – browser-only DOM
  operations are naturally safe inside effects

---

## Building the package

```bash
# From the package root:
pnpm install
pnpm build       # produces dist/index.mjs, dist/index.cjs, dist/index.d.ts

# Run tests:
pnpm test
```

---

## Contributing

Issues and PRs are welcome.  Please open an issue before submitting a large PR
to discuss the approach.

---

## License

MIT
