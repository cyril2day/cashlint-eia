import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell, AppShell } from '@/presentation'
import type { BalanceDetailViewModel } from '@/presentation/contracts'
import { ifElse } from '@/shared/fp'
import { resolveBalancePageModel, type AppPageModel } from '@/app/resolve-app-page-models'
import { resolveReportWeekSelection, type ReportWeekSearchParams } from '@/app/report-week-selection'

type BalancePageModel = AppPageModel<BalanceDetailViewModel>
type BalancePageProps = Readonly<{
  readonly searchParams: Promise<ReportWeekSearchParams>
}>

const renderBalancePage = (
  model: Extract<BalancePageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <DetailPageContent viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<BalancePageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isBalancePage = (
  model: BalancePageModel,
): model is Extract<BalancePageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: BalancePageModel): ReactElement =>
  ifElse(isBalancePage, renderBalancePage, renderErrorPage)(model)

export default function BalancePage(props: BalancePageProps): Promise<ReactElement> {
  return props.searchParams
    .then(resolveReportWeekSelection)
    .then(resolveBalancePageModel)
    .then(renderPage)
}
