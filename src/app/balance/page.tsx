import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell } from '@/presentation'
import type { BalanceDetailViewModel } from '@/presentation/contracts'
import { ifElse } from '@/shared/fp'
import { resolveBalancePageModel, type RichUiPageModel } from '../resolve-rich-ui-page-models'

type BalancePageModel = RichUiPageModel<BalanceDetailViewModel>

const renderBalancePage = (
  model: Extract<BalancePageModel, { readonly kind: 'page' }>,
): ReactElement => <DetailPageContent viewModel={model.viewModel} />

const renderErrorPage = (
  model: Extract<BalancePageModel, { readonly kind: 'error' }>,
): ReactElement => <PresentationErrorShell {...model.viewModel} />

const isBalancePage = (
  model: BalancePageModel,
): model is Extract<BalancePageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: BalancePageModel): ReactElement =>
  ifElse(isBalancePage, renderBalancePage, renderErrorPage)(model)

export default function BalancePage(): Promise<ReactElement> {
  return resolveBalancePageModel().then(renderPage)
}
