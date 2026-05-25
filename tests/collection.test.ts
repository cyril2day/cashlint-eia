import { describe, expect, it } from 'vitest'

import { firstArrayItem, isNonEmptyArray, lastArrayItem } from '@/shared/collection'

describe('collection', () => {
  it('identifies non-empty arrays', () => {
    const emptyValues: readonly number[] = []
    const filledValues: readonly number[] = [1, 2, 3]

    expect(isNonEmptyArray(emptyValues)).toBe(false)
    expect(isNonEmptyArray(filledValues)).toBe(true)
  })

  it('returns the first item from a non-empty array', () => {
    const values: readonly [string, string] = ['alpha', 'beta']

    expect(firstArrayItem(values)).toBe('alpha')
  })

  it('returns the last item from a non-empty array', () => {
    const values: readonly [string, string] = ['alpha', 'beta']

    expect(lastArrayItem(values)).toBe('beta')
  })
})
