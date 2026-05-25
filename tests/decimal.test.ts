import { describe, expect, it } from 'vitest'

import {
  formatDecimal,
  formatDecimalCoordinate,
  formatFixedMoneyDecimal,
  formatPercentageDecimal,
  formatWholeDecimal,
  parseDecimal,
} from '@/shared/decimal'

describe('decimal', () => {
  it('parses finite numeric inputs', () => {
    expect(parseDecimal(12.5)).toEqual({
      ok: true,
      value: 12.5,
    })

    expect(parseDecimal('12.5')).toEqual({
      ok: true,
      value: 12.5,
    })

    expect(parseDecimal(' 12.5 ')).toEqual({
      ok: true,
      value: 12.5,
    })
  })

  it('rejects non-finite numeric inputs', () => {
    expect(parseDecimal(Number.POSITIVE_INFINITY)).toEqual({
      ok: false,
      error: {
        kind: 'InvalidDecimalInput',
        input: 'Infinity',
      },
    })

    expect(parseDecimal(Number.NaN)).toEqual({
      ok: false,
      error: {
        kind: 'InvalidDecimalInput',
        input: 'NaN',
      },
    })
  })

  it('rejects non-numeric string inputs', () => {
    expect(parseDecimal('abc')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidDecimalInput',
        input: 'abc',
      },
    })

    expect(parseDecimal('   ')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidDecimalInput',
        input: '   ',
      },
    })
  })

  it('formats decimal values for presentation and svg coordinates', () => {
    expect(formatWholeDecimal(1234.56)).toBe('1,235')
    expect(formatDecimal(1234.567)).toBe('1,234.57')
    expect(formatFixedMoneyDecimal(72)).toBe('72.00')
    expect(formatPercentageDecimal(12.345)).toBe('12.3')
    expect(formatDecimalCoordinate(12.34567)).toBe('12.346')
  })
})
