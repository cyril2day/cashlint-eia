import { describe, expect, it } from 'vitest'

import { compareDates, formatDateIso, formatDateIsoDate, isDateValue, parseDate } from '@/shared/date'

describe('date', () => {
  it('parses ISO strings into Date values', () => {
    const input = '2026-05-19T12:34:56.000Z'

    expect(parseDate(input)).toEqual({
      ok: true,
      value: new Date(input),
    })
  })

  it('parses Date objects into equivalent Date values', () => {
    const input = new Date('2026-05-19T12:34:56.000Z')

    expect(parseDate(input)).toEqual({
      ok: true,
      value: input,
    })
  })

  it('rejects invalid date inputs', () => {
    expect(parseDate('not-a-date')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidDateInput',
        input: 'not-a-date',
      },
    })
  })

  it('identifies valid and invalid Date values', () => {
    expect(isDateValue(new Date('2026-05-19T12:34:56.000Z'))).toBe(true)
    expect(isDateValue(new Date('not-a-date'))).toBe(false)
  })

  it('formats dates into parseable ISO strings and compares them', () => {
    const earlier = new Date('2026-05-18T12:34:56.000Z')
    const later = new Date('2026-05-19T12:34:56.000Z')

    const formatted = formatDateIso(later)

    expect(parseDate(formatted)).toEqual({
      ok: true,
      value: later,
    })

    expect(compareDates(earlier, later)).toBeLessThan(0)
    expect(compareDates(later, earlier)).toBeGreaterThan(0)
    expect(compareDates(later, later)).toBe(0)
  })

  it('formats dates into date-only ISO strings', () => {
    const input = new Date('2026-05-19T12:34:56.000Z')

    expect(formatDateIsoDate(input)).toBe('2026-05-19')
  })
})