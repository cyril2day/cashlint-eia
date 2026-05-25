import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell } from '@/presentation'
import { ifElse } from '@/shared/fp'
import { resolveInventoryPageModel, type RichUiPageModel } from '../resolve-rich-ui-page-models'
import type { InventoryDetailViewModel } from '@/presentation/contracts'

type InventoryPageModel = RichUiPageModel<InventoryDetailViewModel>

const renderInventoryPage = (
  model: Extract<InventoryPageModel, { readonly kind: 'page' }>,
): ReactElement => <DetailPageContent viewModel={model.viewModel} />

const renderErrorPage = (
  model: Extract<InventoryPageModel, { readonly kind: 'error' }>,
): ReactElement => <PresentationErrorShell {...model.viewModel} />

const isInventoryPage = (
  model: InventoryPageModel,
): model is Extract<InventoryPageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: InventoryPageModel): ReactElement =>
  ifElse(isInventoryPage, renderInventoryPage, renderErrorPage)(model)

export default function InventoryPage(): Promise<ReactElement> {
  return resolveInventoryPageModel().then(renderPage)
}
