import React from 'react'

import type { ChartsGalleryViewModel, PresentationCaveatViewModel } from '@/presentation/contracts'
import { ChartPanel } from './chart-panel'

const caveatItem = (caveat: PresentationCaveatViewModel) => (
  <li key={`${caveat.kind}-${caveat.message}`} className="chart-gallery__caveat">{caveat.message}</li>
)

export function ChartGallery({ viewModel }: Readonly<{ readonly viewModel: ChartsGalleryViewModel }>) {
  return (
    <section className="chart-gallery" aria-labelledby="chart-gallery-title">
      <header className="chart-gallery__header">
        <div>
          <p className="chart-gallery__eyebrow">{viewModel.state}</p>
          <h2 className="chart-gallery__title" id="chart-gallery-title">{viewModel.title}</h2>
        </div>
        <p className="chart-gallery__description">{viewModel.description}</p>
      </header>
      <div className="chart-gallery__grid">
        {viewModel.panels.map(panel => <ChartPanel key={panel.id} viewModel={panel} />)}
      </div>
      <ul className="chart-gallery__caveats">{viewModel.caveats.map(caveatItem)}</ul>
    </section>
  )
}
