import { describe, expect, it } from 'vitest'

import {
  formatPADDistrictCode,
  isPADDistrictCode,
  parsePADDistrictCode,
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

describe('PADDistrictCode', () => {
  it('parses supported PAD district codes', () => {
    const code = unwrapSuccess(parsePADDistrictCode('PADI'))

    expect(isPADDistrictCode(code)).toBe(true)
    expect(formatPADDistrictCode(code)).toBe('PADI')
  })

  it('rejects unsupported PAD district codes', () => {
    expect(parsePADDistrictCode('PADVI')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidPADDistrictCodeInput',
        input: 'PADVI',
      },
    })
  })

  it('preserves identity when revalidating an existing code', () => {
    const initial = unwrapSuccess(parsePADDistrictCode('PADII'))

    const repeated = parsePADDistrictCode(initial)

    expect(repeated.ok).toBe(true)

    const repeatedCode = unwrapSuccess(repeated)

    expect(repeatedCode).toBe(initial)
    expect(formatPADDistrictCode(repeatedCode)).toBe('PADII')
  })

  it('distinguishes constructed PAD district codes from plain objects', () => {
    const candidate = {
      code: 'PADI',
    }

    expect(isPADDistrictCode(candidate)).toBe(false)
  })
})