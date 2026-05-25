import type { PresentationErrorViewModel } from '@/presentation/contracts'
import type {
  AnalysisDetailViewModel,
  BalanceDetailViewModel,
  ChartsGalleryViewModel,
  InventoryDetailViewModel,
  PriceDetailViewModel,
  HomePageViewModel,
} from '@/presentation/contracts'
import {
  mapSummaryWithChartsToAnalysisDetailViewModel,
  mapSummaryWithChartsToBalanceDetailViewModel,
  mapSummaryWithChartsToInventoryDetailViewModel,
  mapSummaryWithChartsToPriceDetailViewModel,
} from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { resolveHomePageModel, type HomePageModel } from '@/app/resolve-home-page-model'

export type AppPageModel<ViewModel> = Readonly<{
  readonly kind: 'page'
  readonly viewModel: ViewModel
} | {
  readonly kind: 'error'
  readonly viewModel: PresentationErrorViewModel
}>

const createPageModel = <ViewModel>(viewModel: ViewModel): AppPageModel<ViewModel> => ({
  kind: 'page',
  viewModel,
})

const createErrorModel = <ViewModel>(viewModel: PresentationErrorViewModel): AppPageModel<ViewModel> => ({
  kind: 'error',
  viewModel,
})

const isHomeModel = (
  model: HomePageModel,
): model is Extract<HomePageModel, { readonly kind: 'home' }> => model.kind === 'home'

const mapHomeModel = <ViewModel>(
  mapper: (viewModel: HomePageViewModel) => ViewModel,
) =>
  (model: HomePageModel): AppPageModel<ViewModel> =>
    ifElse(
      isHomeModel,
      candidate => createPageModel(mapper(candidate.viewModel)),
      candidate => createErrorModel<ViewModel>(candidate.viewModel),
    )(model)

export const resolveInventoryPageModel = (): Promise<AppPageModel<InventoryDetailViewModel>> =>
  resolveHomePageModel().then(mapHomeModel(candidate => mapSummaryWithChartsToInventoryDetailViewModel(candidate.summary, candidate.chartsGallery)))

export const resolvePricePageModel = (): Promise<AppPageModel<PriceDetailViewModel>> =>
  resolveHomePageModel().then(mapHomeModel(candidate => mapSummaryWithChartsToPriceDetailViewModel(candidate.summary, candidate.chartsGallery)))

export const resolveBalancePageModel = (): Promise<AppPageModel<BalanceDetailViewModel>> =>
  resolveHomePageModel().then(mapHomeModel(candidate => mapSummaryWithChartsToBalanceDetailViewModel(candidate.summary, candidate.chartsGallery)))

export const resolveAnalysisPageModel = (): Promise<AppPageModel<AnalysisDetailViewModel>> =>
  resolveHomePageModel().then(mapHomeModel(candidate => mapSummaryWithChartsToAnalysisDetailViewModel(candidate.summary, candidate.chartsGallery)))

export const resolveChartsPageModel = (): Promise<AppPageModel<ChartsGalleryViewModel>> =>
  resolveHomePageModel().then(
    ifElse(
      isHomeModel,
      candidate => createPageModel(candidate.viewModel.chartsGallery),
      candidate => createErrorModel<ChartsGalleryViewModel>(candidate.viewModel),
    ),
  )
