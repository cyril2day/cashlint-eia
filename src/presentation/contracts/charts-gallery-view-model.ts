import type { ChartPanelViewModel } from '@/presentation/contracts/chart-panel-view-model'
import type { PresentationCaveatViewModel } from '@/presentation/contracts/presentation-caveat-view-model'
import type { PresentationDisplayState } from '@/presentation/contracts/presentation-display-state'

export type ChartGalleryStateSummaryItemViewModel = Readonly<{
  readonly state: PresentationDisplayState
  readonly label: string
  readonly valueLabel: string
  readonly description: string
}>

export type ChartsGalleryViewModel = Readonly<{
  readonly title: string
  readonly description: string
  readonly stateSummary: readonly ChartGalleryStateSummaryItemViewModel[]
  readonly panels: readonly ChartPanelViewModel[]
  readonly caveats: readonly PresentationCaveatViewModel[]
  readonly state: PresentationDisplayState
}>
