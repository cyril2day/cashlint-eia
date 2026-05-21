import type { TrustedBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { mapError } from '@/shared/result'
import type { Result } from '@/shared/result'
import { normalizeWeeklyFacts, type NormalizedWeeklyInput } from '@/contexts/measurement/normalizers/normalizeWeeklyFacts'

export type MeasurementInputWorkflowError = Readonly<{ readonly kind: 'NormalizeError'; readonly input: unknown }>

export const processTrustedBoundaryMeasurements = (
  input: TrustedBoundaryInput,
): Result<NormalizedWeeklyInput, MeasurementInputWorkflowError> => mapError(normalizeWeeklyFacts(input), e => ({ kind: 'NormalizeError', input: e }))

export default processTrustedBoundaryMeasurements