import type { AsyncResult } from '@/shared/async-result'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import type { Maybe } from '@/shared/maybe'

export type EiaRequestParamValue = string | readonly string[]
export type EiaRequestParams = Record<string, EiaRequestParamValue>
export type EiaRequest = Readonly<{ readonly endpoint: string; readonly params: Maybe<EiaRequestParams> }>

export type UpstreamError =
  | Readonly<{ readonly kind: 'UpstreamError'; readonly message: string }>
  | Readonly<{
      readonly kind: 'UpstreamTimeout'
      readonly message: string
      readonly endpoint: string
      readonly sanitizedUrl: string
      readonly timeoutMs: number
      readonly retriable: true
      readonly correlationId: Maybe<string>
    }>
  | Readonly<{
      readonly kind: 'UpstreamHttpStatus'
      readonly message: string
      readonly endpoint: string
      readonly sanitizedUrl: string
      readonly status: number
      readonly category: 'BadRequest' | 'Unauthorized' | 'Forbidden' | 'NotFound' | 'RateLimited' | 'ServerError' | 'UnexpectedStatus'
      readonly retriable: boolean
      readonly correlationId: Maybe<string>
    }>
  | Readonly<{
      readonly kind: 'UpstreamNetworkFailure'
      readonly message: string
      readonly endpoint: string
      readonly sanitizedUrl: string
      readonly retriable: true
      readonly correlationId: Maybe<string>
    }>
  | Readonly<{
      readonly kind: 'UpstreamMalformedResponse'
      readonly message: string
      readonly endpoint: string
      readonly sanitizedUrl: string
      readonly retriable: false
      readonly correlationId: Maybe<string>
    }>

export type EiaClient = Readonly<{
  readonly loadRows: (request: EiaRequest) => AsyncResult<RawEiaEnvelope, UpstreamError>
}>
