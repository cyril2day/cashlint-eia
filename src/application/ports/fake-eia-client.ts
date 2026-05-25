import type { Result } from '@/shared/result'
import { success, failure } from '@/shared/result'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import type { EiaClient, EiaRequest, UpstreamError } from '@/application/ports/eia-client'

// Create a simple static fake EiaClient from a chooser function.
export const createFakeEiaClient = (
  chooser: (req: EiaRequest) => Promise<Result<RawEiaEnvelope, UpstreamError>>,
): EiaClient => ({
  loadRows: (req: EiaRequest) => chooser(req),
})

// Convenience helpers
export const successClientFor = (map: (req: EiaRequest) => RawEiaEnvelope): EiaClient =>
  createFakeEiaClient((req) => Promise.resolve(success(map(req))))

export const failingClientWith = (err: UpstreamError): EiaClient =>
  createFakeEiaClient(() => Promise.resolve(failure(err)))

 