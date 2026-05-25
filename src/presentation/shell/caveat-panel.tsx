import React from 'react'

import type { CaveatPanelViewModel, PresentationCaveatViewModel } from '@/presentation/contracts'
import { ifElse } from '@/shared/fp'
import { renderMaybeText } from '@/presentation/utils/render-maybe-text'

const caveatItem = (caveat: PresentationCaveatViewModel) => (
  <li key={`${caveat.kind}-${caveat.message}`} className={`caveat-panel__item caveat-panel__item--${caveat.severity}`}>
    <p className="caveat-panel__item-title">{caveat.title}</p>
    <p className="caveat-panel__item-message">{caveat.message}</p>
  </li>
)

const caveatList = (viewModel: CaveatPanelViewModel) =>
  ifElse(
    (candidate: CaveatPanelViewModel) => candidate.caveats.length > 0,
    candidate => <ul className="caveat-panel__list">{candidate.caveats.map(caveatItem)}</ul>,
    () => <p className="caveat-panel__empty">No caveats emitted for this view.</p>,
  )(viewModel)

export function CaveatPanel({ viewModel }: Readonly<{ readonly viewModel: CaveatPanelViewModel }>) {
  return (
    <section className="caveat-panel" aria-labelledby="caveat-panel-title">
      <header className="caveat-panel__header">
        <h2 className="caveat-panel__title" id="caveat-panel-title">{viewModel.title}</h2>
        <span className="caveat-panel__state">{viewModel.state}</span>
      </header>
      <p className="caveat-panel__summary">{renderMaybeText('Caveat state is available.')(viewModel.summary)}</p>
      {caveatList(viewModel)}
    </section>
  )
}
