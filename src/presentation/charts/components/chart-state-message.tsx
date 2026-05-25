import React from 'react'

import type { PresentationDisplayState } from '@/presentation/contracts'
import { cond } from '@/shared/fp'

const messageFromState = (state: PresentationDisplayState): string =>
  cond<[PresentationDisplayState], string>([
    [candidate => candidate === 'Complete', () => 'Chart data is complete for this view.'],
    [candidate => candidate === 'Partial', () => 'Chart data is partial; caveats remain visible.'],
    [candidate => candidate === 'Empty', () => 'No chart values are available for this view.'],
    [candidate => candidate === 'Unavailable', () => 'Chart data is unavailable because runtime history loading is deferred.'],
    [candidate => candidate === 'NotComputed', () => 'Chart data was not computed by the current workflow.'],
    [() => true, () => 'A safe chart error state is available.'],
  ])(state)

export function ChartStateMessage({ state }: Readonly<{ readonly state: PresentationDisplayState }>) {
  return (
    <p className={`chart-state-message chart-state-message--${state}`} role="status">
      {messageFromState(state)}
    </p>
  )
}
