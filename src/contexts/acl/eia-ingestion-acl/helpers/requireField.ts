import { ifElse } from '@/shared/fp'
import { failure } from '@/shared/result'
import type { FailureResult } from '@/shared/result'
import { makeMissingRequiredFieldError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'
import type { BoundaryError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'

/**
 * Require presence of a field before delegating to `next`.
 * Usage: const requireSeries = requireFieldThen('series', endpoint, validateSeriesId)
 * then call `requireSeries(seriesId)`
 */
export const requireFieldThen = <T, R>(
  fieldName: string,
  endpoint: string,
  next: (candidate: T) => R,
 ) => (candidate: T | undefined): R | FailureResult<BoundaryError> =>
  ifElse(
    (c: T | undefined): c is undefined => c === undefined,
    () => failure<BoundaryError>(makeMissingRequiredFieldError(fieldName, { endpoint })),
    (c: T) => next(c),
  )(candidate)

export default {}
