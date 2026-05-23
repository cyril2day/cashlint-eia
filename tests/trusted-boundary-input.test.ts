import { describe, it, expect } from 'vitest'
import { some, none } from '@/shared/maybe'
import { fromRawInventoryRow, fromRawPriceRow, fromRawRefineryRow, fromRawSupplyRow } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { validateBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/gates/trusted-boundary-input'
import { isSuccess, isFailure } from '@/shared/result'

describe('validateBoundaryInput gate', () => {
  it('accepts valid inventory and price boundary dtos', () => {
    const inv = fromRawInventoryRow({
      period: some('2023W01'),
      date: none(),
      value: some('100'),
      unit: some('bbl'),
      series_id: some('INV1'),
      series: none(),
      product: none(),
      geography: none(),
      frequency: none(),
      description: none(),
      notes: none(),
    })

    const price = fromRawPriceRow({
      period: some('2023W01'),
      date: none(),
      value: some('70'),
      unit: some('USD/bbl'),
      series_id: some('PR1'),
      series: none(),
      product: none(),
      geography: none(),
      frequency: none(),
      description: none(),
      notes: none(),
    })

    const res = validateBoundaryInput([inv, price])
    expect(isSuccess(res)).toBe(true)
    const resJson = JSON.parse(JSON.stringify(res))
    expect(resJson.value.inputs.length).toBe(2)
  })

  it('fails when required fields are missing', () => {
    const badInv = fromRawInventoryRow({
      period: some('2023W01'),
      date: none(),
      value: none(),
      unit: some('bbl'),
      series_id: none(),
      series: none(),
      product: none(),
      geography: none(),
      frequency: none(),
      description: none(),
      notes: none(),
    })

    const res = validateBoundaryInput([badInv])
    expect(isFailure(res)).toBe(true)
    const resJson = JSON.parse(JSON.stringify(res))
    expect(resJson.error.length).toBeGreaterThanOrEqual(1)
  })

  it('accepts valid refinery and supply boundary dtos', () => {
    const refinery = fromRawRefineryRow({
      period: some('2023W01'),
      date: none(),
      value: some('16000'),
      unit: some('MBBL/D'),
      series_id: some('WCRRIUS2'),
      series: none(),
      product: none(),
      geography: some('USTotal'),
      frequency: none(),
      description: none(),
      notes: none(),
    }, some('RefineryNetInput'))

    const supply = fromRawSupplyRow({
      period: some('2023W01'),
      date: none(),
      value: some('13000'),
      unit: some('MBBL/D'),
      series_id: some('WCRFPUS2'),
      series: none(),
      product: none(),
      geography: some('USTotal'),
      frequency: none(),
      description: none(),
      notes: none(),
    }, some('DomesticProduction'))

    const res = validateBoundaryInput([refinery, supply])

    expect(isSuccess(res)).toBe(true)
  })
})
