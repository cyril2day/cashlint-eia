import type { ReactElement } from 'react'

import { OilLintPresentationShell, PresentationErrorShell, AppShell } from '@/presentation'
import { createAppNavigationViewModel } from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { resolveHomePageModel, type HomePageModel } from '@/app/resolve-home-page-model'
import { resolveReportWeekSelection, type ReportWeekSearchParams } from '@/app/report-week-selection'


type HomePageProps = Readonly<{
  readonly searchParams: Promise<ReportWeekSearchParams>
}>

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

const resolveHomePageFromProps = (props: HomePageProps): Promise<HomePageModel> =>
  props.searchParams.then(params => {
    const selection = resolveReportWeekSelection(params)

    return resolveHomePageModel(selection.requestReportWeekIso, selection.controlReportWeekIso)
  })

export default function HomePage(props: HomePageProps): Promise<ReactElement> {
  return resolveHomePageFromProps(props).then(renderHomePage)
}
