import React from 'react'

import type { SummaryViewModel } from '../contracts'

export function HeroAnalysisPanel({ viewModel }: Readonly<{ readonly viewModel: SummaryViewModel }>) {
  return (
    <section className="hero-analysis" aria-labelledby="hero-analysis-title">
      <p className="hero-analysis__eyebrow">Live weekly analysis</p>
      <h2 className="hero-analysis__title" id="hero-analysis-title">{viewModel.headline}</h2>
      <p className="hero-analysis__summary">{viewModel.summary}</p>
      <dl className="hero-analysis__metrics" aria-label="Analysis state">
        <div className="hero-analysis__metric">
          <dt className="hero-analysis__metric-label">Condition</dt>
          <dd className="hero-analysis__metric-value">{viewModel.conditionLabel}</dd>
        </div>
        <div className="hero-analysis__metric">
          <dt className="hero-analysis__metric-label">Confidence</dt>
          <dd className="hero-analysis__metric-value">{viewModel.confidenceLabel}</dd>
        </div>
      </dl>
    </section>
  )
}
