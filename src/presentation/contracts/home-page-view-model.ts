import type { AnalysisControlViewModel } from '@/presentation/contracts/analysis-control-view-model'
import type { AnalysisTraceViewModel } from '@/presentation/contracts/analysis-trace-view-model'
import type { CaveatPanelViewModel } from '@/presentation/contracts/caveat-panel-view-model'
import type { ChartPanelViewModel } from '@/presentation/contracts/chart-panel-view-model'
import type { ChartsGalleryViewModel } from '@/presentation/contracts/charts-gallery-view-model'
import type { PresentationDisplayState } from '@/presentation/contracts/presentation-display-state'
import type { AppNavigationViewModel } from '@/presentation/contracts/app-navigation-view-model'
import type { SummaryViewModel } from '@/presentation/contracts/summary-view-model'

export type HomePageViewModel = Readonly<{
  readonly summary: SummaryViewModel
  readonly navigation: AppNavigationViewModel
  readonly controls: AnalysisControlViewModel
  readonly primaryCharts: readonly ChartPanelViewModel[]
  readonly chartsGallery: ChartsGalleryViewModel
  readonly caveatPanel: CaveatPanelViewModel
  readonly tracePanel: AnalysisTraceViewModel
  readonly state: PresentationDisplayState
}>
