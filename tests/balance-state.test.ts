import { describe, expect, it } from 'vitest'

import { parseBalanceState, isBalanceState, formatBalanceState } from '@/contexts/measurement/model'
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

describe('BalanceState domain value', () => {
  it('parses supported states', () => {
    const tightening = unwrapSuccess(parseBalanceState('Tightening'))
    expect(isBalanceState(tightening)).toBe(true)
    expect(formatBalanceState(tightening)).toBe('Tightening')

    const loosening = unwrapSuccess(parseBalanceState('Loosening'))
    expect(isBalanceState(loosening)).toBe(true)
    expect(formatBalanceState(loosening)).toBe('Loosening')

    const balanced = unwrapSuccess(parseBalanceState('Balanced'))
    expect(isBalanceState(balanced)).toBe(true)
    expect(formatBalanceState(balanced)).toBe('Balanced')

    const mixed = unwrapSuccess(parseBalanceState('Mixed'))
    expect(isBalanceState(mixed)).toBe(true)
    expect(formatBalanceState(mixed)).toBe('Mixed')

    const unknown = unwrapSuccess(parseBalanceState('Unknown'))
    expect(isBalanceState(unknown)).toBe(true)
    expect(formatBalanceState(unknown)).toBe('Unknown')
  })

  it('rejects unsupported states', () => {
    expect(parseBalanceState('Chaotic')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidBalanceStateInput',
        input: 'Chaotic',
      },
    })
  })

  it('preserves identity when revalidating constructed state', () => {
    const initial = unwrapSuccess(parseBalanceState('Balanced'))
    const repeated = parseBalanceState(initial)

    expect(repeated.ok).toBe(true)
    const repeatedValue = unwrapSuccess(repeated)

    expect(repeatedValue).toBe(initial)
    expect(formatBalanceState(repeatedValue)).toBe('Balanced')
  })
})
