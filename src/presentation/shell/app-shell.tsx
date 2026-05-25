import React, { type ReactNode } from 'react'

import type { AppNavigationViewModel } from '@/presentation/contracts'
import { AppFooter } from '@/presentation/shell/app-footer'
import { AppNavigation } from '@/presentation/shell/app-navigation'

export function AppShell({
  navigation,
  children,
}: Readonly<{
  readonly navigation: AppNavigationViewModel
  readonly children: ReactNode
}>) {
  return (
    <main className="oil-lint-shell">
      <div className="oil-lint-shell__backdrop" aria-hidden="true" />

      <article className="oil-lint-shell__surface">
        <AppNavigation viewModel={navigation} />
        {children}
        <AppFooter />
      </article>
    </main>
  )
}
