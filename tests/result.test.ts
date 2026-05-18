import { describe, expect, it } from 'vitest'

import { failure, isFailure, isSuccess, success } from '@/shared/result'

describe('Result', () => {
  it('represents success values', () => {
    const result = success(42)

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.value).toBe(42)
    }
  })

  it('represents failure values', () => {
    const result = failure('missing data')

    expect(result.ok).toBe(false)

    if (result.ok === false) {
      expect(result.error).toBe('missing data')
    }
  })

  it('supports array errors', () => {
    const result = failure(['first problem', 'second problem'])

    expect(result.ok).toBe(false)

    if (result.ok === false) {
      expect(result.error).toEqual(['first problem', 'second problem'])
    }
  })

  it('preserves the supplied success value', () => {
    const value = { label: 'live data' }

    const result = success(value)

    expect(result).toEqual({
      ok: true,
      value,
    })
  })

  it('preserves the supplied failure value', () => {
    const error = ['one', 'two']

    const result = failure(error)

    expect(result).toEqual({
      ok: false,
      error,
    })
  })

  it('identifies successful results', () => {
    const result = success(42)

    expect(isSuccess(result)).toBe(true)
    expect(isFailure(result)).toBe(false)

    if (isSuccess(result)) {
      expect(result.value).toBe(42)
    }
  })

  it('identifies failed results', () => {
    const result = failure('missing data')

    expect(isSuccess(result)).toBe(false)
    expect(isFailure(result)).toBe(true)

    if (isFailure(result)) {
      expect(result.error).toBe('missing data')
    }
  })
})