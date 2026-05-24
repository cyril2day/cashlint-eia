import { allPass, both, cond, ifElse, isNonEmptyString } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import { failure, success, type Result } from '@/shared/result'

export type EiaRetryConfig = Readonly<{
  readonly maxAttempts: number
  readonly delayMs: number
}>

export type EiaRuntimeConfigInput = Readonly<{
  readonly baseUrl: string
  readonly apiKey: Maybe<string>
  readonly requireApiKey: boolean
  readonly timeoutMs: number
  readonly retry: EiaRetryConfig
  readonly userAgent: Maybe<string>
}>

export type EiaRuntimeConfig = Readonly<{
  readonly baseUrl: URL
  readonly apiKey: Maybe<string>
  readonly timeoutMs: number
  readonly retry: EiaRetryConfig
  readonly userAgent: Maybe<string>
}>

export type EiaRuntimeConfigurationErrorKind =
  | 'MissingBaseUrl'
  | 'MalformedBaseUrl'
  | 'MissingApiKey'
  | 'InvalidTimeout'
  | 'InvalidRetryCount'
  | 'InvalidRetryDelay'

export type EiaRuntimeConfigurationError = Readonly<{
  readonly kind: EiaRuntimeConfigurationErrorKind
  readonly message: string
}>

const trimText = (value: string): string => value.trim()

const cleanMaybeText = (value: Maybe<string>): Maybe<string> =>
  matchMaybe<string, Maybe<string>>({
    Some: candidate =>
      ifElse(
        isNonEmptyString,
        valid => some(valid),
        () => none(),
      )(trimText(candidate)),
    None: () => none(),
  })(value)

const hasMaybeText = (value: Maybe<string>): boolean =>
  cleanMaybeText(value).kind === 'Some'

const parseBaseUrl = (value: string): Result<URL, EiaRuntimeConfigurationError> => {
  try {
    return success(new URL(value))
  } catch {
    return failure({
      kind: 'MalformedBaseUrl',
      message: 'EIA base URL must be an absolute URL.',
    })
  }
}

const configurationError = (
  kind: EiaRuntimeConfigurationErrorKind,
  message: string,
): Result<EiaRuntimeConfig, EiaRuntimeConfigurationError> =>
  failure({ kind, message })

const hasInvalidTimeout = (input: EiaRuntimeConfigInput): boolean =>
  both(
    (candidate: EiaRuntimeConfigInput) => Number.isFinite(candidate.timeoutMs),
    (candidate: EiaRuntimeConfigInput) => candidate.timeoutMs > 0,
  )(input) === false

const hasInvalidRetryCount = (input: EiaRuntimeConfigInput): boolean =>
  both(
    (candidate: EiaRuntimeConfigInput) => Number.isInteger(candidate.retry.maxAttempts),
    (candidate: EiaRuntimeConfigInput) => candidate.retry.maxAttempts > 0,
  )(input) === false

const hasInvalidRetryDelay = (input: EiaRuntimeConfigInput): boolean =>
  both(
    (candidate: EiaRuntimeConfigInput) => Number.isFinite(candidate.retry.delayMs),
    (candidate: EiaRuntimeConfigInput) => candidate.retry.delayMs >= 0,
  )(input) === false

const isMissingRequiredApiKey = (input: EiaRuntimeConfigInput): boolean =>
  both(
    (candidate: EiaRuntimeConfigInput) => candidate.requireApiKey === true,
    (candidate: EiaRuntimeConfigInput) => hasMaybeText(candidate.apiKey) === false,
  )(input)

const hasMissingBaseUrl = (input: EiaRuntimeConfigInput): boolean =>
  isNonEmptyString(input.baseUrl.trim()) === false

const createValidatedConfig = (
  input: EiaRuntimeConfigInput,
): Result<EiaRuntimeConfig, EiaRuntimeConfigurationError> =>
  ifElse(
    (candidate: Result<URL, EiaRuntimeConfigurationError>) => candidate.ok === true,
    candidate => success({
      baseUrl: candidate.value,
      apiKey: cleanMaybeText(input.apiKey),
      timeoutMs: input.timeoutMs,
      retry: input.retry,
      userAgent: cleanMaybeText(input.userAgent),
    }),
    candidate => failure(candidate.error),
  )(parseBaseUrl(input.baseUrl.trim()))

export const validateEiaRuntimeConfig = (
  input: EiaRuntimeConfigInput,
): Result<EiaRuntimeConfig, EiaRuntimeConfigurationError> =>
  cond<[EiaRuntimeConfigInput], Result<EiaRuntimeConfig, EiaRuntimeConfigurationError>>([
    [
      hasMissingBaseUrl,
      () => configurationError('MissingBaseUrl', 'EIA base URL is required.'),
    ],
    [
      isMissingRequiredApiKey,
      () => configurationError('MissingApiKey', 'EIA API key is required by runtime policy.'),
    ],
    [
      hasInvalidTimeout,
      () => configurationError('InvalidTimeout', 'EIA request timeout must be a positive finite number.'),
    ],
    [
      hasInvalidRetryCount,
      () => configurationError('InvalidRetryCount', 'EIA retry maxAttempts must be an integer greater than zero.'),
    ],
    [
      hasInvalidRetryDelay,
      () => configurationError('InvalidRetryDelay', 'EIA retry delay must be a non-negative finite number.'),
    ],
    [
      allPass([
        (candidate: EiaRuntimeConfigInput) => hasMissingBaseUrl(candidate) === false,
        (candidate: EiaRuntimeConfigInput) => isMissingRequiredApiKey(candidate) === false,
        (candidate: EiaRuntimeConfigInput) => hasInvalidTimeout(candidate) === false,
        (candidate: EiaRuntimeConfigInput) => hasInvalidRetryCount(candidate) === false,
        (candidate: EiaRuntimeConfigInput) => hasInvalidRetryDelay(candidate) === false,
      ]),
      createValidatedConfig,
    ],
  ])(input)
