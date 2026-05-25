import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell } from '@/presentation'
import type { AnalysisDetailViewModel } from '@/presentation/contracts'
import { ifElse } from '@/shared/fp'
import { resolveAnalysisPageModel, type RichUiPageModel } from '../resolve-rich-ui-page-models'

type AnalysisPageModel = RichUiPageModel<AnalysisDetailViewModel>

const renderAnalysisPage = (
  model: Extract<AnalysisPageModel, { readonly kind: 'page' }>,
): ReactElement => <DetailPageContent viewModel={model.viewModel} />

const renderErrorPage = (
  model: Extract<AnalysisPageModel, { readonly kind: 'error' }>,
): ReactElement => <PresentationErrorShell {...model.viewModel} />

const isAnalysisPage = (
  model: AnalysisPageModel,
): model is Extract<AnalysisPageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: AnalysisPageModel): ReactElement =>
  ifElse(isAnalysisPage, renderAnalysisPage, renderErrorPage)(model)

export default function AnalysisPage(): Promise<ReactElement> {
  return resolveAnalysisPageModel().then(renderPage)
}
