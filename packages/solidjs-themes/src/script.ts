/**
 * FOUC-prevention script.
 *
 * This function is **serialised to a string** and injected as an inline
 * `<script>` tag that runs synchronously before the first paint.
 *
 * RULES:
 *  - Must be a self-contained function with NO external references.
 *  - Do NOT import anything; do NOT reference module-level variables.
 *  - TypeScript type annotations are stripped by the build tool before
 *    serialisation, so they are fine for development.
 *
 * The script reads the stored theme from `localStorage`, falls back to the
 * OS `prefers-color-scheme` preference when the active theme is `"system"`,
 * and applies the resolved theme to the `<html>` element via attribute(s) /
 * CSS classes before any Solid component hydrates.
 */
export const themeScript = (
  attribute: string | string[],
  storageKey: string,
  defaultTheme: string,
  forcedTheme: string | undefined,
  themes: string[],
  value: Record<string, string> | undefined,
  enableSystem: boolean,
  enableColorScheme: boolean
): void => {
  const el = document.documentElement
  const systemColorSchemes = ['light', 'dark']

  /** Apply the resolved theme name to every configured attribute / class. */
  function applyThemeToDOM(theme: string): void {
    const attributes: string[] = Array.isArray(attribute) ? attribute : [attribute]

    attributes.forEach(function (attr) {
      if (attr === 'class') {
        // Build the full list of classes we might have previously added.
        const allMappedClasses: string[] = themes.map(function (t) {
          return (value && value[t]) ? value[t] : t
        })
        el.classList.remove.apply(el.classList, allMappedClasses)

        const mapped = (value && value[theme] != null) ? value[theme] : theme
        if (mapped) el.classList.add(mapped)
      } else if (attr.startsWith('data-')) {
        const mapped = (value && value[theme] != null) ? value[theme] : theme
        if (mapped != null && mapped !== '') {
          el.setAttribute(attr, mapped)
        } else {
          el.removeAttribute(attr)
        }
      }
    })

    if (enableColorScheme && systemColorSchemes.indexOf(theme) !== -1) {
      el.style.colorScheme = theme
    }
  }

  /** Return 'dark' or 'light' based on the OS media query. */
  function getSystemTheme(): string {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  if (forcedTheme) {
    applyThemeToDOM(forcedTheme)
    return
  }

  try {
    const stored = localStorage.getItem(storageKey)
    const themeName = stored || defaultTheme
    const isSystem = enableSystem && themeName === 'system'
    const resolved = isSystem ? getSystemTheme() : themeName
    applyThemeToDOM(resolved)
  } catch (_) {
    // localStorage may be unavailable (private browsing, SSR, blocked by
    // browser extension, etc.). Fall through silently.
  }
}
