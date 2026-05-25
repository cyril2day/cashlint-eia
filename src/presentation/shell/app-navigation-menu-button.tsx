import React, { type ReactElement } from 'react'

import { CloseIcon, MenuIcon } from '@/presentation/icons'

export function AppNavigationMenuButton({
  isOpen,
  menuId,
  label,
  onToggle,
}: Readonly<{
  readonly isOpen: boolean
  readonly menuId: string
  readonly label: string
  readonly onToggle: () => void
}>): ReactElement {
  return (
    <button
      className="app-nav__icon-button app-nav__menu-button"
      type="button"
      aria-label={label}
      aria-controls={menuId}
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      <MenuIcon />
      <CloseIcon />
    </button>
  )
}
