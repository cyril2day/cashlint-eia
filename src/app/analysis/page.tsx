import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell, AppShell } from '@/presentation'
import type { AnalysisDetailViewModel } from '@/presentation/contracts'
import { ifElse } from '@/shared/fp'
import { resolveAnalysisPageModel, type AppPageModel } from '@/app/resolve-app-page-models'
import { resolveReportWeekSelection, type ReportWeekSearchParams } from '@/app/report-week-selection'

type AnalysisPageModel = AppPageModel<AnalysisDetailViewModel>
type AnalysisPageProps = Readonly<{
  readonly searchParams: Promise<ReportWeekSearchParams>
}>

const renderAnalysisPage = (
  model: Extract<AnalysisPageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <DetailPageContent viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<AnalysisPageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={model.navigation}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isAnalysisPage = (
  model: AnalysisPageModel,
): model is Extract<AnalysisPageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: AnalysisPageModel): ReactElement =>
  ifElse(isAnalysisPage, renderAnalysisPage, renderErrorPage)(model)

export default function AnalysisPage(props: AnalysisPageProps): Promise<ReactElement> {
  return props.searchParams
    .then(resolveReportWeekSelection)
    .then(resolveAnalysisPageModel)
    .then(renderPage)
}
