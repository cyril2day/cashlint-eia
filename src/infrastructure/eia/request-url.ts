import type { EiaRequest } from '@/application/ports/eia-client'
import { ifElse } from '@/shared/fp'
import { matchMaybe } from '@/shared/maybe'
import type { EiaRuntimeConfig } from './runtime-config'

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

const appendParams = (url: URL, params: Record<string, string>): URL => {
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url
}

const setRedactedSearchParam = (url: URL, key: string): void => {
  url.searchParams.set(key, '[REDACTED]')
}

export const buildEiaRequestUrl = (config: EiaRuntimeConfig, request: EiaRequest): URL => {
  const url = new URL(removeLeadingSlash(request.endpoint), ensureTrailingSlash(config.baseUrl.toString()))

  matchMaybe<Record<string, string>, void>({
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
