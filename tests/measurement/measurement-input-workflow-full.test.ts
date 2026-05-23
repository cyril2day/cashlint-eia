import { describe, expect, it } from 'vitest'

import processTrustedBoundaryMeasurements from '@/contexts/measurement/workflows/measurement-input-workflow'
import type { BoundaryDto, InventoryBoundaryDto, PriceBoundaryDto, RefineryBoundaryDto, SupplyBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { fullFirstReleaseRequiredMeasurementPolicy } from '@/contexts/measurement/model'
import { ifElse } from '@/shared/fp'
import { some } from '@/shared/maybe'
import type { Result } from '@/shared/result'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected success')
    },
  )(result)

const inventory = (): InventoryBoundaryDto => ({
  kind: 'Inventory',
  periodCandidate: some('2026-01-09'),
  seriesId: some('WCRSTUS1'),
  valueCandidate: some('836125'),
  unitCandidate: some('MBBL'),
  source: { endpoint: '/v2/petroleum/stoc/wstk/data/' },
})

const price = (): PriceBoundaryDto => ({
  kind: 'Price',
  periodCandidate: some('2026-01-09'),
  seriesId: some('EPCWTIR'),
  measureKindCandidate: some('WTISpotPrice'),
  valueCandidate: some('76.31'),
  unitCandidate: some('USD/bbl'),
  source: { endpoint: '/v2/petroleum/pri/spt/data/' },
})

const refinery = (): RefineryBoundaryDto => ({
  kind: 'Refinery',
  periodCandidate: some('2026-01-09'),
  seriesId: some('WCRRIUS2'),
  measureKindCandidate: some('RefineryNetInput'),
  valueCandidate: some('16000'),
  unitCandidate: some('MBBL/D'),
  geographyCandidate: some('USTotal'),
  source: { endpoint: '/v2/petroleum/pnp/wiup/data/' },
})

const supply = (
  measureKindCandidate: 'DomesticProduction' | 'Imports' | 'Exports',
  valueCandidate: string,
): SupplyBoundaryDto => ({
  kind: 'Supply',
  periodCandidate: some('2026-01-09'),
  seriesId: some(`supply-${measureKindCandidate}`),
  measureKindCandidate: some(measureKindCandidate),
  valueCandidate: some(valueCandidate),
  unitCandidate: some('MBBL/D'),
  geographyCandidate: some('USTotal'),
  source: { endpoint: '/v2/petroleum/sum/sndw/data/' },
})

const fullInput = (): readonly BoundaryDto[] => [
  inventory(),
  refinery(),
  supply('DomesticProduction', '13000'),
  supply('Imports', '7000'),
  supply('Exports', '4000'),
  price(),
]

describe('processTrustedBoundaryMeasurements full first-release policy', () => {
  it('builds full WeeklyPetroleumFacts from trusted boundary input', () => {
    const result = processTrustedBoundaryMeasurements(
      { inputs: fullInput() },
      fullFirstReleaseRequiredMeasurementPolicy,
    )

    expect(result.ok).toBe(true)
    expect(unwrapSuccess(result)[0].refinery.kind).toBe('Some')
    expect(unwrapSuccess(result)[0].supply.kind).toBe('Some')
  })

  it('fails when full policy refinery input is missing', () => {
    const result = processTrustedBoundaryMeasurements(
      { inputs: [inventory(), supply('DomesticProduction', '13000'), supply('Imports', '7000'), supply('Exports', '4000'), price()] },
      fullFirstReleaseRequiredMeasurementPolicy,
    )

    expect(result).toMatchObject({ ok: false, error: { kind: 'RefinerySetError' } })
  })

  it('fails when supply uses an incompatible stock unit', () => {
    const invalidSupply: SupplyBoundaryDto = {
      ...supply('DomesticProduction', '13000'),
      unitCandidate: some('MBBL'),
    }

    const result = processTrustedBoundaryMeasurements(
      { inputs: [inventory(), refinery(), invalidSupply, supply('Imports', '7000'), supply('Exports', '4000'), price()] },
      fullFirstReleaseRequiredMeasurementPolicy,
    )

    expect(result).toMatchObject({ ok: false, error: { kind: 'BuilderError' } })
  })
})
