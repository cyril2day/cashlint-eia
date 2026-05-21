import type { UpstreamError } from '@/application/ports/eia-client'
import type { BoundaryError } from '@/contexts/acl/eia-ingestion-acl'

export type ApplicationError =
  | Readonly<{ readonly kind: 'UpstreamFailure'; readonly error: UpstreamError }>
  | Readonly<{ readonly kind: 'BoundaryFailure'; readonly error: readonly BoundaryError[] }>
  | Readonly<{ readonly kind: 'MeasurementFailure'; readonly error: unknown }>

export const toUpstreamAppError = (e: UpstreamError): ApplicationError => ({ kind: 'UpstreamFailure', error: e })
export const toBoundaryAppError = (e: BoundaryError): ApplicationError => ({ kind: 'BoundaryFailure', error: [e] })
export const toBoundaryArrayAppError = (errs: readonly BoundaryError[]): ApplicationError => ({ kind: 'BoundaryFailure', error: errs })
export const toMeasurementAppError = (e: unknown): ApplicationError => ({ kind: 'MeasurementFailure', error: e })