'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children, ...props }: React.PropsWithChildren<{ attribute?: string; defaultTheme?: string; enableSystem?: boolean; disableTransitionOnChange?: boolean }>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
