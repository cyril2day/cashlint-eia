import React, { type ReactNode } from 'react'

import type { DetailPageViewModel } from '@/presentation/contracts'
import { renderMaybeText } from '@/presentation/utils/render-maybe-text'

export function DetailPageShell({
  viewModel,
  children,
}: Readonly<{
  readonly viewModel: DetailPageViewModel
  readonly children: ReactNode
}>) {
  return (
    <section className="detail-page" aria-label={viewModel.accessibilitySummary}>
      <header className="detail-page__header">
        <p className="detail-page__eyebrow">{renderMaybeText('Live view')(viewModel.subtitle)}</p>
        <h1 className="detail-page__title">{viewModel.title}</h1>
        <p className="detail-page__headline">{renderMaybeText('Detailed analysis view')(viewModel.headline)}</p>
        <span className="detail-page__state">{viewModel.state}</span>
      </header>
      <div className="detail-page__body">{children}</div>
    </section>
  )
}
