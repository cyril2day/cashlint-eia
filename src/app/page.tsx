import type { ReactElement } from 'react'
import { use } from 'react'

import { OilLintPresentationShell, PresentationErrorShell } from '@/presentation'
import { ifElse } from '@/shared/fp'
import { resolveHomePageModel, type HomePageModel } from './resolve-home-page-model'

const renderSummaryHomePage = (
  model: Extract<HomePageModel, { readonly kind: 'summary' }>,
): ReactElement => <OilLintPresentationShell viewModel={model.viewModel} />

const renderErrorHomePage = (
  model: Extract<HomePageModel, { readonly kind: 'error' }>,
): ReactElement => <PresentationErrorShell {...model.viewModel} />

const isSummaryHomePage = (
  model: HomePageModel,
): model is Extract<HomePageModel, { readonly kind: 'summary' }> => model.kind === 'summary'

export default function HomePage() {
  const model = use(resolveHomePageModel())

  return ifElse(isSummaryHomePage, renderSummaryHomePage, renderErrorHomePage)(model)
}