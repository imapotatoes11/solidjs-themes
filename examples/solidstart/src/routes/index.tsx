/**
 * routes/index.tsx – demo page
 *
 * Demonstrates:
 *  - Reading theme / resolvedTheme / systemTheme from useTheme()
 *  - Toggling between light and dark
 *  - Switching to "system" mode
 *  - Switching to custom themes
 *  - Forcing a theme on a specific route via forcedTheme prop on ThemeProvider
 */
import { For, Show } from 'solid-js'
import { useTheme } from 'solidjs-themes'
import { ThemeProvider } from 'solidjs-themes'

// Custom themes demo – re-using the provider with a different theme list
const CUSTOM_THEMES = ['light', 'dark', 'solarized', 'nord', 'system']

export default function HomePage() {
  const { theme, setTheme, resolvedTheme, systemTheme, themes } = useTheme()

  return (
    <main class="container">
      <h1>solidjs-themes demo</h1>

      {/* ── Current state ─────────────────────────────────────────────── */}
      <section class="card">
        <h2>Current state</h2>
        <dl>
          <dt>theme()</dt>
          <dd>
            <code>{theme() ?? 'undefined'}</code>
          </dd>

          <dt>resolvedTheme()</dt>
          <dd>
            <code>{resolvedTheme() ?? 'undefined'}</code>
          </dd>

          <dt>systemTheme()</dt>
          <dd>
            <code>{systemTheme() ?? 'undefined'}</code>
          </dd>

          <dt>themes()</dt>
          <dd>
            <code>[{themes().join(', ')}]</code>
          </dd>
        </dl>
      </section>

      {/* ── Quick toggle ──────────────────────────────────────────────── */}
      <section class="card">
        <h2>Quick toggle</h2>
        <button
          onClick={() =>
            setTheme(current =>
              current === 'dark' ? 'light' : 'dark'
            )
          }
        >
          Toggle dark / light
        </button>
      </section>

      {/* ── Theme switcher ────────────────────────────────────────────── */}
      <section class="card">
        <h2>Switch theme</h2>
        <div class="theme-buttons">
          <For each={themes()}>
            {t => (
              <button
                class={theme() === t ? 'active' : ''}
                onClick={() => setTheme(t)}
              >
                {t}
              </button>
            )}
          </For>
        </div>
      </section>

      {/* ── System mode explanation ───────────────────────────────────── */}
      <section class="card">
        <h2>System mode</h2>
        <p>
          When <code>theme() === 'system'</code>, the library reads{' '}
          <code>prefers-color-scheme</code> and resolves to{' '}
          <strong>{systemTheme() ?? '…'}</strong>.
        </p>
        <Show when={theme() !== 'system'}>
          <button onClick={() => setTheme('system')}>
            Follow system preference
          </button>
        </Show>
        <Show when={theme() === 'system'}>
          <p>✓ Currently following system preference.</p>
        </Show>
      </section>

      {/* ── Custom themes demo ────────────────────────────────────────── */}
      <section class="card">
        <h2>Custom themes (nested provider – read-only demo)</h2>
        <p>
          A nested <code>&lt;ThemeProvider&gt;</code> is silently ignored; the
          root provider wins. To use custom themes, configure them on the root
          provider.
        </p>
        <ThemeProvider
          themes={CUSTOM_THEMES}
          defaultTheme="solarized"
          enableSystem={true}
          attribute="data-theme"
        >
          {/*
           * Because the outer provider is already active, this inner provider
           * passes through transparently.  Its `themes` / `defaultTheme`
           * props are ignored.  The useTheme() call below still reads from
           * the outer context.
           */}
          <NestedDemo />
        </ThemeProvider>
      </section>
    </main>
  )
}

function NestedDemo() {
  const { theme } = useTheme()
  return (
    <p>
      Active theme (from outer context): <code>{theme()}</code>
    </p>
  )
}
