import type { AnalysisControlViewModel } from '@/presentation/contracts/analysis-control-view-model'
import type { AnalysisTraceViewModel } from '@/presentation/contracts/analysis-trace-view-model'
import type { CaveatPanelViewModel } from '@/presentation/contracts/caveat-panel-view-model'
import type { ChartPanelViewModel } from '@/presentation/contracts/chart-panel-view-model'
import type { ChartsGalleryViewModel } from '@/presentation/contracts/charts-gallery-view-model'
import type { PresentationDisplayState } from '@/presentation/contracts/presentation-display-state'
import type { AppNavigationViewModel } from '@/presentation/contracts/app-navigation-view-model'
import type { SummaryViewModel } from '@/presentation/contracts/summary-view-model'
import type { Maybe } from '@/shared/maybe'

export type HomeHeroViewModel = Readonly<{
  readonly reportWeekLabel: string
  readonly headline: string
  readonly conditionLabel: string
  readonly summary: string
}>

export type HomeReportWeekControlViewModel = Readonly<{
  readonly inputLabel: string
  readonly value: string
  readonly submitLabel: string
}>

export type DashboardMetricViewModel = Readonly<{
  readonly id: string
  readonly title: string
  readonly valueText: string
  readonly changeText: Maybe<string>
  readonly subtitleText: Maybe<string>
  readonly href: Maybe<string>
  readonly chart: HomeMetricChartViewModel
}>

export type HomeMetricChartKind = 'VarianceBars' | 'SparklineLine' | 'StackedArea' | 'BarSequence'

export type HomeMetricChartPointViewModel = Readonly<{
  readonly label: string
  readonly value: number
  readonly secondaryValue: Maybe<number>
  readonly isCurrent: boolean
}>

export type HomeMetricChartViewModel = Readonly<{
  readonly kind: HomeMetricChartKind
  readonly title: string
  readonly summary: string
  readonly points: readonly HomeMetricChartPointViewModel[]
}>

export type BalanceSnapshotViewModel = Readonly<{
  readonly title: string
  readonly rows: readonly DashboardMetricViewModel[]
  readonly resultLabel: string
  readonly href: string
  readonly linkLabel: string
}>

export type HomeNavigationCardViewModel = Readonly<{
  readonly title: string
  readonly body: string
  readonly href: string
  readonly linkLabel: string
}>

export type HomePageViewModel = Readonly<{
  readonly summary: SummaryViewModel
  readonly hero: HomeHeroViewModel
  readonly reportWeekControl: HomeReportWeekControlViewModel
  readonly metrics: readonly DashboardMetricViewModel[]
  readonly balanceSnapshot: BalanceSnapshotViewModel
  readonly navigationCards: readonly HomeNavigationCardViewModel[]
  readonly footerNotes: readonly string[]
  readonly navigation: AppNavigationViewModel
  readonly controls: AnalysisControlViewModel
  readonly primaryCharts: readonly ChartPanelViewModel[]
  readonly chartsGallery: ChartsGalleryViewModel
  readonly caveatPanel: CaveatPanelViewModel
  readonly tracePanel: AnalysisTraceViewModel
  readonly state: PresentationDisplayState
}>
