import type { AnalysisControlViewModel } from './analysis-control-view-model'
import type { AnalysisTraceViewModel } from './analysis-trace-view-model'
import type { CaveatPanelViewModel } from './caveat-panel-view-model'
import type { ChartPanelViewModel } from './chart-panel-view-model'
import type { PresentationDisplayState } from './presentation-display-state'
import type { ProductNavigationViewModel } from './product-navigation-view-model'
import type { SummaryViewModel } from './summary-view-model'

export type RichHomeViewModel = Readonly<{
  readonly summary: SummaryViewModel
  readonly navigation: ProductNavigationViewModel
  readonly controls: AnalysisControlViewModel
  readonly primaryCharts: readonly ChartPanelViewModel[]
  readonly caveatPanel: CaveatPanelViewModel
  readonly tracePanel: AnalysisTraceViewModel
  readonly state: PresentationDisplayState
}>
