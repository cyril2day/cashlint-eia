import { failure } from '@/shared/result'
import type { Result } from '@/shared/result'

export type MeasurementInputWorkflowError = { readonly kind: 'NotImplemented' }

export const processTrustedBoundaryMeasurements = (_input: unknown): Result<unknown, MeasurementInputWorkflowError> =>
  failure({ kind: 'NotImplemented' })

export default processTrustedBoundaryMeasurements
