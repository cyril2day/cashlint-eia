import type { Maybe } from '@/shared/maybe'

import type { PresentationCaveatViewModel } from './presentation-caveat-view-model'
import type { PresentationDisplayState } from './presentation-display-state'

export type AnalysisTraceStepViewModel = Readonly<{
  readonly label: string
  readonly status: PresentationDisplayState
  readonly description: string
  readonly caveats: Maybe<readonly PresentationCaveatViewModel[]>
}>

export type AnalysisTraceViewModel = Readonly<{
  readonly title: string
  readonly steps: readonly AnalysisTraceStepViewModel[]
}>
