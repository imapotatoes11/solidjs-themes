import type { Accessor, JSX } from 'solid-js'

// ---------------------------------------------------------------------------
// Attribute types
// ---------------------------------------------------------------------------

export type DataAttribute = `data-${string}`

/** The HTML attribute that ThemeProvider sets on the root element. */
export type Attribute = DataAttribute | 'class'

// ---------------------------------------------------------------------------
// ValueObject – maps theme name → attribute value
// ---------------------------------------------------------------------------

export interface ValueObject {
  [themeName: string]: string
}

// ---------------------------------------------------------------------------
// Context / hook API
// ---------------------------------------------------------------------------

/**
 * The object returned by `useTheme()`.
 *
 * All reactive properties are **SolidJS Accessor functions** – you must call
 * them (e.g. `theme()`) inside a reactive context (JSX, createEffect, etc.)
 * for fine-grained reactivity to work.
 */
export interface UseThemeProps {
  /**
   * Returns the currently active theme name as stored in state
   * (e.g. `"light"`, `"dark"`, `"system"`, or a custom name).
   * Reactive accessor – call as `theme()`.
   */
  theme: Accessor<string | undefined>

  /**
   * Sets the active theme.  Accepts either a literal string or an updater
   * function `(prevTheme) => nextTheme` (same pattern as SolidJS `setSignal`).
   * The value is persisted to `localStorage`.
   */
  setTheme: (value: string | ((prevTheme: string) => string)) => void

  /**
   * The forced theme imposed by the nearest `<ThemeProvider forcedTheme="…">`.
   * `undefined` when no theme is being forced.
   * Reactive accessor – call as `forcedTheme()`.
   */
  forcedTheme: Accessor<string | undefined>

  /**
   * The *resolved* theme.  When the active theme is `"system"` this returns
   * the OS preference (`"light"` or `"dark"`); otherwise identical to `theme`.
   * Reactive accessor – call as `resolvedTheme()`.
   */
  resolvedTheme: Accessor<string | undefined>

  /**
   * The current OS color-scheme preference (`"light"` or `"dark"`).
   * Only defined when `enableSystem` is `true`.
   * Reactive accessor – call as `systemTheme()`.
   */
  systemTheme: Accessor<'dark' | 'light' | undefined>

  /**
   * The full list of available theme names (includes `"system"` when
   * `enableSystem` is `true`).
   * Reactive accessor – call as `themes()`.
   */
  themes: Accessor<string[]>
}

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  children?: JSX.Element

  /** All available theme names.  Default: `['light', 'dark']`. */
  themes?: string[]

  /**
   * Lock the page to a specific theme, ignoring the user's stored preference.
   * The stored preference is preserved in `localStorage` and restored when
   * `forcedTheme` is removed.
   */
  forcedTheme?: string

  /**
   * Automatically follow `prefers-color-scheme` when the active theme is
   * `"system"`.  Adds `"system"` to the available themes list.
   * Default: `true`.
   */
  enableSystem?: boolean

  /**
   * Temporarily inject a `<style>` tag that disables all CSS transitions
   * while the theme attribute changes.  Prevents transition flicker.
   * Default: `false`.
   */
  disableTransitionOnChange?: boolean

  /**
   * Set the CSS `color-scheme` property on `<html>` so that browser native
   * UI (scrollbars, inputs, etc.) matches the active theme.
   * Default: `true`.
   */
  enableColorScheme?: boolean

  /**
   * The `localStorage` key used to persist the user's chosen theme.
   * Default: `"theme"`.
   */
  storageKey?: string

  /**
   * The theme to use when no value is found in `localStorage`.
   * Default: `"system"` when `enableSystem` is `true`, otherwise `"light"`.
   */
  defaultTheme?: string

  /**
   * The HTML attribute set on the root element (`<html>` by default) to
   * reflect the active theme.  Accepts:
   * - `"class"` – adds/removes CSS class names
   * - `"data-*"` – e.g. `"data-theme"` (default), `"data-mode"`
   * - An array of the above to apply multiple attributes simultaneously
   */
  attribute?: Attribute | Attribute[]

  /**
   * An optional mapping from theme name → attribute value.
   * Useful when CSS class names differ from theme names, e.g.
   * `{ dark: 'theme-dark', light: 'theme-light' }`.
   */
  value?: ValueObject

  /**
   * A [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) nonce
   * added to the inline `<script>` and `<style>` elements emitted by the
   * library.  Provide this when your CSP policy requires it.
   */
  nonce?: string
}

// ---------------------------------------------------------------------------
// ThemeScript props (the FOUC-prevention script component)
// ---------------------------------------------------------------------------

/**
 * Props for the standalone `<ThemeScript>` component.
 * Identical to `ThemeProviderProps` minus `children`, plus a required
 * `defaultTheme` field (already resolved from the `enableSystem` fallback).
 */
export interface ThemeScriptProps extends Omit<ThemeProviderProps, 'children'> {
  /** The resolved default theme (required when using ThemeScript standalone). */
  defaultTheme: string
}
