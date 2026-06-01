import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell, AppShell } from '@/presentation'
import type { PriceDetailViewModel } from '@/presentation/contracts'
import { ifElse } from '@/shared/fp'
import { resolvePricePageModel, type AppPageModel } from '@/app/resolve-app-page-models'
import { resolveReportWeekSelection, type ReportWeekSearchParams } from '@/app/report-week-selection'

type PricePageModel = AppPageModel<PriceDetailViewModel>
type PricePageProps = Readonly<{
  readonly searchParams: Promise<ReportWeekSearchParams>
}>

const renderPricePage = (
  model: Extract<PricePageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <DetailPageContent viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<PricePageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isPricePage = (
  model: PricePageModel,
): model is Extract<PricePageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: PricePageModel): ReactElement =>
  ifElse(isPricePage, renderPricePage, renderErrorPage)(model)

export default function PricePage(props: PricePageProps): Promise<ReactElement> {
  return props.searchParams
    .then(resolveReportWeekSelection)
    .then(resolvePricePageModel)
    .then(renderPage)
}
