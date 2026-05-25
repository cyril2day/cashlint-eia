import type { ReactElement } from 'react'

import { DetailPageContent, PresentationErrorShell } from '@/presentation'
import type { PriceDetailViewModel } from '@/presentation/contracts'
import { ifElse } from '@/shared/fp'
import { resolvePricePageModel, type RichUiPageModel } from '../resolve-rich-ui-page-models'

type PricePageModel = RichUiPageModel<PriceDetailViewModel>

const renderPricePage = (
  model: Extract<PricePageModel, { readonly kind: 'page' }>,
): ReactElement => <DetailPageContent viewModel={model.viewModel} />

const renderErrorPage = (
  model: Extract<PricePageModel, { readonly kind: 'error' }>,
): ReactElement => <PresentationErrorShell {...model.viewModel} />

const isPricePage = (
  model: PricePageModel,
): model is Extract<PricePageModel, { readonly kind: 'page' }> => model.kind === 'page'

const renderPage = (model: PricePageModel): ReactElement =>
  ifElse(isPricePage, renderPricePage, renderErrorPage)(model)

export default function PricePage(): Promise<ReactElement> {
  return resolvePricePageModel().then(renderPage)
}
