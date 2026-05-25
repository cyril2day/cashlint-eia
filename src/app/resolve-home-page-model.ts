import type { ApplicationError } from '@/application/errors'
import { createWalkingSkeletonDependencies } from '@/application/dependencies/walking-skeleton-dependencies'
import { buildLiveSummaryViewModel } from '@/application/workflows/build-live-summary-view-model'
import type { EiaClient, UpstreamError } from '@/application/ports/eia-client'
import type { RichHomeViewModel } from '@/presentation/contracts/rich-home-view-model'
import type { SummaryViewModel } from '@/presentation/contracts/summary-view-model'
import type { PresentationErrorViewModel } from '@/presentation/contracts/presentation-error-view-model'
import { mapSummaryToRichHomeViewModel } from '@/presentation/mappers'
import { createRealEiaClient, validateEiaRuntimeConfig, type EiaRuntimeConfig, type EiaRuntimeConfigurationError } from '@/infrastructure/eia'
import type { EiaRuntimeConfigInput } from '@/infrastructure/eia'
import { allPass, cond, ifElse, isNil } from '@/shared/fp'
import { none, some, type Maybe } from '@/shared/maybe'
import type { Result } from '@/shared/result'

export type HomePageModel = Readonly<{
  readonly kind: 'home'
  readonly viewModel: RichHomeViewModel
} | {
  readonly kind: 'error'
  readonly viewModel: PresentationErrorViewModel
}>

type SummaryResult = Result<SummaryViewModel, ApplicationError>

const defaultReportWeekIso = '2026-01-09'

const isStringValue = (value: string | undefined): value is string => typeof value === 'string'

const trimTextToMaybe = (value: string): Maybe<string> =>
  ifElse(
    (candidate: string) => candidate.trim().length > 0,
    candidate => some(candidate.trim()),
    () => none(),
  )(value)

const isExplicitFalse = (value: string): boolean => value === 'false'

const isRetriableHttpStatus = (status: number): boolean =>
  cond<[number], boolean>([
    [candidate => candidate === 429, () => true],
    [candidate => candidate >= 500, () => true],
    [() => true, () => false],
  ])(status)

const maybeTextFromEnv = (value: string | undefined): Maybe<string> =>
  ifElse(isStringValue, trimTextToMaybe, () => none())(value)

const parseNumberFromEnv = (value: string | undefined, fallback: number): number =>
  ifElse(
    isStringValue,
    candidate => Number(candidate),
    () => fallback,
  )(value)

const resolveRequireApiKeyFromText = (value: string): boolean =>
  ifElse(
    isExplicitFalse,
    () => false,
    () => true,
  )(value)

const requireApiKeyFromEnv = (value: string | undefined): boolean =>
  ifElse(isStringValue, resolveRequireApiKeyFromText, () => true)(value)

const readRuntimeConfigInput = (): EiaRuntimeConfigInput => ({
  baseUrl: ifElse(
    isStringValue,
    candidate => candidate,
    () => '',
  )(process.env.EIA_BASE_URL),
  apiKey: maybeTextFromEnv(process.env.EIA_API_KEY),
  requireApiKey: requireApiKeyFromEnv(process.env.EIA_REQUIRE_API_KEY),
  timeoutMs: parseNumberFromEnv(process.env.EIA_TIMEOUT_MS, 15_000),
  retry: {
    maxAttempts: parseNumberFromEnv(process.env.EIA_RETRY_MAX_ATTEMPTS, 2),
    delayMs: parseNumberFromEnv(process.env.EIA_RETRY_DELAY_MS, 250),
  },
  userAgent: maybeTextFromEnv(process.env.EIA_USER_AGENT),
})

const resolveReportWeekIso = (): string =>
  ifElse(
    isStringValue,
    candidate => candidate.trim(),
    () => defaultReportWeekIso,
  )(process.env.OIL_LINT_REPORT_WEEK)

const isConfigSuccess = (
  candidate: Result<EiaRuntimeConfig, EiaRuntimeConfigurationError>,
): candidate is Extract<Result<EiaRuntimeConfig, EiaRuntimeConfigurationError>, { readonly ok: true }> => candidate.ok === true

const configurationErrorViewModel = (
  error: EiaRuntimeConfigurationError,
): PresentationErrorViewModel => ({
  title: 'EIA runtime configuration required',
  message: error.message,
  correlationId: none(),
  retryHint: some('Set EIA_BASE_URL and EIA_API_KEY in your local environment, then refresh the page.'),
})

const createSummaryHomePageModel = (viewModel: SummaryViewModel): HomePageModel => ({
  kind: 'home',
  viewModel: mapSummaryToRichHomeViewModel(viewModel),
})

const createErrorHomePageModel = (viewModel: PresentationErrorViewModel): HomePageModel => ({
  kind: 'error',
  viewModel,
})

const isSummarySuccess = (
  candidate: SummaryResult,
): candidate is Extract<SummaryResult, { readonly ok: true }> => candidate.ok === true

const summaryResultToHomePageModel = (result: SummaryResult): HomePageModel =>
  ifElse(
    isSummarySuccess,
    candidate => createSummaryHomePageModel(candidate.value),
    candidate => createErrorHomePageModel(applicationErrorToViewModel(candidate.error)),
  )(result)

const retryHintFromRetriableHttpStatus = (
  error: Extract<UpstreamError, { readonly kind: 'UpstreamHttpStatus' }>,
): Maybe<string> =>
  ifElse(
    (candidate: Extract<UpstreamError, { readonly kind: 'UpstreamHttpStatus' }>) => isRetriableHttpStatus(candidate.status),
    () => some('The upstream request can be retried safely. Refresh the page or try again shortly.'),
    () => none(),
  )(error)

const isUpstreamMalformedResponse = (
  error: UpstreamError,
): error is Extract<UpstreamError, { readonly kind: 'UpstreamMalformedResponse' }> => error.kind === 'UpstreamMalformedResponse'

const isUpstreamTimeout = (
  error: UpstreamError,
): error is Extract<UpstreamError, { readonly kind: 'UpstreamTimeout' }> => error.kind === 'UpstreamTimeout'

const isUpstreamNetworkFailure = (
  error: UpstreamError,
): error is Extract<UpstreamError, { readonly kind: 'UpstreamNetworkFailure' }> => error.kind === 'UpstreamNetworkFailure'

const isUpstreamHttpStatus = (
  error: UpstreamError,
): error is Extract<UpstreamError, { readonly kind: 'UpstreamHttpStatus' }> => error.kind === 'UpstreamHttpStatus'

const retryHintFromUpstreamError = (error: UpstreamError): Maybe<string> =>
  ifElse(
    isUpstreamTimeout,
    () => some('The upstream request can be retried safely. Refresh the page or try again shortly.'),
    retryHintFromNonTimeoutUpstreamError,
  )(error)

const retryHintFromNonTimeoutUpstreamError = (error: UpstreamError): Maybe<string> =>
  ifElse(
    isUpstreamNetworkFailure,
    () => some('The upstream request can be retried safely. Refresh the page or try again shortly.'),
    retryHintFromHttpOrNone,
  )(error)

const retryHintFromHttpOrNone = (error: UpstreamError): Maybe<string> =>
  ifElse(
    isUpstreamHttpStatus,
    retryHintFromRetriableHttpStatus,
    () => none(),
  )(error)

const isUpstreamFailure = (
  error: ApplicationError,
): error is Extract<ApplicationError, { readonly kind: 'UpstreamFailure' }> => error.kind === 'UpstreamFailure'

const isBoundaryFailure = (
  error: ApplicationError,
): error is Extract<ApplicationError, { readonly kind: 'BoundaryFailure' }> => error.kind === 'BoundaryFailure'

const isMeasurementFailure = (
  error: ApplicationError,
): error is Extract<ApplicationError, { readonly kind: 'MeasurementFailure' }> => error.kind === 'MeasurementFailure'

const upstreamFailureViewModel = (
  error: Extract<ApplicationError, { readonly kind: 'UpstreamFailure' }>,
): PresentationErrorViewModel => ({
  title: 'Live EIA request failed',
  message: error.error.message,
  correlationId: upstreamErrorCorrelationId(error.error),
  retryHint: retryHintFromUpstreamError(error.error),
})

const boundaryFailureViewModel = (
  error: Extract<ApplicationError, { readonly kind: 'BoundaryFailure' }>,
): PresentationErrorViewModel => ({
  title: 'Boundary validation failed',
  message: error.error.map(boundaryError => boundaryError.kind).join(', '),
  correlationId: none(),
  retryHint: none(),
})

const upstreamErrorCorrelationId = (error: UpstreamError): Maybe<string> =>
  ifElse(
    isUpstreamTimeout,
    candidate => candidate.correlationId,
    upstreamErrorCorrelationIdAfterTimeout,
  )(error)

const upstreamErrorCorrelationIdAfterTimeout = (error: UpstreamError): Maybe<string> =>
  ifElse(
    isUpstreamNetworkFailure,
    candidate => candidate.correlationId,
    upstreamErrorCorrelationIdAfterNetworkFailure,
  )(error)

const upstreamErrorCorrelationIdAfterNetworkFailure = (error: UpstreamError): Maybe<string> =>
  ifElse(
    isUpstreamHttpStatus,
    candidate => candidate.correlationId,
    upstreamErrorCorrelationIdAfterHttpStatus,
  )(error)

const upstreamErrorCorrelationIdAfterHttpStatus = (error: UpstreamError): Maybe<string> =>
  ifElse(
    isUpstreamMalformedResponse,
    candidate => candidate.correlationId,
    () => none(),
  )(error)

const measurementFailureViewModel = (
  error: Extract<ApplicationError, { readonly kind: 'MeasurementFailure' }>,
): PresentationErrorViewModel => ({
  title: 'Live analysis could not be composed',
  message: formatMeasurementFailureMessage(error.error),
  correlationId: none(),
  retryHint: none(),
})

const isObjectCandidate = (input: unknown): input is object =>
  allPass([
    (candidate: unknown) => typeof candidate === 'object',
    (candidate: unknown) => isNil(candidate) === false,
  ])(input)

const formatMeasurementFailureMessage = (error: unknown): string =>
  ifElse(
    isObjectCandidate,
    candidate => JSON.stringify(candidate),
    candidate => String(candidate),
  )(error)

const applicationErrorMeasurementFallbackViewModel = (error: ApplicationError): PresentationErrorViewModel =>
  ifElse(
    isMeasurementFailure,
    measurementFailureViewModel,
    () => measurementFailureViewModel({ kind: 'MeasurementFailure', error }),
  )(error)

const applicationErrorBoundaryOrMeasurementViewModel = (error: ApplicationError): PresentationErrorViewModel =>
  ifElse(
    isBoundaryFailure,
    boundaryFailureViewModel,
    applicationErrorMeasurementFallbackViewModel,
  )(error)

const applicationErrorToViewModel = (error: ApplicationError): PresentationErrorViewModel =>
  ifElse(
    isUpstreamFailure,
    upstreamFailureViewModel,
    applicationErrorBoundaryOrMeasurementViewModel,
  )(error)

const loadLiveSummary = (
  config: EiaRuntimeConfig,
): Promise<HomePageModel> => {
  const client: EiaClient = createRealEiaClient(config)
  const command = { reportWeekIso: resolveReportWeekIso() }
  const dependencies = createWalkingSkeletonDependencies({ eiaClient: client })

  return buildLiveSummaryViewModel(dependencies)(command).then(summaryResultToHomePageModel)
}

export const resolveHomePageModel = (): Promise<HomePageModel> =>
  ifElse(
    isConfigSuccess,
    candidate => loadLiveSummary(candidate.value),
    candidate => Promise.resolve(createErrorHomePageModel(configurationErrorViewModel(candidate.error))),
  )(validateEiaRuntimeConfig(readRuntimeConfigInput()))
