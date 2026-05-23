import React from 'react'

import type { PresentationErrorViewModel } from '../contracts/presentation-error-view-model'
import { renderMaybeText } from '../utils/render-maybe-text'

export function PresentationErrorShell({ title, message, correlationId, retryHint }: PresentationErrorViewModel) {
  return (
    <section className="oil-lint-shell__error" aria-labelledby="oil-lint-error-title">
      <div className="oil-lint-shell__error-head">
        <p className="oil-lint-shell__error-eyebrow">Error state</p>
        <h2 className="oil-lint-shell__error-title" id="oil-lint-error-title">
          {title}
        </h2>
      </div>

      <p className="oil-lint-shell__error-message">{message}</p>

      <dl className="oil-lint-shell__error-meta" aria-label="Safe error details">
        <div className="oil-lint-shell__error-meta-item">
          <dt className="oil-lint-shell__error-meta-label">Correlation ID</dt>
          <dd className="oil-lint-shell__error-meta-value">{renderMaybeText('Not provided')(correlationId)}</dd>
        </div>
        <div className="oil-lint-shell__error-meta-item">
          <dt className="oil-lint-shell__error-meta-label">Retry hint</dt>
          <dd className="oil-lint-shell__error-meta-value">{renderMaybeText('No retry hint available')(retryHint)}</dd>
        </div>
      </dl>
    </section>
  )
}