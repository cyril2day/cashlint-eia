import type { ReactElement } from 'react'

import { OilLintPresentationShell, PresentationErrorShell } from '@/presentation'
import { ifElse } from '@/shared/fp'
import { resolveHomePageModel, type HomePageModel } from './resolve-home-page-model'

const renderSummaryHomePage = (
  model: Extract<HomePageModel, { readonly kind: 'home' }>,
): ReactElement => <OilLintPresentationShell viewModel={model.viewModel} />

const renderErrorHomePage = (
  model: Extract<HomePageModel, { readonly kind: 'error' }>,
): ReactElement => <PresentationErrorShell {...model.viewModel} />

const isSummaryHomePage = (
  model: HomePageModel,
): model is Extract<HomePageModel, { readonly kind: 'home' }> => model.kind === 'home'

const renderHomePage = (model: HomePageModel): ReactElement =>
  ifElse(isSummaryHomePage, renderSummaryHomePage, renderErrorHomePage)(model)

export default function HomePage(): Promise<ReactElement> {
  return resolveHomePageModel().then(renderHomePage)
}
