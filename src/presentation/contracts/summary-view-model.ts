import type { Maybe } from '@/shared/maybe'

import type { PresentationCaveatViewModel } from './presentation-caveat-view-model'
import type { SummaryCardViewModel } from './summary-card-view-model'

export type SummaryDisplayState = 'complete' | 'partial' | 'empty' | 'error'

export type SummaryViewModel = Readonly<{
  readonly reportWeekText: string
  readonly geographyText: string
  readonly headline: string
  readonly summary: string
  readonly conditionLabel: string
  readonly confidenceLabel: string
  readonly cards: readonly SummaryCardViewModel[]
  readonly caveats: readonly PresentationCaveatViewModel[]
  readonly displayState: SummaryDisplayState
  readonly displayStateMessage: Maybe<string>
}>