import type { ReactElement } from 'react'

import { OilLintPresentationShell, PresentationErrorShell, AppShell } from '@/presentation'
import { createAppNavigationViewModel } from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { resolveHomePageModel, type HomePageModel } from '@/app/resolve-home-page-model'

const renderSummaryHomePage = (
  model: Extract<HomePageModel, { readonly kind: 'home' }>,
): ReactElement => (
  <AppShell navigation={model.viewModel.navigation}>
    <OilLintPresentationShell viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorHomePage = (
  model: Extract<HomePageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('home')}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isSummaryHomePage = (
  model: HomePageModel,
): model is Extract<HomePageModel, { readonly kind: 'home' }> => model.kind === 'home'

const renderHomePage = (model: HomePageModel): ReactElement =>
  ifElse(isSummaryHomePage, renderSummaryHomePage, renderErrorHomePage)(model)

export default function HomePage(): Promise<ReactElement> {
  return resolveHomePageModel().then(renderHomePage)
}
