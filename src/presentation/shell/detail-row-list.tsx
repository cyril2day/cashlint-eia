import React from 'react'

import type { DetailRowViewModel, PresentationCaveatViewModel } from '../contracts'
import { matchMaybe } from '@/shared/maybe'
import { renderMaybeText } from '../utils/render-maybe-text'

const rowCaveat = (caveat: PresentationCaveatViewModel) => (
  <li key={`${caveat.kind}-${caveat.message}`} className="detail-row-list__caveat">{caveat.message}</li>
)

const rowCaveats = (row: DetailRowViewModel) =>
  matchMaybe<readonly PresentationCaveatViewModel[], React.ReactNode>({
    Some: caveats => <ul className="detail-row-list__caveats">{caveats.map(rowCaveat)}</ul>,
    None: () => null,
  })(row.caveats)

const rowItem = (row: DetailRowViewModel) => (
  <div key={row.label} className="detail-row-list__row">
    <dt className="detail-row-list__label">{row.label}</dt>
    <dd className="detail-row-list__value">{row.value}</dd>
    <dd className="detail-row-list__meta">{renderMaybeText('No unit supplied')(row.unit)}</dd>
    <dd className="detail-row-list__status">{renderMaybeText('No status supplied')(row.status)}</dd>
    <dd className="detail-row-list__description">{renderMaybeText('No additional description supplied')(row.description)}</dd>
    {rowCaveats(row)}
  </div>
)

export function DetailRowList({ rows }: Readonly<{ readonly rows: readonly DetailRowViewModel[] }>) {
  return (
    <dl className="detail-row-list" aria-label="Detail rows">
      {rows.map(rowItem)}
    </dl>
  )
}
