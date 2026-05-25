import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell, AppShell } from '@/presentation'
import type { AnalysisDetailViewModel } from '@/presentation/contracts'
import { createAppNavigationViewModel } from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { resolveAnalysisPageModel, type AppPageModel } from '@/app/resolve-app-page-models'

type AnalysisPageModel = AppPageModel<AnalysisDetailViewModel>

const renderAnalysisPage = (
  model: Extract<AnalysisPageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('analysis')}>
    <DetailPageContent viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<AnalysisPageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('analysis')}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isAnalysisPage = (
  model: AnalysisPageModel,
): model is Extract<AnalysisPageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: AnalysisPageModel): ReactElement =>
  ifElse(isAnalysisPage, renderAnalysisPage, renderErrorPage)(model)

export default function AnalysisPage(): Promise<ReactElement> {
  return resolveAnalysisPageModel().then(renderPage)
}
