import type { ReactElement } from 'react'

import { ChartGallery, PresentationErrorShell, AppShell } from '@/presentation'
import type { ChartGalleryControlsViewModel, ChartsGalleryViewModel } from '@/presentation/contracts'
import { cond, ifElse } from '@/shared/fp'
import { resolveChartsPageModel, type AppPageModel } from '@/app/resolve-app-page-models'
import { resolveReportWeekSelection, type ReportWeekSearchParamValue, type ReportWeekSearchParams } from '@/app/report-week-selection'

type ChartsPageModel = AppPageModel<ChartsGalleryViewModel>
type ChartsPageProps = Readonly<{
  readonly searchParams: Promise<ReportWeekSearchParams>
}>

const stringFromSearchParam = (value: ReportWeekSearchParamValue): string =>
  ifElse(
    Array.isArray,
    candidate => String(candidate[0]),
    candidate => String(candidate),
  )(value)

const numberFromSearchParam =
  (params: ReportWeekSearchParams) =>
  (name: string): number =>
    Number(stringFromSearchParam(params[name]))

const boundedControlNumber = (
  candidate: number,
  fallback: number,
  minimum: number,
  maximum: number,
): number =>
  cond<[number], number>([
    [value => Number.isFinite(value) === false, () => fallback],
    [value => value < minimum, () => minimum],
    [value => value > maximum, () => maximum],
    [() => true, value => Math.floor(value)],
  ])(candidate)

const chartControlsFromSearchParams = (params: ReportWeekSearchParams): ChartGalleryControlsViewModel => {
  const numberParam = numberFromSearchParam(params)

  return {
    histogramBinCount: boundedControlNumber(numberParam('histogramBins'), 6, 2, 12),
    lineXAxisTickCount: boundedControlNumber(numberParam('lineXTicks'), 3, 2, 8),
    areaXAxisTickCount: boundedControlNumber(numberParam('areaXTicks'), 3, 2, 8),
  }
}

const galleryWithControls = (
  controls: ChartGalleryControlsViewModel,
) =>
  (viewModel: ChartsGalleryViewModel): ChartsGalleryViewModel => ({
    ...viewModel,
    controls,
  })

const pageModelWithControls =
  (controls: ChartGalleryControlsViewModel) =>
  (model: ChartsPageModel): ChartsPageModel =>
    ifElse(
      isChartsPage,
      candidate => ({
        ...candidate,
        viewModel: galleryWithControls(controls)(candidate.viewModel),
      }),
      candidate => candidate,
    )(model)

const renderChartsPage = (
  model: Extract<ChartsPageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <ChartGallery viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<ChartsPageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isChartsPage = (
  model: ChartsPageModel,
): model is Extract<ChartsPageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: ChartsPageModel): ReactElement =>
  ifElse(isChartsPage, renderChartsPage, renderErrorPage)(model)

export default function ChartsPage({ searchParams }: ChartsPageProps): Promise<ReactElement> {
  return searchParams.then(params =>
    resolveChartsPageModel(resolveReportWeekSelection(params))
      .then(pageModelWithControls(chartControlsFromSearchParams(params)))
      .then(renderPage),
  )
}
