import { describe, expect, it } from 'vitest'

import {
  formatGeographyScope,
  isGeographyScope,
  parseGeographyScope,
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

describe('GeographyScope', () => {
  it('parses U.S. total geography scopes', () => {
    const scope = unwrapSuccess(parseGeographyScope('USTotal'))

    expect(isGeographyScope(scope)).toBe(true)
    expect(formatGeographyScope(scope)).toBe('USTotal')
  })

  it('parses PAD district geography scopes from district codes', () => {
    const scope = unwrapSuccess(parseGeographyScope('PADI'))

    expect(isGeographyScope(scope)).toBe(true)
    expect(formatGeographyScope(scope)).toBe('PADDistrict(PADI)')
  })

  it('parses Cushing geography scopes', () => {
    const scope = unwrapSuccess(parseGeographyScope('Cushing'))

    expect(isGeographyScope(scope)).toBe(true)
    expect(formatGeographyScope(scope)).toBe('Cushing')
  })

  it('rejects invalid geography scopes', () => {
    expect(parseGeographyScope('Atlantis')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidGeographyScopeInput',
        input: 'Atlantis',
      },
    })
  })

  it('preserves geography scope identity when revalidating an existing scope', () => {
    const initial = unwrapSuccess(parseGeographyScope('PADDistrict(PADI)'))

    const repeated = parseGeographyScope(initial)

    expect(repeated.ok).toBe(true)

    const repeatedScope = unwrapSuccess(repeated)

    expect(repeatedScope).toBe(initial)
    expect(formatGeographyScope(repeatedScope)).toBe('PADDistrict(PADI)')
  })

  it('distinguishes constructed geography scopes from plain objects', () => {
    const candidate = {
      kind: 'USTotal',
    }

    expect(isGeographyScope(candidate)).toBe(false)
  })
})