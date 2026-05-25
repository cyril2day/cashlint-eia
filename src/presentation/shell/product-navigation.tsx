import React from 'react'

import type { ProductNavigationItemViewModel, ProductNavigationViewModel } from '../contracts'
import { renderMaybeText } from '../utils/render-maybe-text'
import { ifElse } from '@/shared/fp'

const ariaCurrent = (item: ProductNavigationItemViewModel): 'page' | 'false' =>
  ifElse(
    (candidate: ProductNavigationItemViewModel) => candidate.isActive,
    (): 'page' => 'page',
    (): 'false' => 'false',
  )(item)

export function ProductNavigation({ viewModel }: Readonly<{ readonly viewModel: ProductNavigationViewModel }>) {
  return (
    <nav className="product-nav" aria-label="Product navigation">
      <ul className="product-nav__list">
        {viewModel.items.map(item => (
          <li key={item.routeId} className="product-nav__item">
            <a className="product-nav__link" href={item.href} aria-current={ariaCurrent(item)}>
              <span className="product-nav__label">{item.label}</span>
              <span className="product-nav__description">{renderMaybeText('Open view')(item.description)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
