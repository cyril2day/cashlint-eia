import type { ClientRequest, IncomingHttpHeaders, IncomingMessage, RequestOptions } from 'node:http'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

import type { EiaClient, EiaRequest, UpstreamError } from '@/application/ports/eia-client'
import type { PeriodCandidate, RawEiaEnvelope, RawEiaRow, ValueCandidate } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import { allPass, both, cond, ifElse, isNil } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import { failure, success, type Result } from '@/shared/result'
import { buildEiaRequestUrl, sanitizeEiaUrl } from './request-url'
import type { EiaRuntimeConfig } from './runtime-config'

export type EiaFetch = (input: RequestInfo | URL, init: RequestInit) => Promise<Response>

export type EiaAdapterLogger = Readonly<{
  readonly info: (event: EiaAdapterLogEvent) => void
  readonly warn: (event: EiaAdapterLogEvent) => void
}>

export type EiaAdapterLogEvent = Readonly<{
  readonly kind: 'RequestStarted' | 'RequestSucceeded' | 'RequestFailed' | 'RetryScheduled' | 'RetryExhausted'
  readonly endpoint: string
  readonly sanitizedUrl: string
  readonly attempt: number
  readonly correlationId: Maybe<string>
  readonly status: Maybe<number>
  readonly errorKind: Maybe<UpstreamError['kind']>
}>

export type EiaAdapterDependencies = Readonly<{
  readonly fetch: EiaFetch
  readonly delay: (ms: number) => Promise<void>
  readonly logger: Maybe<EiaAdapterLogger>
  readonly correlationId: Maybe<string>
}>

const defaultDelay = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, ms)
  })

type NodeRequest = (
  url: URL,
  options: RequestOptions,
  callback: (response: IncomingMessage) => void,
) => ClientRequest

const requestForUrl = (url: URL): NodeRequest =>
  ifElse(
    (candidate: URL) => candidate.protocol === 'http:',
    () => httpRequest,
    () => httpsRequest,
  )(url)

const emptyHeaderEntries = (): [string, string][] => []

const responseHeaderArrayEntries =
  (key: string) =>
  (value: string | readonly string[] | undefined): [string, string][] =>
    ifElse(
      (candidate: string | readonly string[] | undefined): candidate is readonly string[] => Array.isArray(candidate),
      values => values.map((valueItem): [string, string] => [key, valueItem]),
      emptyHeaderEntries,
    )(value)

const singleResponseHeaderEntry =
  (key: string) =>
  (value: string): [string, string][] => [[key, value]]

const responseHeaderValueEntries = (
  key: string,
  value: string | readonly string[] | undefined,
): [string, string][] =>
  ifElse(
    (candidate: string | readonly string[] | undefined): candidate is string => typeof candidate === 'string',
    singleResponseHeaderEntry(key),
    responseHeaderArrayEntries(key),
  )(value)

const responseHeaders = (headers: IncomingHttpHeaders): Headers =>
  new Headers(
    Object.entries(headers).flatMap(([key, value]) => responseHeaderValueEntries(key, value)),
  )

const bufferFromChunk = (chunk: unknown): Buffer =>
  ifElse(
    Buffer.isBuffer,
    candidate => candidate,
    candidate => Buffer.from(String(candidate)),
  )(chunk)

const collectResponseBody = (response: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    response.on('data', chunk => {
      chunks.push(bufferFromChunk(chunk))
    })

    response.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    response.on('error', reject)
  })

const createAbortError = (): DOMException => new DOMException('aborted', 'AbortError')

const isAbortSignal = (
  signal: AbortSignal | null | undefined,
): signal is AbortSignal => isNil(signal) === false

const removeAbortListener =
  (listener: () => void) =>
  (signal: AbortSignal): void => {
    signal.removeEventListener('abort', listener)
  }

const detachAbortListener = (
  signal: AbortSignal | null | undefined,
  listener: () => void,
): void =>
  ifElse(
    isAbortSignal,
    removeAbortListener(listener),
    () => undefined,
  )(signal)

const addAbortListener =
  (listener: () => void) =>
  (signal: AbortSignal): void => {
    signal.addEventListener('abort', listener, { once: true })
  }

const handleAbortSignal =
  (listener: () => void) =>
  (signal: AbortSignal): void =>
    ifElse(
      (candidate: AbortSignal) => candidate.aborted,
      () => listener(),
      addAbortListener(listener),
    )(signal)

const attachAbortListener = (
  signal: AbortSignal | null | undefined,
  request: ClientRequest,
): (() => void) => {
  const abortRequest = (): void => {
    request.destroy(createAbortError())
  }

  ifElse(
    isAbortSignal,
    handleAbortSignal(abortRequest),
    () => undefined,
  )(signal)

  return () => {
    detachAbortListener(signal, abortRequest)
  }
}

const requestSignal = (init: RequestInit): AbortSignal | undefined =>
  ifElse(
    isAbortSignal,
    signal => signal,
    () => undefined,
  )(init.signal)

const nodeRequestOptions = (init: RequestInit): RequestOptions => ({
  method: 'GET',
  headers: {
    Accept: 'application/json',
  },
  signal: requestSignal(init),
})

const responseStatusCode = (response: IncomingMessage): number =>
  ifElse(
    (candidate: number | undefined): candidate is number => typeof candidate === 'number',
    statusCode => statusCode,
    () => 500,
  )(response.statusCode)

const responseFromIncomingMessage = (response: IncomingMessage): Promise<Response> =>
  collectResponseBody(response).then(body =>
    new Response(new Uint8Array(body), {
      status: responseStatusCode(response),
      statusText: response.statusMessage,
      headers: responseHeaders(response.headers),
    }),
  )

const nodeEiaFetch: EiaFetch = (input, init) =>
  new Promise((resolve, reject) => {
    const url = new URL(input.toString())
    const request = requestForUrl(url)(url, nodeRequestOptions(init), response => {
      responseFromIncomingMessage(response).then(resolve).catch(reject)
    })
    const detachAbort = attachAbortListener(init.signal, request)

    request.on('error', error => {
      detachAbort()
      reject(error)
    })

    request.on('close', detachAbort)
    request.end()
  })

export const defaultEiaAdapterDependencies = (): EiaAdapterDependencies => ({
  fetch: nodeEiaFetch,
  delay: defaultDelay,
  logger: none(),
  correlationId: none(),
})

const emitInfo = (deps: EiaAdapterDependencies, event: EiaAdapterLogEvent): void =>
  matchMaybe<EiaAdapterLogger, void>({
    Some: logger => {
      logger.info(event)
    },
    None: () => undefined,
  })(deps.logger)

const emitWarn = (deps: EiaAdapterDependencies, event: EiaAdapterLogEvent): void =>
  matchMaybe<EiaAdapterLogger, void>({
    Some: logger => {
      logger.warn(event)
    },
    None: () => undefined,
  })(deps.logger)

const messageFromUnknown = (value: unknown): string =>
  ifElse(
    (candidate: unknown): candidate is Error => candidate instanceof Error,
    candidate => candidate.message,
    candidate => String(candidate),
  )(value)

const isDomAbortError = (value: unknown): value is DOMException =>
  value instanceof DOMException

const isError = (value: unknown): value is Error =>
  value instanceof Error

const isNamedAbortError = (value: unknown): boolean =>
  ifElse(
    isError,
    candidate => candidate.name === 'AbortError',
    () => false,
  )(value)

const isAbortError = (value: unknown): boolean =>
  ifElse(
    isDomAbortError,
    candidate => candidate.name === 'AbortError',
    isNamedAbortError,
  )(value)

const safeContext = (
  request: EiaRequest,
  url: URL,
  correlationId: Maybe<string>,
): Pick<Extract<UpstreamError, { readonly kind: 'UpstreamTimeout' }>, 'endpoint' | 'sanitizedUrl' | 'correlationId'> => ({
  endpoint: request.endpoint,
  sanitizedUrl: sanitizeEiaUrl(url),
  correlationId,
})

const timeoutError = (
  request: EiaRequest,
  url: URL,
  config: EiaRuntimeConfig,
  correlationId: Maybe<string>,
): UpstreamError => ({
  kind: 'UpstreamTimeout',
  message: `EIA request timed out after ${String(config.timeoutMs)}ms.`,
  ...safeContext(request, url, correlationId),
  timeoutMs: config.timeoutMs,
  retriable: true,
})

const networkError = (
  request: EiaRequest,
  url: URL,
  correlationId: Maybe<string>,
  reason: unknown,
): UpstreamError => ({
  kind: 'UpstreamNetworkFailure',
  message: `EIA network request failed: ${messageFromUnknown(reason)}`,
  ...safeContext(request, url, correlationId),
  retriable: true,
})

const malformedResponseError = (
  request: EiaRequest,
  url: URL,
  correlationId: Maybe<string>,
  reason: string,
): UpstreamError => ({
  kind: 'UpstreamMalformedResponse',
  message: reason,
  ...safeContext(request, url, correlationId),
  retriable: false,
})

type HttpStatusCategory = Extract<UpstreamError, { readonly kind: 'UpstreamHttpStatus' }>['category']

const statusCategory = (status: number): HttpStatusCategory =>
  cond<[number], HttpStatusCategory>([
    [candidate => candidate === 400, () => 'BadRequest'],
    [candidate => candidate === 401, () => 'Unauthorized'],
    [candidate => candidate === 403, () => 'Forbidden'],
    [candidate => candidate === 404, () => 'NotFound'],
    [candidate => candidate === 429, () => 'RateLimited'],
    [candidate => candidate >= 500, () => 'ServerError'],
    [() => true, () => 'UnexpectedStatus'],
  ])(status)

const isRetriableStatus = (status: number): boolean =>
  ifElse(
    (candidate: number) => candidate === 429,
    () => true,
    candidate => candidate >= 500,
  )(status)

const statusError = (
  request: EiaRequest,
  url: URL,
  status: number,
  correlationId: Maybe<string>,
): UpstreamError => ({
  kind: 'UpstreamHttpStatus',
  message: `EIA request failed with HTTP status ${String(status)}.`,
  ...safeContext(request, url, correlationId),
  status,
  category: statusCategory(status),
  retriable: isRetriableStatus(status),
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  allPass([
    (candidate: unknown) => typeof candidate === 'object',
    (candidate: unknown) => isNil(candidate) === false,
    (candidate: unknown) => Array.isArray(candidate) === false,
  ])(value)

const maybeString = (value: unknown): Maybe<string> =>
  ifElse(
    (candidate: unknown): candidate is string => typeof candidate === 'string',
    candidate => some(candidate),
    () => none(),
  )(value)

const maybeUnit = (row: Record<string, unknown>): Maybe<string> =>
  matchMaybe<string, Maybe<string>>({
    Some: candidate => some(candidate),
    None: () => maybeString(row.units),
  })(maybeString(row.unit))

const maybeNumberPeriodCandidate = (value: unknown): Maybe<PeriodCandidate> =>
  ifElse(
    (candidate: unknown): candidate is number => typeof candidate === 'number',
    candidate => some(candidate),
    () => none(),
  )(value)

const maybePeriodCandidate = (value: unknown): Maybe<PeriodCandidate> =>
  ifElse(
    (candidate: unknown): candidate is string => typeof candidate === 'string',
    candidate => some(candidate),
    maybeNumberPeriodCandidate,
  )(value)

const maybeNullValueCandidate = (value: unknown): Maybe<ValueCandidate> =>
  ifElse(
    isNil,
    () => some(null),
    () => none(),
  )(value)

const maybeNumberValueCandidate = (value: unknown): Maybe<ValueCandidate> =>
  ifElse(
    (candidate: unknown): candidate is number => typeof candidate === 'number',
    candidate => some(candidate),
    maybeNullValueCandidate,
  )(value)

const maybeValueCandidate = (value: unknown): Maybe<ValueCandidate> =>
  ifElse(
    (candidate: unknown): candidate is string => typeof candidate === 'string',
    candidate => some(candidate),
    maybeNumberValueCandidate,
  )(value)

const maybeUnknown = (value: unknown): Maybe<unknown> =>
  ifElse(
    isNil,
    () => none(),
    candidate => some(candidate),
  )(value)

const isSecretEchoKey = (key: string): boolean =>
  ['api_key', 'apiKey', 'apikey', 'key'].includes(key)

const sanitizeEchoValue = (key: string, value: unknown): unknown =>
  ifElse(
    isSecretEchoKey,
    () => '[REDACTED]',
    () => sanitizeEcho(value),
  )(key)

const sanitizeEchoRecord = (record: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, sanitizeEchoValue(key, value)]),
  )

const sanitizeEchoArray = (values: readonly unknown[]): readonly unknown[] =>
  values.map(sanitizeEcho)

const sanitizeEchoRecordCandidate = (value: unknown): unknown =>
  ifElse(
    isRecord,
    sanitizeEchoRecord,
    candidate => candidate,
  )(value)

const sanitizeEcho = (value: unknown): unknown =>
  ifElse(
    Array.isArray,
    sanitizeEchoArray,
    sanitizeEchoRecordCandidate,
  )(value)

const normalizeRow = (row: Record<string, unknown>): RawEiaRow => ({
  period: maybePeriodCandidate(row.period),
  date: maybeString(row.date),
  value: maybeValueCandidate(row.value),
  unit: maybeUnit(row),
  series_id: maybeString(row.series_id),
  series: maybeString(row.series),
  product: maybeString(row.product),
  geography: maybeString(row.geography),
  frequency: maybeString(row.frequency),
  description: maybeString(row.description),
  notes: maybeString(row.notes),
})

const readResponseDataFromRecord = (body: Record<string, unknown>): unknown =>
  ifElse(
    isRecord,
    response => response.data,
    () => body.data,
  )(body.response)

const responseDataIsRowArray = (data: unknown): data is readonly Record<string, unknown>[] =>
  both(
    Array.isArray,
    (candidate: unknown) =>
      ifElse(
        Array.isArray,
        values => values.every(isRecord),
        () => false,
      )(candidate),
  )(data)

const normalizeEnvelopeFromRecord = (
  body: Record<string, unknown>,
  request: EiaRequest,
  url: URL,
  correlationId: Maybe<string>,
): Result<RawEiaEnvelope, UpstreamError> => {
  const data = readResponseDataFromRecord(body)

  return ifElse(
    responseDataIsRowArray,
    rows => success<RawEiaEnvelope>({
      api: maybeString(body.api),
      request: maybeUnknown(sanitizeEcho(body.request)),
      response: maybeUnknown(body.response),
      data: some(rows.map(normalizeRow)),
      endpoint: some(request.endpoint),
      received_at: none(),
    }),
    () => failure(malformedResponseError(request, url, correlationId, 'EIA response body must include an array data payload.')),
  )(data)
}

const normalizeEnvelope = (
  body: unknown,
  request: EiaRequest,
  url: URL,
  correlationId: Maybe<string>,
): Result<RawEiaEnvelope, UpstreamError> =>
  ifElse(
    isRecord,
    candidate => normalizeEnvelopeFromRecord(candidate, request, url, correlationId),
    () => failure(malformedResponseError(request, url, correlationId, 'EIA response body must be a JSON object.')),
  )(body)

const fetchWithTimeout = (
  deps: EiaAdapterDependencies,
  url: URL,
  config: EiaRuntimeConfig,
): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, config.timeoutMs)

  return deps.fetch(url, {
    signal: controller.signal,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  }).finally(() => {
    clearTimeout(timeout)
  })
}

const parseResponse = (
  response: Response,
  request: EiaRequest,
  url: URL,
  correlationId: Maybe<string>,
): Promise<Result<RawEiaEnvelope, UpstreamError>> =>
  response
    .json()
    .then(body => normalizeEnvelope(body, request, url, correlationId))
    .catch(() => failure(malformedResponseError(request, url, correlationId, 'EIA response body was not valid JSON.')))

const shouldRetry = (error: UpstreamError, attempt: number, maxAttempts: number): boolean =>
  allPass([
    () => attempt < maxAttempts,
    (candidate: UpstreamError) => 'retriable' in candidate,
    (candidate: UpstreamError) =>
      ifElse(
        (value: UpstreamError): value is Extract<UpstreamError, { readonly retriable: boolean }> => 'retriable' in value,
        value => value.retriable === true,
        () => false,
      )(candidate),
  ])(error)

const logEvent = (
  kind: EiaAdapterLogEvent['kind'],
  request: EiaRequest,
  url: URL,
  attempt: number,
  correlationId: Maybe<string>,
  status: Maybe<number> = none(),
  errorKind: Maybe<UpstreamError['kind']> = none(),
): EiaAdapterLogEvent => ({
  kind,
  endpoint: request.endpoint,
  sanitizedUrl: sanitizeEiaUrl(url),
  attempt,
  correlationId,
  status,
  errorKind,
})

const parseSuccessfulResponse = (
  response: Response,
  request: EiaRequest,
  url: URL,
  correlationId: Maybe<string>,
): Promise<Result<RawEiaEnvelope, UpstreamError>> =>
  ifElse(
    (candidate: Response) => candidate.ok === false,
    candidate => Promise.resolve(failure(statusError(request, url, candidate.status, correlationId))),
    candidate => parseResponse(candidate, request, url, correlationId),
  )(response)

const executeOnce = (
  config: EiaRuntimeConfig,
  deps: EiaAdapterDependencies,
  request: EiaRequest,
  url: URL,
): Promise<Result<RawEiaEnvelope, UpstreamError>> =>
  fetchWithTimeout(deps, url, config)
    .then(response => parseSuccessfulResponse(response, request, url, deps.correlationId))
    .catch(error =>
      failure(
        ifElse(
          isAbortError,
          () => timeoutError(request, url, config, deps.correlationId),
          reason => networkError(request, url, deps.correlationId, reason),
        )(error),
      ),
    )

const isExhaustedRetriableFailure = (
  error: UpstreamError,
  attempt: number,
  maxAttempts: number,
): boolean =>
  allPass([
    () => attempt >= maxAttempts,
    (candidate: UpstreamError) => 'retriable' in candidate,
    (candidate: UpstreamError) =>
      ifElse(
        (value: UpstreamError): value is Extract<UpstreamError, { readonly retriable: boolean }> => 'retriable' in value,
        value => value.retriable === true,
        () => false,
      )(candidate),
  ])(error)

const scheduleRetry = (
  config: EiaRuntimeConfig,
  deps: EiaAdapterDependencies,
  request: EiaRequest,
  url: URL,
  attempt: number,
  error: UpstreamError,
): Promise<Result<RawEiaEnvelope, UpstreamError>> => {
  emitWarn(deps, logEvent('RetryScheduled', request, url, attempt, deps.correlationId, none(), some(error.kind)))

  return deps.delay(config.retry.delayMs).then(() => executeWithRetry(config, deps, request, url, attempt + 1))
}

const logRetryExhausted = (
  config: EiaRuntimeConfig,
  deps: EiaAdapterDependencies,
  request: EiaRequest,
  url: URL,
  attempt: number,
  error: UpstreamError,
): void =>
  ifElse(
    (value: UpstreamError) => isExhaustedRetriableFailure(value, attempt, config.retry.maxAttempts),
    value => emitRetryExhausted(deps, request, url, attempt, value),
    () => undefined,
  )(error)

const finishFailedAttempt = (
  config: EiaRuntimeConfig,
  deps: EiaAdapterDependencies,
  request: EiaRequest,
  url: URL,
  attempt: number,
  error: UpstreamError,
): Promise<Result<RawEiaEnvelope, UpstreamError>> => {
  logRetryExhausted(config, deps, request, url, attempt, error)

  return Promise.resolve(failure(error))
}

const emitRetryExhausted = (
  deps: EiaAdapterDependencies,
  request: EiaRequest,
  url: URL,
  attempt: number,
  error: UpstreamError,
): void => {
  emitWarn(deps, logEvent('RetryExhausted', request, url, attempt, deps.correlationId, none(), some(error.kind)))
}

const handleFailedAttempt = (
  config: EiaRuntimeConfig,
  deps: EiaAdapterDependencies,
  request: EiaRequest,
  url: URL,
  attempt: number,
  error: UpstreamError,
): Promise<Result<RawEiaEnvelope, UpstreamError>> => {
  emitWarn(deps, logEvent('RequestFailed', request, url, attempt, deps.correlationId, none(), some(error.kind)))

  return ifElse(
    (candidate: UpstreamError) => shouldRetry(candidate, attempt, config.retry.maxAttempts),
    candidate => scheduleRetry(config, deps, request, url, attempt, candidate),
    candidate => finishFailedAttempt(config, deps, request, url, attempt, candidate),
  )(error)
}

const finishSuccessfulAttempt = (
  deps: EiaAdapterDependencies,
  request: EiaRequest,
  url: URL,
  attempt: number,
  result: Result<RawEiaEnvelope, UpstreamError>,
): Promise<Result<RawEiaEnvelope, UpstreamError>> => {
  emitInfo(deps, logEvent('RequestSucceeded', request, url, attempt, deps.correlationId))

  return Promise.resolve(result)
}

const executeWithRetry = (
  config: EiaRuntimeConfig,
  deps: EiaAdapterDependencies,
  request: EiaRequest,
  url: URL,
  attempt: number,
): Promise<Result<RawEiaEnvelope, UpstreamError>> => {
  emitInfo(deps, logEvent('RequestStarted', request, url, attempt, deps.correlationId))

  return executeOnce(config, deps, request, url).then(result =>
    ifElse(
      (candidate: Result<RawEiaEnvelope, UpstreamError>) => candidate.ok === true,
      candidate => finishSuccessfulAttempt(deps, request, url, attempt, candidate),
      candidate => handleFailedAttempt(config, deps, request, url, attempt, candidate.error),
    )(result),
  )
}

export const createRealEiaClient = (
  config: EiaRuntimeConfig,
  dependencies: EiaAdapterDependencies = defaultEiaAdapterDependencies(),
): EiaClient => ({
  loadRows: (request: EiaRequest) => {
    const url = buildEiaRequestUrl(config, request)

    return executeWithRetry(config, dependencies, request, url, 1)
  },
})
