'use client'

import React, { useEffect, useState, type ReactElement } from 'react'

import type { AppNavigationItemViewModel, AppNavigationViewModel } from '@/presentation/contracts'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import { ifElse, isNil } from '@/shared/fp'
import { AppNavigationItem } from '@/presentation/shell/app-navigation-item'
import { AppNavigationMenuButton } from '@/presentation/shell/app-navigation-menu-button'
import { RepositoryLink } from '@/presentation/shell/repository-link'
import { ThemeToggle, type ThemeChoice } from '@/presentation/shell/theme-toggle'

const githubRepositoryUrl = 'https://github.com/cyril2day/cashlint-eia'
const navigationMenuId = 'app-navigation-menu'
const themeStorageKey = 'oil-lint-theme'
const lightTheme: ThemeChoice = 'light'
const darkTheme: ThemeChoice = 'dark'

const menuState = (isOpen: boolean): 'open' | 'closed' =>
  ifElse(
    (candidate: boolean) => candidate,
    (): 'open' => 'open',
    (): 'closed' => 'closed',
  )(isOpen)

const menuLabel = (isOpen: boolean): string =>
  ifElse(
    (candidate: boolean) => candidate,
    () => 'Close navigation menu',
    () => 'Open navigation menu',
  )(isOpen)

const toggleBoolean = (value: boolean): boolean =>
  ifElse(
    (candidate: boolean) => candidate,
    () => false,
    () => true,
  )(value)

const isDarkTheme = (theme: ThemeChoice): boolean => theme === darkTheme

const isDarkThemeValue = (value: string): boolean => value === darkTheme

const nextTheme = (theme: ThemeChoice): ThemeChoice =>
  ifElse(
    isDarkTheme,
    () => lightTheme,
    () => darkTheme,
  )(theme)

const maybeStorageValue = (value: string | null): Maybe<string> =>
  ifElse(
    isNil,
    () => none(),
    candidate => some(String(candidate)),
  )(value)

const themeFromStoredText = (value: string): ThemeChoice =>
  ifElse(
    isDarkThemeValue,
    () => darkTheme,
    () => lightTheme,
  )(value)

const themeFromStoredValue = (value: string | null): ThemeChoice =>
  matchMaybe<string, ThemeChoice>({
    Some: themeFromStoredText,
    None: () => lightTheme,
  })(maybeStorageValue(value))

const themeButtonLabel = (theme: ThemeChoice): string =>
  ifElse(
    isDarkTheme,
    () => 'Use light mode',
    () => 'Use dark mode',
  )(theme)

const applyDocumentTheme = (theme: ThemeChoice): void => {
  document.documentElement.dataset.theme = theme
}

const persistTheme = (theme: ThemeChoice): void => {
  window.localStorage.setItem(themeStorageKey, theme)
}

const navigationItem = (
  closeMenu: () => void,
) =>
  (item: AppNavigationItemViewModel): ReactElement => (
    <AppNavigationItem key={item.routeId} item={item} onNavigate={closeMenu} />
  )

export function AppNavigation({ viewModel }: Readonly<{ readonly viewModel: AppNavigationViewModel }>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeChoice>(lightTheme)

  const closeMenu = (): void => setIsMenuOpen(false)
  const toggleMenu = (): void => setIsMenuOpen(toggleBoolean)
  const toggleTheme = (): void => setTheme(nextTheme)

  useEffect(() => {
    const storedTheme = themeFromStoredValue(window.localStorage.getItem(themeStorageKey))

    setTheme(storedTheme)
    applyDocumentTheme(storedTheme)
  }, [])

  useEffect(() => {
    applyDocumentTheme(theme)
    persistTheme(theme)
  }, [theme])

  return (
    <nav className="app-nav" aria-label="Application navigation" data-menu-state={menuState(isMenuOpen)}>
      <div className="app-nav__bar">
        <AppNavigationMenuButton
          isOpen={isMenuOpen}
          menuId={navigationMenuId}
          label={menuLabel(isMenuOpen)}
          onToggle={toggleMenu}
        />

        <ul className="app-nav__list" id={navigationMenuId}>
          {viewModel.items.map(navigationItem(closeMenu))}
        </ul>

        <div className="app-nav__actions">
          <ThemeToggle theme={theme} label={themeButtonLabel(theme)} onToggle={toggleTheme} />
          <RepositoryLink href={githubRepositoryUrl} />
        </div>
      </div>
    </nav>
  )
}
