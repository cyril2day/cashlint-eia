import React from 'react'

import type { ChartsGalleryViewModel } from '@/presentation/contracts'
import { ChartPanel } from '@/presentation/charts/components/chart-panel'

export function ChartGallery({ viewModel }: Readonly<{ readonly viewModel: ChartsGalleryViewModel }>) {
  return (
    <section className="chart-gallery" aria-labelledby="chart-gallery-title">
      <header className="chart-gallery__header">
        <h2 className="chart-gallery__title" id="chart-gallery-title">{viewModel.title}</h2>
      </header>
      <div className="chart-gallery__grid">
        {viewModel.panels.map(panel => <ChartPanel key={panel.id} viewModel={panel} />)}
      </div>
    </section>
  )
}
