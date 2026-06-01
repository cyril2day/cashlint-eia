import type { PresentationErrorViewModel } from '@/presentation/contracts'
import type {
  AnalysisDetailViewModel,
  BalanceDetailViewModel,
  ChartsGalleryViewModel,
  InventoryDetailViewModel,
  PriceDetailViewModel,
  HomePageViewModel,
  AppNavigationViewModel,
} from '@/presentation/contracts'
import {
  createAppNavigationViewModelWithReportWeek,
  mapSummaryWithChartsToAnalysisDetailViewModel,
  mapSummaryWithChartsToBalanceDetailViewModel,
  mapSummaryWithChartsToInventoryDetailViewModel,
  mapSummaryWithChartsToPriceDetailViewModel,
} from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { resolveHomePageModel, type HomePageModel } from '@/app/resolve-home-page-model'
import type { ReportWeekSelection } from '@/app/report-week-selection'

export type AppPageModel<ViewModel> = Readonly<{
  readonly kind: 'page'
  readonly viewModel: ViewModel
  readonly navigation: AppNavigationViewModel
} | {
  readonly kind: 'error'
  readonly viewModel: PresentationErrorViewModel
  readonly navigation: AppNavigationViewModel
}>

const createPageModel =
  <ViewModel>(navigation: AppNavigationViewModel) =>
  (viewModel: ViewModel): AppPageModel<ViewModel> => ({
  kind: 'page',
  viewModel,
  navigation,
})

const createErrorModel =
  <ViewModel>(navigation: AppNavigationViewModel) =>
  (viewModel: PresentationErrorViewModel): AppPageModel<ViewModel> => ({
  kind: 'error',
  viewModel,
  navigation,
})

const isHomeModel = (
  model: HomePageModel,
): model is Extract<HomePageModel, { readonly kind: 'home' }> => model.kind === 'home'

const mapHomeModel = <ViewModel>(
  mapper: (viewModel: HomePageViewModel) => ViewModel,
  navigation: AppNavigationViewModel,
) =>
  (model: HomePageModel): AppPageModel<ViewModel> =>
    ifElse(
      isHomeModel,
      candidate => createPageModel<ViewModel>(navigation)(mapper(candidate.viewModel)),
      candidate => createErrorModel<ViewModel>(navigation)(candidate.viewModel),
    )(model)

export const resolveInventoryPageModel = (selection: ReportWeekSelection): Promise<AppPageModel<InventoryDetailViewModel>> =>
  resolveHomePageModel(selection.requestReportWeekIso, selection.controlReportWeekIso).then(
    mapHomeModel(
      candidate => mapSummaryWithChartsToInventoryDetailViewModel(candidate.summary, candidate.chartsGallery),
      createAppNavigationViewModelWithReportWeek('inventory', selection.controlReportWeekIso),
    ),
  )

export const resolvePricePageModel = (selection: ReportWeekSelection): Promise<AppPageModel<PriceDetailViewModel>> =>
  resolveHomePageModel(selection.requestReportWeekIso, selection.controlReportWeekIso).then(
    mapHomeModel(
      candidate => mapSummaryWithChartsToPriceDetailViewModel(candidate.summary, candidate.chartsGallery),
      createAppNavigationViewModelWithReportWeek('price', selection.controlReportWeekIso),
    ),
  )

export const resolveBalancePageModel = (selection: ReportWeekSelection): Promise<AppPageModel<BalanceDetailViewModel>> =>
  resolveHomePageModel(selection.requestReportWeekIso, selection.controlReportWeekIso).then(
    mapHomeModel(
      candidate => mapSummaryWithChartsToBalanceDetailViewModel(candidate.summary, candidate.chartsGallery),
      createAppNavigationViewModelWithReportWeek('balance', selection.controlReportWeekIso),
    ),
  )

export const resolveAnalysisPageModel = (selection: ReportWeekSelection): Promise<AppPageModel<AnalysisDetailViewModel>> =>
  resolveHomePageModel(selection.requestReportWeekIso, selection.controlReportWeekIso).then(
    mapHomeModel(
      candidate => mapSummaryWithChartsToAnalysisDetailViewModel(candidate.summary, candidate.chartsGallery),
      createAppNavigationViewModelWithReportWeek('analysis', selection.controlReportWeekIso),
    ),
  )

export const resolveChartsPageModel = (selection: ReportWeekSelection): Promise<AppPageModel<ChartsGalleryViewModel>> =>
  resolveHomePageModel(selection.requestReportWeekIso, selection.controlReportWeekIso).then(
    ifElse(
      isHomeModel,
      candidate => createPageModel<ChartsGalleryViewModel>(createAppNavigationViewModelWithReportWeek('charts', selection.controlReportWeekIso))(candidate.viewModel.chartsGallery),
      candidate => createErrorModel<ChartsGalleryViewModel>(createAppNavigationViewModelWithReportWeek('charts', selection.controlReportWeekIso))(candidate.viewModel),
    ),
  )
