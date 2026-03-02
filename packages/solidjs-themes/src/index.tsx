/**
 * solidjs-themes
 *
 * A SolidJS port of next-themes. Provides:
 *  - <ThemeProvider>   reactive theme context
 *  - useTheme()        hook to read / change the active theme
 *  - <ThemeScript>     standalone FOUC-prevention inline script (for <head>)
 *
 * All reactive values returned by useTheme() are SolidJS Accessor<T> functions.
 * Call them inside JSX or reactive primitives (createEffect, createMemo, etc.)
 * to track changes automatically.
 */

import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type Accessor,
  type JSX,
} from 'solid-js'
import { isServer } from 'solid-js/web'

import { themeScript } from './script'
import type {
  Attribute,
  ThemeProviderProps,
  ThemeScriptProps,
  UseThemeProps,
  ValueObject,
} from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLOR_SCHEMES = ['light', 'dark'] as const
const MEDIA_QUERY = '(prefers-color-scheme: dark)'
const DEFAULT_THEMES = ['light', 'dark']

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Default (empty) context returned when useTheme() is called outside a
 * <ThemeProvider>.  Provides safe no-op defaults so callers don't crash.
 */
const defaultContext: UseThemeProps = {
  theme: () => undefined,
  setTheme: () => {},
  forcedTheme: () => undefined,
  resolvedTheme: () => undefined,
  systemTheme: () => undefined,
  themes: () => [],
}

const ThemeContext = createContext<UseThemeProps>(defaultContext)

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function saveToStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (_) {
    // localStorage may be unavailable (SSR, private mode, blocked extensions)
  }
}

function readFromStorage(key: string, fallback?: string): string | undefined {
  if (isServer) return undefined
  try {
    return localStorage.getItem(key) ?? fallback
  } catch (_) {
    return fallback
  }
}

function getSystemTheme(e?: MediaQueryList | MediaQueryListEvent): 'light' | 'dark' {
  if (!e) e = window.matchMedia(MEDIA_QUERY)
  return e.matches ? 'dark' : 'light'
}

/**
 * Temporarily inject a blanket `no-transition` style so that the attribute
 * change that accompanies a theme switch doesn't produce visual flicker from
 * CSS transitions.  Returns a cleanup function that re-enables transitions.
 */
function disableTransitions(nonce?: string): () => void {
  const style = document.createElement('style')
  if (nonce) style.setAttribute('nonce', nonce)
  style.appendChild(
    document.createTextNode(
      `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
    )
  )
  document.head.appendChild(style)

  return () => {
    // Force a synchronous style recalculation before re-enabling transitions.
    ;(() => window.getComputedStyle(document.body))()
    setTimeout(() => document.head.removeChild(style), 1)
  }
}

// ---------------------------------------------------------------------------
// ThemeScript – the FOUC-prevention inline script component
// ---------------------------------------------------------------------------

/**
 * Renders a tiny synchronous `<script>` tag that reads `localStorage` /
 * `prefers-color-scheme` and applies the resolved theme attribute to
 * `<html>` **before** the first paint.
 *
 * ### Placement
 * For maximum FOUC protection, place `<ThemeScript>` inside `<head>` in your
 * SolidStart `root.tsx` (or equivalent document root).  It must appear before
 * any CSS that depends on the theme attribute.
 *
 * ```tsx
 * // src/root.tsx (SolidStart)
 * import { ThemeScript } from 'solidjs-themes'
 *
 * export default function Root() {
 *   return (
 *     <Html>
 *       <Head>
 *         <ThemeScript storageKey="theme" defaultTheme="system" />
 *       </Head>
 *       <Body>…</Body>
 *     </Html>
 *   )
 * }
 * ```
 *
 * `<ThemeProvider>` also embeds `<ThemeScript>` automatically (with the same
 * props it receives), so in most cases you do **not** need to add it
 * separately unless you want `<head>` placement.
 */
export function ThemeScript(props: ThemeScriptProps): JSX.Element {
  const args = JSON.stringify([
    props.attribute ?? 'data-theme',
    props.storageKey ?? 'theme',
    props.defaultTheme,
    props.forcedTheme,
    props.themes ?? DEFAULT_THEMES,
    props.value,
    props.enableSystem ?? true,
    props.enableColorScheme ?? true,
  ]).slice(1, -1) // strip outer [ ]

  const scriptContent = `(${themeScript.toString()})(${args})`

  return (
    <script
      // Only emit the nonce attribute during SSR; on the client Solid will
      // skip patching it (it's already in the DOM after SSR serialisation).
      nonce={isServer ? props.nonce : ''}
      // eslint-disable-next-line solid/no-innerhtml
      innerHTML={scriptContent}
    />
  )
}

// ---------------------------------------------------------------------------
// ThemeProvider
// ---------------------------------------------------------------------------

/**
 * Provides the theme context to its subtree.
 *
 * ### Nested providers
 * If a `<ThemeProvider>` is rendered inside another one, it is silently
 * ignored and its children are rendered directly.  Only the **outermost**
 * provider governs the theme.  This mirrors next-themes behaviour and avoids
 * conflicting attribute writes on `<html>`.
 */
export function ThemeProvider(props: ThemeProviderProps): JSX.Element {
  const parentCtx = useContext(ThemeContext)

  // If we're already inside a provider, act as a transparent pass-through.
  if (parentCtx !== defaultContext) {
    return <>{props.children}</>
  }

  return <ThemeImpl {...props} />
}

// ---------------------------------------------------------------------------
// ThemeImpl – the real provider (only rendered once at the root level)
// ---------------------------------------------------------------------------

function ThemeImpl(props: ThemeProviderProps): JSX.Element {
  // ── Derived config (reactive to prop changes) ──────────────────────────────
  const storageKey = () => props.storageKey ?? 'theme'
  const attribute = (): Attribute | Attribute[] => props.attribute ?? 'data-theme'
  const enableSystem = () => props.enableSystem ?? true
  const enableColorScheme = () => props.enableColorScheme ?? true
  const shouldDisableTransitions = () => props.disableTransitionOnChange ?? false
  const configuredThemes = () => props.themes ?? DEFAULT_THEMES
  const valueMap = (): ValueObject | undefined => props.value

  const defaultTheme = () =>
    props.defaultTheme ?? (enableSystem() ? 'system' : 'light')

  /** All possible DOM values (used when clearing old classes). */
  const domValues = (): string[] => {
    const vm = valueMap()
    return vm ? Object.values(vm) : configuredThemes()
  }

  // ── Signals ────────────────────────────────────────────────────────────────

  // On the server we start with the defaultTheme; on the client we
  // read from localStorage.  The ThemeScript (injected into the SSR HTML)
  // has already patched the DOM attribute before Solid hydrates, so there
  // is no FOUC even though the signal starts with the server default.
  const initialTheme = isServer
    ? defaultTheme()
    : (readFromStorage(storageKey(), defaultTheme()) ?? defaultTheme())

  const [theme, setThemeRaw] = createSignal<string>(initialTheme)

  // System preference – resolved to 'light' | 'dark'.
  // Safe default for SSR is 'light'; ThemeScript handles the real value.
  const [systemThemePreference, setSystemThemePreference] = createSignal<'light' | 'dark'>(
    isServer ? 'light' : getSystemTheme()
  )

  // ── DOM application ────────────────────────────────────────────────────────

  function applyThemeToDOM(rawTheme: string): void {
    if (isServer) return

    // Resolve "system" → actual OS preference
    let resolved = rawTheme
    if (rawTheme === 'system' && enableSystem()) {
      resolved = getSystemTheme()
    }

    const vm = valueMap()
    const mappedName = vm ? vm[resolved] : resolved

    const reenable = shouldDisableTransitions() ? disableTransitions(props.nonce) : null

    const el = document.documentElement

    const applyAttr = (attr: Attribute) => {
      if (attr === 'class') {
        el.classList.remove(...domValues())
        if (mappedName) el.classList.add(mappedName)
      } else if (attr.startsWith('data-')) {
        if (mappedName != null && mappedName !== '') {
          el.setAttribute(attr, mappedName)
        } else {
          el.removeAttribute(attr)
        }
      }
    }

    const attrs = attribute()
    if (Array.isArray(attrs)) {
      attrs.forEach(applyAttr)
    } else {
      applyAttr(attrs)
    }

    if (enableColorScheme()) {
      const fallback: string | null = (COLOR_SCHEMES as readonly string[]).includes(defaultTheme())
        ? defaultTheme()
        : null
      const colorScheme = (COLOR_SCHEMES as readonly string[]).includes(resolved)
        ? resolved
        : fallback
      if (colorScheme) {
        el.style.colorScheme = colorScheme
      }
    }

    reenable?.()
  }

  // ── Reactive effects ───────────────────────────────────────────────────────

  // Apply theme to DOM whenever forcedTheme or the stored theme changes.
  // createEffect is browser-only in SolidJS (does not run during SSR).
  createEffect(() => {
    applyThemeToDOM(props.forcedTheme ?? theme())
  })

  // System media-query listener (client-only via onMount).
  onMount(() => {
    const media = window.matchMedia(MEDIA_QUERY)

    const handleChange = (e: MediaQueryList | MediaQueryListEvent) => {
      const sys = getSystemTheme(e)
      setSystemThemePreference(sys)
      if (theme() === 'system' && enableSystem() && !props.forcedTheme) {
        applyThemeToDOM('system')
      }
    }

    // addListener is deprecated but still widely supported (iOS < 14, etc.)
    media.addListener(handleChange as EventListener)
    handleChange(media) // run immediately for the current state

    onCleanup(() => media.removeListener(handleChange as EventListener))
  })

  // Cross-tab localStorage sync.
  onMount(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== storageKey()) return
      // If the item was deleted, fall back to the default theme.
      const next = e.newValue || defaultTheme()
      setThemeRaw(next)
    }

    window.addEventListener('storage', handleStorage)
    onCleanup(() => window.removeEventListener('storage', handleStorage))
  })

  // ── Public setter ──────────────────────────────────────────────────────────

  function setTheme(value: string | ((prev: string) => string)): void {
    if (typeof value === 'function') {
      setThemeRaw(prev => {
        const next = value(prev)
        saveToStorage(storageKey(), next)
        return next
      })
    } else {
      setThemeRaw(value)
      saveToStorage(storageKey(), value)
    }
  }

  // ── Derived memos ──────────────────────────────────────────────────────────

  const resolvedTheme = createMemo<string | undefined>(() => {
    const t = theme()
    return t === 'system' ? systemThemePreference() : t
  })

  const allThemes = createMemo<string[]>(() =>
    enableSystem() ? [...configuredThemes(), 'system'] : configuredThemes()
  )

  // ── Context value ──────────────────────────────────────────────────────────
  // All reactive state is exposed as Accessor<T> functions so consumers can
  // track them fine-grainedly inside JSX / effects.

  const contextValue: UseThemeProps = {
    theme,
    setTheme,
    forcedTheme: () => props.forcedTheme,
    resolvedTheme: () => (theme() === 'system' ? systemThemePreference() : theme()),
    systemTheme: () => (enableSystem() ? systemThemePreference() : undefined),
    themes: allThemes,
  }

  // ── Compute ThemeScript props for the auto-injected inline script ──────────

  const scriptDefaultTheme = () =>
    props.defaultTheme ?? (enableSystem() ? 'system' : 'light')

  return (
    <ThemeContext.Provider value={contextValue}>
      {/*
       * Embed the FOUC-prevention script.  During SSR this is serialised
       * into the HTML response and runs before Solid hydrates.  The script
       * is idempotent, so running it again on the client is harmless.
       *
       * For maximum FOUC protection (script in <head> before CSS), also
       * place <ThemeScript> manually inside <head> in your root.tsx.
       */}
      <ThemeScript
        attribute={props.attribute}
        storageKey={storageKey()}
        defaultTheme={scriptDefaultTheme()}
        forcedTheme={props.forcedTheme}
        themes={configuredThemes()}
        value={valueMap()}
        enableSystem={enableSystem()}
        enableColorScheme={enableColorScheme()}
        nonce={props.nonce}
      />
      {props.children}
    </ThemeContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// useTheme hook
// ---------------------------------------------------------------------------

/**
 * Returns the current theme context.
 *
 * Must be called inside a component that is a descendant of `<ThemeProvider>`.
 * When called outside a provider it returns safe no-op defaults.
 *
 * @example
 * ```tsx
 * import { useTheme } from 'solidjs-themes'
 *
 * function MyComponent() {
 *   const { theme, setTheme, resolvedTheme } = useTheme()
 *   return (
 *     <div>
 *       <p>Current theme: {theme()}</p>
 *       <p>Resolved: {resolvedTheme()}</p>
 *       <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
 *         Toggle
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useTheme(): UseThemeProps {
  return useContext(ThemeContext)
}

// ---------------------------------------------------------------------------
// Re-export types
// ---------------------------------------------------------------------------

export type {
  Attribute,
  ThemeProviderProps,
  ThemeScriptProps,
  UseThemeProps,
  ValueObject,
} from './types'
