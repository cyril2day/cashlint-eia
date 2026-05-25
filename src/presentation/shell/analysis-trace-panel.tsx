import React from 'react'

import type { AnalysisTraceStepViewModel, AnalysisTraceViewModel, PresentationCaveatViewModel } from '../contracts'
import { matchMaybe } from '@/shared/maybe'

const caveat = (item: PresentationCaveatViewModel) => (
  <li key={`${item.kind}-${item.message}`} className="analysis-trace__caveat">{item.message}</li>
)

const stepCaveats = (step: AnalysisTraceStepViewModel) =>
  matchMaybe<readonly PresentationCaveatViewModel[], React.ReactNode>({
    Some: caveats => <ul className="analysis-trace__caveats">{caveats.map(caveat)}</ul>,
    None: () => null,
  })(step.caveats)

const traceStep = (step: AnalysisTraceStepViewModel) => (
  <li key={step.label} className="analysis-trace__step">
    <span className="analysis-trace__step-status">{step.status}</span>
    <div className="analysis-trace__step-body">
      <p className="analysis-trace__step-label">{step.label}</p>
      <p className="analysis-trace__step-description">{step.description}</p>
      {stepCaveats(step)}
    </div>
  </li>
)

export function AnalysisTracePanel({ viewModel }: Readonly<{ readonly viewModel: AnalysisTraceViewModel }>) {
  return (
    <section className="analysis-trace" aria-labelledby="analysis-trace-title">
      <h2 className="analysis-trace__title" id="analysis-trace-title">{viewModel.title}</h2>
      <ol className="analysis-trace__steps">{viewModel.steps.map(traceStep)}</ol>
    </section>
  )
}
