// @vitest-environment jsdom
/**
 * solidjs-themes – unit / integration tests
 *
 * We use @solidjs/testing-library which wraps solid-testing-library and
 * provides render / cleanup helpers analogous to @testing-library/react.
 *
 * Test categories:
 *  1. defaultTheme resolution
 *  2. Nested provider pass-through
 *  3. localStorage persistence
 *  4. Custom storageKey
 *  5. Attribute application (data-*, class, arrays)
 *  6. Value mapping
 *  7. forcedTheme
 *  8. System theme tracking
 *  9. color-scheme CSS property
 * 10. setTheme (literal + updater function)
 * 11. Cross-tab storage events
 * 12. themeScript (FOUC-prevention script logic)
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { cleanup, render, screen } from '@solidjs/testing-library'
import { createSignal, type JSX } from 'solid-js'
import { ThemeProvider, useTheme } from '../src/index'
import { themeScript } from '../src/script'
import type { ThemeProviderProps } from '../src/types'

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

let store: Record<string, string> = {}

const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = String(value) }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
  key: vi.fn(() => null),
  get length() { return Object.keys(store).length },
}

// ---------------------------------------------------------------------------
// matchMedia mock helper
// ---------------------------------------------------------------------------

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
})

beforeEach(() => {
  mockMatchMedia(false) // default: prefers light
  store = {}
  vi.clearAllMocks()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-mode')
  document.documentElement.className = ''
  document.documentElement.style.colorScheme = ''
})

afterEach(() => {
  cleanup()
})

afterAll(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Helper: render a component inside a ThemeProvider
// ---------------------------------------------------------------------------

function renderWithProvider(
  providerProps: Partial<ThemeProviderProps>,
  ui: () => JSX.Element
) {
  return render(() => (
    <ThemeProvider {...providerProps}>
      {ui()}
    </ThemeProvider>
  ))
}

// ---------------------------------------------------------------------------
// Helper: read context from a rendered hook
// ---------------------------------------------------------------------------

function ThemeDisplay() {
  const ctx = useTheme()
  return (
    <div>
      <span data-testid="theme">{ctx.theme() ?? ''}</span>
      <span data-testid="resolved">{ctx.resolvedTheme() ?? ''}</span>
      <span data-testid="system">{ctx.systemTheme() ?? ''}</span>
      <span data-testid="forced">{ctx.forcedTheme() ?? ''}</span>
      <span data-testid="themes">{ctx.themes().join(',')}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 1. defaultTheme resolution
// ---------------------------------------------------------------------------

describe('defaultTheme', () => {
  it('defaults to "system" with enableSystem=true (default)', () => {
    renderWithProvider({}, () => <ThemeDisplay />)
    expect(screen.getByTestId('theme').textContent).toBe('system')
  })

  it('resolves system to the OS preference ("light" here)', () => {
    mockMatchMedia(false)
    renderWithProvider({}, () => <ThemeDisplay />)
    expect(screen.getByTestId('resolved').textContent).toBe('light')
    expect(screen.getByTestId('system').textContent).toBe('light')
  })

  it('resolves system to "dark" when OS prefers dark', () => {
    mockMatchMedia(true)
    renderWithProvider({}, () => <ThemeDisplay />)
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
    expect(screen.getByTestId('system').textContent).toBe('dark')
  })

  it('defaults to "light" when enableSystem=false', () => {
    renderWithProvider({ enableSystem: false }, () => <ThemeDisplay />)
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(screen.getByTestId('resolved').textContent).toBe('light')
  })

  it('respects an explicit defaultTheme="dark"', () => {
    renderWithProvider({ defaultTheme: 'dark', enableSystem: false }, () => <ThemeDisplay />)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
  })

  it('reads a stored theme from localStorage', () => {
    store['theme'] = 'dark'
    renderWithProvider({ enableSystem: false }, () => <ThemeDisplay />)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })
})

// ---------------------------------------------------------------------------
// 2. Nested providers
// ---------------------------------------------------------------------------

describe('nested ThemeProvider', () => {
  it('ignores inner provider – uses outer provider props', () => {
    render(() => (
      <ThemeProvider defaultTheme="dark" enableSystem={false}>
        <ThemeProvider defaultTheme="light" enableSystem={false}>
          <ThemeDisplay />
        </ThemeProvider>
      </ThemeProvider>
    ))
    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })
})

// ---------------------------------------------------------------------------
// 3. localStorage persistence
// ---------------------------------------------------------------------------

describe('localStorage persistence', () => {
  it('does NOT write to localStorage on initial mount', () => {
    renderWithProvider({ defaultTheme: 'light', enableSystem: false }, () => <ThemeDisplay />)
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('writes to localStorage when setTheme is called', () => {
    let setter!: (v: string) => void
    function Capture() {
      const ctx = useTheme()
      setter = ctx.setTheme
      return null
    }
    renderWithProvider({}, () => <Capture />)
    setter('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
  })
})

// ---------------------------------------------------------------------------
// 4. Custom storageKey
// ---------------------------------------------------------------------------

describe('custom storageKey', () => {
  it('reads from the custom key', () => {
    store['my-theme'] = 'dark'
    renderWithProvider({ storageKey: 'my-theme', enableSystem: false }, () => <ThemeDisplay />)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })

  it('writes to the custom key', () => {
    let setter!: (v: string) => void
    function Capture() {
      const ctx = useTheme()
      setter = ctx.setTheme
      return null
    }
    renderWithProvider({ storageKey: 'my-theme' }, () => <Capture />)
    setter('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('my-theme', 'light')
  })
})

// ---------------------------------------------------------------------------
// 5. Attribute application
// ---------------------------------------------------------------------------

describe('attribute application', () => {
  it('sets data-theme attribute by default', () => {
    renderWithProvider({ defaultTheme: 'dark', enableSystem: false }, () => <ThemeDisplay />)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('adds a CSS class when attribute="class"', () => {
    renderWithProvider({ attribute: 'class', defaultTheme: 'dark', enableSystem: false }, () => (
      <ThemeDisplay />
    ))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('uses a custom data attribute', () => {
    renderWithProvider(
      { attribute: 'data-mode', defaultTheme: 'light', enableSystem: false },
      () => <ThemeDisplay />
    )
    expect(document.documentElement.getAttribute('data-mode')).toBe('light')
  })

  it('supports multiple attributes', () => {
    renderWithProvider(
      {
        attribute: ['data-theme', 'data-mode'],
        defaultTheme: 'dark',
        enableSystem: false,
      },
      () => <ThemeDisplay />
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
  })

  it('removes old class and adds new class on theme change', () => {
    let setter!: (v: string) => void
    function Capture() {
      const ctx = useTheme()
      setter = ctx.setTheme
      return null
    }
    renderWithProvider({ attribute: 'class', defaultTheme: 'light', enableSystem: false }, () => (
      <Capture />
    ))
    expect(document.documentElement.classList.contains('light')).toBe(true)
    setter('dark')
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 6. Value mapping
// ---------------------------------------------------------------------------

describe('value mapping', () => {
  it('maps theme name to a custom DOM value', () => {
    renderWithProvider(
      {
        themes: ['night', 'day'],
        value: { night: 'theme-dark', day: 'theme-light' },
        defaultTheme: 'night',
        enableSystem: false,
      },
      () => <ThemeDisplay />
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('theme-dark')
  })

  it('removes attribute when mapped value is empty string', () => {
    renderWithProvider(
      {
        themes: ['light', 'dark'],
        value: { dark: 'dark-mode', light: '' },
        defaultTheme: 'light',
        enableSystem: false,
      },
      () => <ThemeDisplay />
    )
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('maps custom class names', () => {
    renderWithProvider(
      {
        attribute: 'class',
        themes: ['brand-dark', 'brand-light'],
        value: { 'brand-dark': 'dark', 'brand-light': 'light' },
        defaultTheme: 'brand-dark',
        enableSystem: false,
      },
      () => <ThemeDisplay />
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('brand-dark')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 7. forcedTheme
// ---------------------------------------------------------------------------

describe('forcedTheme', () => {
  it('exposes forcedTheme from context', () => {
    renderWithProvider({ forcedTheme: 'dark' }, () => <ThemeDisplay />)
    expect(screen.getByTestId('forced').textContent).toBe('dark')
  })

  it('applies forcedTheme to DOM regardless of stored theme', () => {
    store['theme'] = 'light'
    renderWithProvider({ forcedTheme: 'dark', enableSystem: false }, () => <ThemeDisplay />)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    // The user-set theme is still 'light' in state
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })
})

// ---------------------------------------------------------------------------
// 8. System theme
// ---------------------------------------------------------------------------

describe('system theme', () => {
  it('systemTheme follows OS preference', () => {
    mockMatchMedia(true)
    renderWithProvider({}, () => <ThemeDisplay />)
    expect(screen.getByTestId('system').textContent).toBe('dark')
  })

  it('systemTheme is undefined when enableSystem=false', () => {
    renderWithProvider({ enableSystem: false }, () => <ThemeDisplay />)
    expect(screen.getByTestId('system').textContent).toBe('')
  })

  it('includes "system" in themes list when enableSystem=true', () => {
    renderWithProvider({}, () => <ThemeDisplay />)
    expect(screen.getByTestId('themes').textContent).toContain('system')
  })

  it('does NOT include "system" in themes list when enableSystem=false', () => {
    renderWithProvider({ enableSystem: false }, () => <ThemeDisplay />)
    expect(screen.getByTestId('themes').textContent).not.toContain('system')
  })
})

// ---------------------------------------------------------------------------
// 9. color-scheme CSS property
// ---------------------------------------------------------------------------

describe('color-scheme', () => {
  it('sets color-scheme when the active theme is "light"', () => {
    renderWithProvider({ defaultTheme: 'light', enableSystem: false }, () => <ThemeDisplay />)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('sets color-scheme when the active theme is "dark"', () => {
    renderWithProvider({ defaultTheme: 'dark', enableSystem: false }, () => <ThemeDisplay />)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('does NOT set color-scheme when enableColorScheme=false', () => {
    renderWithProvider(
      { defaultTheme: 'dark', enableSystem: false, enableColorScheme: false },
      () => <ThemeDisplay />
    )
    expect(document.documentElement.style.colorScheme).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 10. setTheme
// ---------------------------------------------------------------------------

describe('setTheme', () => {
  it('updates theme with a literal string', () => {
    let ctx!: ReturnType<typeof useTheme>
    function Capture() {
      ctx = useTheme()
      return <ThemeDisplay />
    }
    renderWithProvider({ defaultTheme: 'light', enableSystem: false }, () => <Capture />)
    expect(ctx.theme()).toBe('light')
    ctx.setTheme('dark')
    expect(ctx.theme()).toBe('dark')
  })

  it('updates theme with an updater function', () => {
    let ctx!: ReturnType<typeof useTheme>
    function Capture() {
      ctx = useTheme()
      return <ThemeDisplay />
    }
    renderWithProvider({ defaultTheme: 'light', enableSystem: false }, () => <Capture />)
    ctx.setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
    expect(ctx.theme()).toBe('dark')
    ctx.setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
    expect(ctx.theme()).toBe('light')
  })

  it('updater receives the latest state (not a stale closure)', () => {
    const log: string[] = []
    let ctx!: ReturnType<typeof useTheme>
    function Capture() {
      ctx = useTheme()
      return null
    }
    renderWithProvider({ defaultTheme: 'light', enableSystem: false }, () => <Capture />)

    ctx.setTheme(prev => { log.push(`1:${prev}`); return 'dark' })
    ctx.setTheme(prev => { log.push(`2:${prev}`); return 'light' })

    expect(log[0]).toBe('1:light')
    expect(log[1]).toBe('2:dark')
    expect(ctx.theme()).toBe('light')
  })
})

// ---------------------------------------------------------------------------
// 11. Cross-tab storage events
// ---------------------------------------------------------------------------

describe('cross-tab storage sync', () => {
  it('updates theme when a storage event fires for the correct key', () => {
    let ctx!: ReturnType<typeof useTheme>
    function Capture() {
      ctx = useTheme()
      return null
    }
    renderWithProvider({ defaultTheme: 'light', enableSystem: false }, () => <Capture />)
    expect(ctx.theme()).toBe('light')

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'theme', newValue: 'dark' })
    )
    expect(ctx.theme()).toBe('dark')
  })

  it('ignores storage events for unrelated keys', () => {
    let ctx!: ReturnType<typeof useTheme>
    function Capture() {
      ctx = useTheme()
      return null
    }
    renderWithProvider({ defaultTheme: 'light', enableSystem: false }, () => <Capture />)
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'other-key', newValue: 'dark' })
    )
    expect(ctx.theme()).toBe('light')
  })
})

// ---------------------------------------------------------------------------
// 12. themeScript – pure unit tests (no rendering required)
// ---------------------------------------------------------------------------

describe('themeScript (FOUC-prevention)', () => {
  function runScript(
    overrides: Partial<Parameters<typeof themeScript>>,
    setupStorage?: (s: typeof store) => void
  ) {
    // Reset DOM
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.className = ''
    document.documentElement.style.colorScheme = ''

    if (setupStorage) {
      store = {}
      setupStorage(store)
    }

    const [
      attribute = 'data-theme',
      storageKey = 'theme',
      defaultTheme = 'light',
      forcedTheme = undefined,
      themes = ['light', 'dark'],
      value = undefined,
      enableSystem = true,
      enableColorScheme = true,
    ] = overrides as any

    themeScript(
      attribute,
      storageKey,
      defaultTheme,
      forcedTheme,
      themes,
      value,
      enableSystem,
      enableColorScheme
    )
  }

  it('applies the stored theme from localStorage', () => {
    store['theme'] = 'dark'
    runScript([])
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('applies the default theme when nothing is stored', () => {
    store = {}
    runScript(['data-theme', 'theme', 'light', undefined, ['light', 'dark'], undefined, false, true])
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('applies the forcedTheme regardless of localStorage', () => {
    store['theme'] = 'light'
    runScript(['data-theme', 'theme', 'light', 'dark', ['light', 'dark'], undefined, true, true])
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('applies system preference when theme="system"', () => {
    store['theme'] = 'system'
    mockMatchMedia(true) // prefers dark
    runScript(['data-theme', 'theme', 'system', undefined, ['light', 'dark'], undefined, true, true])
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('applies value mapping', () => {
    store['theme'] = 'night'
    runScript([
      'data-theme',
      'theme',
      'night',
      undefined,
      ['night', 'day'],
      { night: 'theme-dark', day: 'theme-light' },
      false,
      true,
    ])
    expect(document.documentElement.getAttribute('data-theme')).toBe('theme-dark')
  })

  it('applies class when attribute="class"', () => {
    store['theme'] = 'dark'
    runScript(['class', 'theme', 'dark', undefined, ['light', 'dark'], undefined, false, true])
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('sets color-scheme when enableColorScheme=true', () => {
    store['theme'] = 'dark'
    runScript(['data-theme', 'theme', 'dark', undefined, ['light', 'dark'], undefined, false, true])
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('does NOT set color-scheme when enableColorScheme=false', () => {
    store['theme'] = 'dark'
    runScript(['data-theme', 'theme', 'dark', undefined, ['light', 'dark'], undefined, false, false])
    expect(document.documentElement.style.colorScheme).toBe('')
  })
})
