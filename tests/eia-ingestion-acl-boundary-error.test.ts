import { describe, expect, it } from 'vitest'

import {
  makeBoundaryError,
  makeIncompleteWeeklyInputError,
  makeInvalidDateOrPeriodError,
  makeInvalidNumericValueError,
  makeInvalidUnitError,
  makeMissingRequiredFieldError,
  makeUnsupportedSeriesError,
  makeUpstreamRateLimitError,
  makeUpstreamUnavailableError,
} from '@/contexts/acl/eia-ingestion-acl/errors'
import { none, some } from '@/shared/maybe'

describe('EIA ingestion ACL boundary errors', () => {
  it('builds a missing required field error with safe context', () => {
    expect(
      makeMissingRequiredFieldError('value', {
        endpoint: 'inventory',
        endpointFamily: 'acl',
        seriesId: 'PET.WCESTUS1.W',
      }),
    ).toEqual({
      kind: 'MissingRequiredField',
      endpoint: some('inventory'),
      endpointFamily: some('acl'),
      seriesId: some('PET.WCESTUS1.W'),
      fieldName: some('value'),
      rawValue: none(),
      message: 'missing required field: value',
    })
  })

  it('builds representative boundary error variants', () => {
    expect(makeInvalidDateOrPeriodError('period', '2026-05-19', { endpoint: 'price' })).toEqual({
      kind: 'InvalidDateOrPeriod',
      endpoint: some('price'),
      endpointFamily: none(),
      seriesId: none(),
      fieldName: some('period'),
      rawValue: some('2026-05-19'),
      message: 'invalid date or period in field: period',
    })

    expect(makeInvalidNumericValueError('value', 'not-a-number')).toEqual({
      kind: 'InvalidNumericValue',
      endpoint: none(),
      endpointFamily: none(),
      seriesId: none(),
      fieldName: some('value'),
      rawValue: some('not-a-number'),
      message: 'invalid numeric value in field: value',
    })

    expect(makeInvalidUnitError('unit', 'barrels')).toEqual({
      kind: 'InvalidUnit',
      endpoint: none(),
      endpointFamily: none(),
      seriesId: none(),
      fieldName: some('unit'),
      rawValue: some('barrels'),
      message: 'invalid unit in field: unit',
    })

    expect(makeUnsupportedSeriesError('PET.WCESTUS1.W')).toEqual({
      kind: 'UnsupportedSeries',
      endpoint: none(),
      endpointFamily: none(),
      seriesId: none(),
      fieldName: none(),
      rawValue: some('PET.WCESTUS1.W'),
      message: 'unsupported EIA series identifier',
    })

    expect(makeIncompleteWeeklyInputError()).toEqual({
      kind: 'IncompleteWeeklyInput',
      endpoint: none(),
      endpointFamily: none(),
      seriesId: none(),
      fieldName: none(),
      rawValue: none(),
      message: 'weekly boundary input is incomplete',
    })

    expect(makeUpstreamUnavailableError({ endpoint: 'ingestion' })).toEqual({
      kind: 'UpstreamUnavailable',
      endpoint: some('ingestion'),
      endpointFamily: none(),
      seriesId: none(),
      fieldName: none(),
      rawValue: none(),
      message: 'upstream EIA service is unavailable',
    })

    expect(makeUpstreamRateLimitError({ endpoint: 'ingestion' })).toEqual({
      kind: 'UpstreamRateLimit',
      endpoint: some('ingestion'),
      endpointFamily: none(),
      seriesId: none(),
      fieldName: none(),
      rawValue: none(),
      message: 'upstream EIA service rate limit reached',
    })
  })

  it('supports explicit boundary error construction', () => {
    expect(
      makeBoundaryError('FrequencyMismatch', 'frequency does not match', {
        endpointFamily: 'walking-skeleton',
      }),
    ).toEqual({
      kind: 'FrequencyMismatch',
      endpoint: none(),
      endpointFamily: some('walking-skeleton'),
      seriesId: none(),
      fieldName: none(),
      rawValue: none(),
      message: 'frequency does not match',
    })
  })
})