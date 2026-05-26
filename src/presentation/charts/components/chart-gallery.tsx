import React from 'react'

import type { ChartsGalleryViewModel } from '@/presentation/contracts'
import { ChartPanel } from '@/presentation/charts/components/chart-panel'

const numberInput = (
  name: string,
  label: string,
  value: number,
  minimum: number,
  maximum: number,
) => (
  <label className="chart-gallery__control">
    <span>{label}</span>
    <input
      className="chart-gallery__control-input"
      type="number"
      name={name}
      min={minimum}
      max={maximum}
      step="1"
      defaultValue={value}
    />
  </label>
)

export function ChartGallery({ viewModel }: Readonly<{ readonly viewModel: ChartsGalleryViewModel }>) {
  return (
    <section className="chart-gallery" aria-labelledby="chart-gallery-title">
      <header className="chart-gallery__header">
        <h2 className="chart-gallery__title" id="chart-gallery-title">{viewModel.title}</h2>
      </header>
      <form className="chart-gallery__controls" action="/charts">
        {numberInput('histogramBins', 'Histogram bins', viewModel.controls.histogramBinCount, 2, 12)}
        {numberInput('lineXTicks', 'Line x-axis labels', viewModel.controls.lineXAxisTickCount, 2, 8)}
        {numberInput('areaXTicks', 'Area x-axis labels', viewModel.controls.areaXAxisTickCount, 2, 8)}
        <button className="chart-gallery__control-submit" type="submit">Apply</button>
      </form>
      <div className="chart-gallery__grid">
        {viewModel.panels.map(panel => <ChartPanel key={panel.id} viewModel={panel} controls={viewModel.controls} />)}
      </div>
    </section>
  )
}
