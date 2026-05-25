import type { ReactElement } from 'react'

import { ChartGallery, PresentationErrorShell } from '@/presentation'
import type { ChartsGalleryViewModel } from '@/presentation/contracts'
import { ifElse } from '@/shared/fp'
import { resolveChartsPageModel, type RichUiPageModel } from '../resolve-rich-ui-page-models'

type ChartsPageModel = RichUiPageModel<ChartsGalleryViewModel>

const renderChartsPage = (
  model: Extract<ChartsPageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <main className="detail-page">
    <nav className="detail-page__back" aria-label="Section navigation">
      <a className="detail-page__back-link" href="/">Home</a>
    </nav>
    <ChartGallery viewModel={model.viewModel} />
  </main>
)

const renderErrorPage = (
  model: Extract<ChartsPageModel, { readonly kind: 'error' }>,
): ReactElement => <PresentationErrorShell {...model.viewModel} />

const isChartsPage = (
  model: ChartsPageModel,
): model is Extract<ChartsPageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: ChartsPageModel): ReactElement =>
  ifElse(isChartsPage, renderChartsPage, renderErrorPage)(model)

export default function ChartsPage(): Promise<ReactElement> {
  return resolveChartsPageModel().then(renderPage)
}
