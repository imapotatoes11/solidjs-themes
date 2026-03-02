// @refresh reload
/**
 * root.tsx – the SolidStart document root.
 *
 * This file renders the full HTML shell.  We place <ThemeScript> inside
 * <Head> so it runs **before** any CSS is parsed, giving us the best possible
 * FOUC prevention.
 *
 * <ThemeProvider> is placed inside <Body> and manages the reactive Solid
 * state (signals, effects, localStorage, matchMedia listener).
 */
import { Suspense } from 'solid-js'
import {
  Body,
  ErrorBoundary,
  FileRoutes,
  Head,
  Html,
  Link,
  Meta,
  Routes,
  Scripts,
} from '@solidjs/start'
import { ThemeScript } from 'solidjs-themes'
import App from './app'

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />

        {/*
         * ── FOUC prevention ────────────────────────────────────────────────
         * ThemeScript injects a tiny synchronous inline script that reads
         * localStorage and / or prefers-color-scheme and immediately sets the
         * theme attribute on <html>.  Because it lives in <head>, it runs
         * before the browser paints any content – no flash of incorrect theme.
         *
         * Provide the same props you pass to <ThemeProvider> so the script
         * logic matches the provider logic.
         */}
        <ThemeScript
          storageKey="theme"
          defaultTheme="system"
          enableSystem={true}
          enableColorScheme={true}
          attribute="data-theme"
        />

        <Link rel="stylesheet" href="/styles.css" />
      </Head>

      <Body>
        <ErrorBoundary>
          <Suspense>
            {/*
             * App contains <ThemeProvider> which manages the reactive Solid
             * state.  The provider will also render its own <ThemeScript>
             * (inside the body) as a safety net, but the one in <head> above
             * is what guarantees zero FOUC on the initial server-rendered page.
             */}
            <App>
              <Routes>
                <FileRoutes />
              </Routes>
            </App>
          </Suspense>
        </ErrorBoundary>
        <Scripts />
      </Body>
    </Html>
  )
}
