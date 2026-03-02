/**
 * app.tsx – application shell.
 *
 * Wraps the file-based router output with <ThemeProvider> so every route
 * can access the theme context via useTheme().
 */
import { type JSX } from 'solid-js'
import { ThemeProvider } from 'solidjs-themes'

interface AppProps {
  children?: JSX.Element
}

export default function App(props: AppProps) {
  return (
    <ThemeProvider
      storageKey="theme"
      defaultTheme="system"
      enableSystem={true}
      enableColorScheme={true}
      attribute="data-theme"
      // Uncomment to add custom themes:
      // themes={['light', 'dark', 'solarized', 'nord']}
    >
      {props.children}
    </ThemeProvider>
  )
}
