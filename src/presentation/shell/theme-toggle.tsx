import React, { type ReactElement } from 'react'

import { MoonIcon, SunIcon } from '@/presentation/icons'

export type ThemeChoice = 'light' | 'dark'

export function ThemeToggle({
  theme,
  label,
  onToggle,
}: Readonly<{
  readonly theme: ThemeChoice
  readonly label: string
  readonly onToggle: () => void
}>): ReactElement {
  return (
    <button
      className="app-nav__icon-button app-nav__theme-button"
      type="button"
      aria-label={label}
      data-theme-choice={theme}
      onClick={onToggle}
    >
      <SunIcon />
      <MoonIcon />
    </button>
  )
}
