import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell, AppShell } from '@/presentation'
import type { PriceDetailViewModel } from '@/presentation/contracts'
import { createAppNavigationViewModel } from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { resolvePricePageModel, type AppPageModel } from '@/app/resolve-app-page-models'

type PricePageModel = AppPageModel<PriceDetailViewModel>

const renderPricePage = (
  model: Extract<PricePageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('price')}>
    <DetailPageContent viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<PricePageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('price')}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isPricePage = (
  model: PricePageModel,
): model is Extract<PricePageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: PricePageModel): ReactElement =>
  ifElse(isPricePage, renderPricePage, renderErrorPage)(model)

export default function PricePage(): Promise<ReactElement> {
  return resolvePricePageModel().then(renderPage)
}
