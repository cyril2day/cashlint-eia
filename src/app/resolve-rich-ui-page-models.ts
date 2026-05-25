import type { PresentationErrorViewModel } from '@/presentation/contracts'
import type {
  AnalysisDetailViewModel,
  BalanceDetailViewModel,
  ChartsGalleryViewModel,
  InventoryDetailViewModel,
  PriceDetailViewModel,
  RichHomeViewModel,
} from '@/presentation/contracts'
import {
  mapSummaryWithChartsToAnalysisDetailViewModel,
  mapSummaryWithChartsToBalanceDetailViewModel,
  mapSummaryWithChartsToInventoryDetailViewModel,
  mapSummaryWithChartsToPriceDetailViewModel,
} from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { resolveHomePageModel, type HomePageModel } from './resolve-home-page-model'

export type RichUiPageModel<ViewModel> = Readonly<{
  readonly kind: 'page'
  readonly viewModel: ViewModel
} | {
  readonly kind: 'error'
  readonly viewModel: PresentationErrorViewModel
}>

const createPageModel = <ViewModel>(viewModel: ViewModel): RichUiPageModel<ViewModel> => ({
  kind: 'page',
  viewModel,
})

const createErrorModel = <ViewModel>(viewModel: PresentationErrorViewModel): RichUiPageModel<ViewModel> => ({
  kind: 'error',
  viewModel,
})

const isHomeModel = (
  model: HomePageModel,
): model is Extract<HomePageModel, { readonly kind: 'home' }> => model.kind === 'home'

const mapHomeModel = <ViewModel>(
  mapper: (viewModel: RichHomeViewModel) => ViewModel,
) =>
  (model: HomePageModel): RichUiPageModel<ViewModel> =>
    ifElse(
      isHomeModel,
      candidate => createPageModel(mapper(candidate.viewModel)),
      candidate => createErrorModel<ViewModel>(candidate.viewModel),
    )(model)

export const resolveInventoryPageModel = (): Promise<RichUiPageModel<InventoryDetailViewModel>> =>
  resolveHomePageModel().then(mapHomeModel(candidate => mapSummaryWithChartsToInventoryDetailViewModel(candidate.summary, candidate.chartsGallery)))

export const resolvePricePageModel = (): Promise<RichUiPageModel<PriceDetailViewModel>> =>
  resolveHomePageModel().then(mapHomeModel(candidate => mapSummaryWithChartsToPriceDetailViewModel(candidate.summary, candidate.chartsGallery)))

export const resolveBalancePageModel = (): Promise<RichUiPageModel<BalanceDetailViewModel>> =>
  resolveHomePageModel().then(mapHomeModel(candidate => mapSummaryWithChartsToBalanceDetailViewModel(candidate.summary, candidate.chartsGallery)))

export const resolveAnalysisPageModel = (): Promise<RichUiPageModel<AnalysisDetailViewModel>> =>
  resolveHomePageModel().then(mapHomeModel(candidate => mapSummaryWithChartsToAnalysisDetailViewModel(candidate.summary, candidate.chartsGallery)))

export const resolveChartsPageModel = (): Promise<RichUiPageModel<ChartsGalleryViewModel>> =>
  resolveHomePageModel().then(
    ifElse(
      isHomeModel,
      candidate => createPageModel(candidate.viewModel.chartsGallery),
      candidate => createErrorModel<ChartsGalleryViewModel>(candidate.viewModel),
    ),
  )
