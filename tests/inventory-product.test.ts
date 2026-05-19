import { describe, expect, it } from 'vitest'

import { formatInventoryProduct, isInventoryProduct, parseInventoryProduct } from '@/contexts/measurement/model'
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

describe('InventoryProduct', () => {
  it('parses supported products', () => {
    const p = unwrapSuccess(parseInventoryProduct('CrudeOil'))

    expect(isInventoryProduct(p)).toBe(true)
    expect(formatInventoryProduct(p)).toBe('CrudeOil')
  })

  it('rejects unsupported products', () => {
    expect(parseInventoryProduct('Gasoline')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidInventoryProductInput',
        input: 'Gasoline',
      },
    })
  })

  it('preserves identity when revalidating constructed product', () => {
    const initial = unwrapSuccess(parseInventoryProduct('CrudeOil'))

    const repeated = parseInventoryProduct(initial)

    expect(repeated.ok).toBe(true)

    const repeatedProduct = unwrapSuccess(repeated)

    expect(repeatedProduct).toBe(initial)
    expect(formatInventoryProduct(repeatedProduct)).toBe('CrudeOil')
  })
})
