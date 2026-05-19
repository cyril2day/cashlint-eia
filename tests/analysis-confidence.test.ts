import { describe, expect, it } from 'vitest'

import { parseAnalysisConfidence, isAnalysisConfidence, formatAnalysisConfidence } from '@/contexts/measurement/model'
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

describe('AnalysisConfidence domain value', () => {
  it('parses supported confidences', () => {
    const high = unwrapSuccess(parseAnalysisConfidence('High'))
    expect(isAnalysisConfidence(high)).toBe(true)
    expect(formatAnalysisConfidence(high)).toBe('High')

    const medium = unwrapSuccess(parseAnalysisConfidence('Medium'))
    expect(isAnalysisConfidence(medium)).toBe(true)
    expect(formatAnalysisConfidence(medium)).toBe('Medium')

    const low = unwrapSuccess(parseAnalysisConfidence('Low'))
    expect(isAnalysisConfidence(low)).toBe(true)
    expect(formatAnalysisConfidence(low)).toBe('Low')

    const unknown = unwrapSuccess(parseAnalysisConfidence('Unknown'))
    expect(isAnalysisConfidence(unknown)).toBe(true)
    expect(formatAnalysisConfidence(unknown)).toBe('Unknown')
  })

  it('rejects unsupported confidences', () => {
    expect(parseAnalysisConfidence('Certain')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidAnalysisConfidenceInput',
        input: 'Certain',
      },
    })
  })

  it('preserves identity when revalidating constructed confidence', () => {
    const initial = unwrapSuccess(parseAnalysisConfidence('Medium'))
    const repeated = parseAnalysisConfidence(initial)

    expect(repeated.ok).toBe(true)
    const repeatedValue = unwrapSuccess(repeated)

    expect(repeatedValue).toBe(initial)
    expect(formatAnalysisConfidence(repeatedValue)).toBe('Medium')
  })
})
