import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell, AppShell } from '@/presentation'
import type { BalanceDetailViewModel } from '@/presentation/contracts'
import { createAppNavigationViewModel } from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { resolveBalancePageModel, type AppPageModel } from '@/app/resolve-app-page-models'

type BalancePageModel = AppPageModel<BalanceDetailViewModel>

const renderBalancePage = (
  model: Extract<BalancePageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('balance')}>
    <DetailPageContent viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<BalancePageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('balance')}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isBalancePage = (
  model: BalancePageModel,
): model is Extract<BalancePageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: BalancePageModel): ReactElement =>
  ifElse(isBalancePage, renderBalancePage, renderErrorPage)(model)

export default function BalancePage(): Promise<ReactElement> {
  return resolveBalancePageModel().then(renderPage)
}
