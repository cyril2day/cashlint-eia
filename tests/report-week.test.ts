import { describe, expect, it } from 'vitest'

import {
  compareReportWeeks,
  formatReportWeekIso,
  isReportWeek,
  parseReportWeek,
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

describe('ReportWeek', () => {
  it('parses valid date-like inputs into report weeks', () => {
    const input = '2026-05-19T00:00:00.000Z'

    const result = parseReportWeek(input)

    expect(result.ok).toBe(true)

    const reportWeek = unwrapSuccess(result)

    expect(reportWeek.date).toEqual(new Date(input))
    expect(reportWeek.frequency).toBe('weekly')
    expect(isReportWeek(reportWeek)).toBe(true)
    expect(formatReportWeekIso(reportWeek)).toBe('2026-05-19')
  })

  it('preserves report week identity when revalidating an existing report week', () => {
    const initial = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))

    const repeated = parseReportWeek(initial)

    expect(repeated.ok).toBe(true)

    const repeatedReportWeek = unwrapSuccess(repeated)

    expect(repeatedReportWeek).toBe(initial)
    expect(compareReportWeeks(initial, repeatedReportWeek)).toBe(0)
  })

  it('rejects invalid report week inputs', () => {
    expect(parseReportWeek('not-a-report-week')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidReportWeekInput',
        input: 'not-a-report-week',
      },
    })
  })

  it('distinguishes constructed report weeks from plain objects', () => {
    const candidate = {
      date: new Date('2026-05-19T00:00:00.000Z'),
      frequency: 'weekly',
    }

    expect(isReportWeek(candidate)).toBe(false)
  })

  it('orders report weeks by their dates', () => {
    const earlier = unwrapSuccess(parseReportWeek('2026-05-12T00:00:00.000Z'))
    const later = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))

    expect(compareReportWeeks(earlier, later)).toBeLessThan(0)
    expect(compareReportWeeks(later, earlier)).toBeGreaterThan(0)
    expect(compareReportWeeks(later, later)).toBe(0)
  })
})