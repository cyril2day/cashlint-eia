import { describe, expect, it } from 'vitest'

import { parseDecimal } from '@/shared/decimal'

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
})