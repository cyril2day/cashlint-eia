import type { Maybe } from '@/shared/maybe'

import type { ChartPanelViewModel } from '@/presentation/contracts/chart-panel-view-model'
import type { DetailRowViewModel } from '@/presentation/contracts/detail-row-view-model'
import type { PresentationCaveatViewModel } from '@/presentation/contracts/presentation-caveat-view-model'
import type { PresentationDisplayState } from '@/presentation/contracts/presentation-display-state'
import type { SummaryCardViewModel } from '@/presentation/contracts/summary-card-view-model'

export type DetailPageViewModel = Readonly<{
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly headline: Maybe<string>
  readonly cards: readonly SummaryCardViewModel[]
  readonly rows: readonly DetailRowViewModel[]
  readonly charts: readonly ChartPanelViewModel[]
  readonly caveats: readonly PresentationCaveatViewModel[]
  readonly state: PresentationDisplayState
  readonly accessibilitySummary: string
}>
