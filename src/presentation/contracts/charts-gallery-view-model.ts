import type { ChartPanelViewModel } from './chart-panel-view-model'
import type { PresentationCaveatViewModel } from './presentation-caveat-view-model'
import type { PresentationDisplayState } from './presentation-display-state'

export type ChartsGalleryViewModel = Readonly<{
  readonly title: string
  readonly description: string
  readonly panels: readonly ChartPanelViewModel[]
  readonly caveats: readonly PresentationCaveatViewModel[]
  readonly state: PresentationDisplayState
}>
