import type { ReactElement } from 'react'

import { ChartGallery, PresentationErrorShell, AppShell } from '@/presentation'
import type { ChartsGalleryViewModel } from '@/presentation/contracts'
import { createAppNavigationViewModel } from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { resolveChartsPageModel, type AppPageModel } from '@/app/resolve-app-page-models'

type ChartsPageModel = AppPageModel<ChartsGalleryViewModel>

const renderChartsPage = (
  model: Extract<ChartsPageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('charts')}>
    <ChartGallery viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<ChartsPageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('charts')}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isChartsPage = (
  model: ChartsPageModel,
): model is Extract<ChartsPageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: ChartsPageModel): ReactElement =>
  ifElse(isChartsPage, renderChartsPage, renderErrorPage)(model)

export default function ChartsPage(): Promise<ReactElement> {
  return resolveChartsPageModel().then(renderPage)
}
