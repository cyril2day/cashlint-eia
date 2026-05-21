import type { AsyncResult } from '@/shared/async-result'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import type { Maybe } from '@/shared/maybe'

export type EiaRequest = Readonly<{ readonly endpoint: string; readonly params: Maybe<Record<string, string>> }>

export type UpstreamError = Readonly<{ readonly kind: 'UpstreamError'; readonly message: string }>

export type EiaClient = Readonly<{
  readonly loadRows: (request: EiaRequest) => AsyncResult<RawEiaEnvelope, UpstreamError>
}>
