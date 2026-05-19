import { describe, expect, it } from 'vitest'

import { parseSourceIdentity, isSourceIdentity, formatSourceIdentity } from '@/contexts/measurement/model'
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

describe('SourceIdentity domain value', () => {
  it('parses a non-empty source id', () => {
    const id = 'EIA_SERIES_12345'
    const s = unwrapSuccess(parseSourceIdentity(id))

    expect(isSourceIdentity(s)).toBe(true)
    expect(formatSourceIdentity(s)).toBe(id)
  })

  it('rejects empty string', () => {
    expect(parseSourceIdentity('')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidSourceIdentityInput',
        input: '',
      },
    })
  })

  it('preserves identity when revalidating constructed source id', () => {
    const initial = unwrapSuccess(parseSourceIdentity('EIA_SERIES_ABC'))
    const repeated = parseSourceIdentity(initial)

    expect(repeated.ok).toBe(true)
    const repeatedVal = unwrapSuccess(repeated)

    expect(repeatedVal).toBe(initial)
    expect(formatSourceIdentity(repeatedVal)).toBe('EIA_SERIES_ABC')
  })
})
