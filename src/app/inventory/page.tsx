import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell, AppShell } from '@/presentation'
import { ifElse } from '@/shared/fp'
import { resolveInventoryPageModel, type AppPageModel } from '@/app/resolve-app-page-models'
import { resolveReportWeekSelection, type ReportWeekSearchParams } from '@/app/report-week-selection'
import type { InventoryDetailViewModel } from '@/presentation/contracts'

type InventoryPageModel = AppPageModel<InventoryDetailViewModel>
type InventoryPageProps = Readonly<{
  readonly searchParams: Promise<ReportWeekSearchParams>
}>

const renderInventoryPage = (
  model: Extract<InventoryPageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <DetailPageContent viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<InventoryPageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isInventoryPage = (
  model: InventoryPageModel,
): model is Extract<InventoryPageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: InventoryPageModel): ReactElement =>
  ifElse(isInventoryPage, renderInventoryPage, renderErrorPage)(model)

export default function InventoryPage(props: InventoryPageProps): Promise<ReactElement> {
  return props.searchParams
    .then(resolveReportWeekSelection)
    .then(resolveInventoryPageModel)
    .then(renderPage)
}
