import type { ReactElement } from 'react'

import { OilLintPresentationShell, PresentationErrorShell, AppShell } from '@/presentation'
import { createAppNavigationViewModel } from '@/presentation/mappers'
import { ifElse } from '@/shared/fp'
import { parseIsoDate } from '@/shared/date'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import { isSuccess, type Result } from '@/shared/result'
import { defaultReportWeekIso, resolveHomePageModel, type HomePageModel } from '@/app/resolve-home-page-model'

type HomePageSearchParamValue = string | readonly string[] | undefined

type HomePageSearchParams = Readonly<Record<string, HomePageSearchParamValue>>

type HomePageProps = Readonly<{
  readonly searchParams: Promise<HomePageSearchParams>
}>

const isStringValue = (value: HomePageSearchParamValue): value is string => typeof value === 'string'

const trimTextToMaybe = (value: string): Maybe<string> =>
  ifElse(
    (candidate: string) => candidate.trim().length > 0,
    candidate => some(candidate.trim()),
    () => none(),
  )(value)

const firstSearchParamText = (values: readonly string[]): Maybe<string> =>
  ifElse(
    (candidate: string | undefined): candidate is string => typeof candidate === 'string',
    trimTextToMaybe,
    () => none(),
  )(values[0])

const isStringArray = (value: HomePageSearchParamValue): value is readonly string[] =>
  Array.isArray(value)

const searchParamTextAfterString = (value: HomePageSearchParamValue): Maybe<string> =>
  ifElse(
    isStringArray,
    firstSearchParamText,
    () => none(),
  )(value)

const searchParamText = (value: HomePageSearchParamValue): Maybe<string> =>
  ifElse(
    isStringValue,
    trimTextToMaybe,
    searchParamTextAfterString,
  )(value)

const validIsoDateOrDefault = (result: Result<string, unknown>): string =>
  ifElse(
    isSuccess,
    candidate => candidate.value,
    () => defaultReportWeekIso,
  )(result)

const normalizeReportWeekText = (value: string): string =>
  validIsoDateOrDefault(parseIsoDate(value))

const resolveReportWeekFromSearchParams = (params: HomePageSearchParams): string =>
  matchMaybe<string, string>({
    Some: normalizeReportWeekText,
    None: () => defaultReportWeekIso,
  })(searchParamText(params.reportWeek))

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
  props.searchParams.then(params => resolveHomePageModel(resolveReportWeekFromSearchParams(params)))

export default function HomePage(props: HomePageProps): Promise<ReactElement> {
  return resolveHomePageFromProps(props).then(renderHomePage)
}
