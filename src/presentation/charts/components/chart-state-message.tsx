import React from 'react'

import type { PresentationDisplayState } from '@/presentation/contracts'
import { cond } from '@/shared/fp'

const messageFromState = (state: PresentationDisplayState): string =>
  cond<[PresentationDisplayState], string>([
    [candidate => candidate === 'Complete', () => 'This view has enough context to stand on its own.'],
    [candidate => candidate === 'Partial', () => 'Useful signal, with a little context still worth keeping in mind.'],
    [candidate => candidate === 'Empty', () => 'Nothing usable came back for this slice yet.'],
    [candidate => candidate === 'Unavailable', () => 'This panel is waiting on data the current run did not return.'],
    [candidate => candidate === 'NotComputed', () => 'There is not enough history here to make that comparison responsibly.'],
    [() => true, () => 'This chart hit a safe display error, so the raw failure stayed hidden.'],
  ])(state)

export function ChartStateMessage({ state }: Readonly<{ readonly state: PresentationDisplayState }>) {
  return (
    <p className={`chart-state-message chart-state-message--${state}`} role="status">
      {messageFromState(state)}
    </p>
  )
}
