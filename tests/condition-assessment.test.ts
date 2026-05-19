import { describe, expect, it } from 'vitest'

import { parseConditionAssessment, isConditionAssessment, formatConditionAssessment } from '@/contexts/measurement/model'
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

describe('ConditionAssessment domain value', () => {
  it('parses supported assessments', () => {
    const tightening = unwrapSuccess(parseConditionAssessment('Tightening'))
    expect(isConditionAssessment(tightening)).toBe(true)
    expect(formatConditionAssessment(tightening)).toBe('Tightening')

    const loosening = unwrapSuccess(parseConditionAssessment('Loosening'))
    expect(isConditionAssessment(loosening)).toBe(true)
    expect(formatConditionAssessment(loosening)).toBe('Loosening')

    const balanced = unwrapSuccess(parseConditionAssessment('Balanced'))
    expect(isConditionAssessment(balanced)).toBe(true)
    expect(formatConditionAssessment(balanced)).toBe('Balanced')

    const mixed = unwrapSuccess(parseConditionAssessment('Mixed'))
    expect(isConditionAssessment(mixed)).toBe(true)
    expect(formatConditionAssessment(mixed)).toBe('Mixed')

    const unknown = unwrapSuccess(parseConditionAssessment('Unknown'))
    expect(isConditionAssessment(unknown)).toBe(true)
    expect(formatConditionAssessment(unknown)).toBe('Unknown')
  })

  it('rejects unsupported assessments', () => {
    expect(parseConditionAssessment('Indeterminate')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidConditionAssessmentInput',
        input: 'Indeterminate',
      },
    })
  })

  it('preserves identity when revalidating constructed assessment', () => {
    const initial = unwrapSuccess(parseConditionAssessment('Balanced'))
    const repeated = parseConditionAssessment(initial)

    expect(repeated.ok).toBe(true)
    const repeatedValue = unwrapSuccess(repeated)

    expect(repeatedValue).toBe(initial)
    expect(formatConditionAssessment(repeatedValue)).toBe('Balanced')
  })
})
