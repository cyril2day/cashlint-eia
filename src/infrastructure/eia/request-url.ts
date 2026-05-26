import type { EiaRequest, EiaRequestParamValue, EiaRequestParams } from '@/application/ports/eia-client'
import { ifElse } from '@/shared/fp'
import { matchMaybe } from '@/shared/maybe'
import type { EiaRuntimeConfig } from '@/infrastructure/eia/runtime-config'

const ensureTrailingSlash = (value: string): string =>
  ifElse(
    (candidate: string) => candidate.endsWith('/'),
    candidate => candidate,
    candidate => `${candidate}/`,
  )(value)

const removeLeadingSlash = (value: string): string =>
  ifElse(
    (candidate: string) => candidate.startsWith('/'),
    candidate => candidate.slice(1),
    candidate => candidate,
  )(value)

const appendSingleParam = (url: URL, key: string, value: string): URL => {
  url.searchParams.append(key, value)

  return url
}

const appendMultipleParamValues = (url: URL, key: string, values: readonly string[]): URL => {
  values.forEach(item => {
    appendSingleParam(url, key, item)
  })

  return url
}

const appendParamValue = (url: URL, key: string, value: EiaRequestParamValue): URL =>
  ifElse(
    Array.isArray,
    values => appendMultipleParamValues(url, key, values),
    candidate => appendSingleParam(url, key, candidate),
  )(value)

const appendParamEntry = (url: URL) =>
  ([key, value]: readonly [string, EiaRequestParamValue]): URL => appendParamValue(url, key, value)

const appendParams = (url: URL, params: EiaRequestParams): URL => {
  Object.entries(params).forEach(appendParamEntry(url))

  return url
}

const setRedactedSearchParam = (url: URL, key: string): void => {
  url.searchParams.set(key, '[REDACTED]')
}

export const buildEiaRequestUrl = (config: EiaRuntimeConfig, request: EiaRequest): URL => {
  const url = new URL(removeLeadingSlash(request.endpoint), ensureTrailingSlash(config.baseUrl.toString()))

  matchMaybe<EiaRequestParams, void>({
    Some: params => {
      appendParams(url, params)
    },
    None: () => undefined,
  })(request.params)

  matchMaybe<string, void>({
    Some: apiKey => {
      url.searchParams.set('api_key', apiKey)
    },
    None: () => undefined,
  })(config.apiKey)

  return url
}

const sanitizeSecretKey = (url: URL, key: string): void => {
  ifElse(
    (candidate: URL) => candidate.searchParams.has(key),
    candidate => setRedactedSearchParam(candidate, key),
    () => undefined,
  )(url)
}

export const sanitizeEiaUrl = (url: URL | string): string => {
  const safeUrl = new URL(url.toString())
  const secretKeys = ['api_key', 'apiKey', 'apikey', 'key']

  secretKeys.forEach(key => {
    sanitizeSecretKey(safeUrl, key)
  })

  return safeUrl.toString()
}
