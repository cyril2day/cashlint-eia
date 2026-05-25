import React from 'react'

import type { AnalysisControlViewModel } from '../contracts'
import { renderMaybeText } from '../utils/render-maybe-text'

export function AnalysisControlPanel({ viewModel }: Readonly<{ readonly viewModel: AnalysisControlViewModel }>) {
  return (
    <form className="analysis-control" action="/" method="get" aria-label="Analysis controls">
      <fieldset className="analysis-control__fieldset" disabled={viewModel.fieldsDisabled}>
        <label className="analysis-control__field">
          <span className="analysis-control__label">Report week</span>
          <input className="analysis-control__input" name="reportWeek" defaultValue={viewModel.reportWeekLabel} readOnly />
        </label>
        <label className="analysis-control__field">
          <span className="analysis-control__label">Geography</span>
          <input className="analysis-control__input" name="geography" defaultValue={viewModel.geographyLabel} readOnly />
        </label>
        <label className="analysis-control__field">
          <span className="analysis-control__label">Comparison</span>
          <input className="analysis-control__input" name="comparison" defaultValue={viewModel.comparisonWindowLabel} readOnly />
        </label>
      </fieldset>
      <button className="analysis-control__submit" type="submit">{viewModel.submitLabel}</button>
      <p className="analysis-control__helper">{renderMaybeText('Latest available live configuration is used.')(viewModel.helperText)}</p>
    </form>
  )
}
