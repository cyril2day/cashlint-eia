import type { PresentationErrorViewModel } from '@/presentation/contracts'
import type {
  AnalysisDetailViewModel,
  BalanceDetailViewModel,
  ChartsGalleryViewModel,
  InventoryDetailViewModel,
  PriceDetailViewModel,
  SummaryViewModel,
} from '@/presentation/contracts'
import {
  mapSummaryToAnalysisDetailViewModel,
  mapSummaryToBalanceDetailViewModel,
  mapSummaryToChartsGalleryViewModel,
  mapSummaryToInventoryDetailViewModel,
  mapSummaryToPriceDetailViewModel,
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
  mapper: (viewModel: SummaryViewModel) => ViewModel,
) =>
  (model: HomePageModel): RichUiPageModel<ViewModel> =>
    ifElse(
      isHomeModel,
      candidate => createPageModel(mapper(candidate.viewModel.summary)),
      candidate => createErrorModel<ViewModel>(candidate.viewModel),
    )(model)

const resolveDetailModel = <ViewModel>(
  mapper: (viewModel: SummaryViewModel) => ViewModel,
): Promise<RichUiPageModel<ViewModel>> =>
  resolveHomePageModel().then(mapHomeModel(mapper))

export const resolveInventoryPageModel = (): Promise<RichUiPageModel<InventoryDetailViewModel>> =>
  resolveDetailModel(mapSummaryToInventoryDetailViewModel)

export const resolvePricePageModel = (): Promise<RichUiPageModel<PriceDetailViewModel>> =>
  resolveDetailModel(mapSummaryToPriceDetailViewModel)

export const resolveBalancePageModel = (): Promise<RichUiPageModel<BalanceDetailViewModel>> =>
  resolveDetailModel(mapSummaryToBalanceDetailViewModel)

export const resolveAnalysisPageModel = (): Promise<RichUiPageModel<AnalysisDetailViewModel>> =>
  resolveDetailModel(mapSummaryToAnalysisDetailViewModel)

export const resolveChartsPageModel = (): Promise<RichUiPageModel<ChartsGalleryViewModel>> =>
  resolveHomePageModel().then(
    ifElse(
      isHomeModel,
      candidate => createPageModel(mapSummaryToChartsGalleryViewModel(candidate.viewModel.summary)),
      candidate => createErrorModel<ChartsGalleryViewModel>(candidate.viewModel),
    ),
  )
