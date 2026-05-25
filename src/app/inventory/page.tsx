import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell, AppShell } from '@/presentation'
import { ifElse } from '@/shared/fp'
import { createAppNavigationViewModel } from '@/presentation/mappers'
import { resolveInventoryPageModel, type AppPageModel } from '@/app/resolve-app-page-models'
import type { InventoryDetailViewModel } from '@/presentation/contracts'

type InventoryPageModel = AppPageModel<InventoryDetailViewModel>

const renderInventoryPage = (
  model: Extract<InventoryPageModel, { readonly kind: 'page' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('inventory')}>
    <DetailPageContent viewModel={model.viewModel} />
  </AppShell>
)

const renderErrorPage = (
  model: Extract<InventoryPageModel, { readonly kind: 'error' }>,
): ReactElement => (
  <AppShell navigation={createAppNavigationViewModel('inventory')}>
    <PresentationErrorShell {...model.viewModel} />
  </AppShell>
)

const isInventoryPage = (
  model: InventoryPageModel,
): model is Extract<InventoryPageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: InventoryPageModel): ReactElement =>
  ifElse(isInventoryPage, renderInventoryPage, renderErrorPage)(model)

export default function InventoryPage(): Promise<ReactElement> {
  return resolveInventoryPageModel().then(renderPage)
}
