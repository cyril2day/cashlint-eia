import React, { type ReactElement } from 'react'

import type { AppNavigationItemViewModel } from '@/presentation/contracts'
import { ifElse } from '@/shared/fp'

const ariaCurrent = (item: AppNavigationItemViewModel): 'page' | 'false' =>
  ifElse(
    (candidate: AppNavigationItemViewModel) => candidate.isActive,
    (): 'page' => 'page',
    (): 'false' => 'false',
  )(item)

export function AppNavigationItem({
  item,
  onNavigate,
}: Readonly<{
  readonly item: AppNavigationItemViewModel
  readonly onNavigate: () => void
}>): ReactElement {
  return (
    <li className="app-nav__item">
      <a className="app-nav__link" href={item.href} aria-current={ariaCurrent(item)} onClick={onNavigate}>
        <span className="app-nav__label">{item.label}</span>
      </a>
    </li>
  )
}
