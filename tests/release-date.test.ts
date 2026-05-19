import { describe, expect, it } from 'vitest'

import { isReportWeek, parseReportWeek } from '@/contexts/measurement/model'
import {
  compareReleaseDates,
  formatReleaseDateIso,
  isReleaseDate,
  parseReleaseDate,
} from '@/contexts/measurement/model'
import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected a successful result')
    },
  )(result)

describe('ReleaseDate', () => {
  it('parses valid date-like inputs into release dates', () => {
    const input = '2026-05-19T15:20:00.000Z'

    const result = parseReleaseDate(input)

    expect(result.ok).toBe(true)

    const releaseDate = unwrapSuccess(result)

    expect(releaseDate.date).toEqual(new Date(input))
    expect(isReleaseDate(releaseDate)).toBe(true)
    expect(formatReleaseDateIso(releaseDate)).toBe('2026-05-19')
  })

  it('rejects invalid release date inputs', () => {
    expect(parseReleaseDate('not-a-release-date')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidReleaseDateInput',
        input: 'not-a-release-date',
      },
    })
  })

  it('orders release dates by their dates', () => {
    const earlier = unwrapSuccess(parseReleaseDate('2026-05-12T00:00:00.000Z'))
    const later = unwrapSuccess(parseReleaseDate('2026-05-19T00:00:00.000Z'))

    expect(compareReleaseDates(earlier, later)).toBeLessThan(0)
    expect(compareReleaseDates(later, earlier)).toBeGreaterThan(0)
    expect(compareReleaseDates(later, later)).toBe(0)
  })

  it('keeps release dates distinct from report weeks', () => {
    const releaseDate = unwrapSuccess(parseReleaseDate('2026-05-19T15:20:00.000Z'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))

    expect(isReportWeek(releaseDate)).toBe(false)
    expect(isReleaseDate(reportWeek)).toBe(false)
  })
})