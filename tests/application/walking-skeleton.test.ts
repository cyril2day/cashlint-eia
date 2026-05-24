import { describe, it, expect } from 'vitest'
import { success } from '@/shared/result'
import { some, none } from '@/shared/maybe'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import { allPass, cond, ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'
import type { EiaRequest, UpstreamError } from '@/application/ports/eia-client'
import { buildWalkingSkeleton } from '@/application/workflows/walking-skeleton'
import type { EiaClient } from '@/application/ports/eia-client'
import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'

type TestRequest = Pick<EiaRequest, 'endpoint' | 'params'>

describe('walking-skeleton application workflow', () => {
  it('loads envelopes via EiaClient, translates, and returns WeeklyPetroleumFacts', async () => {
    const inventoryEnvelope: RawEiaEnvelope = {
      api: none(),
      request: none(),
      response: none(),
      data: some([
        { period: some('2022-01-01'), date: none(), value: some('10'), unit: some('MBBL'), series_id: some('WCRSTUS1'), series: none(), product: none(), geography: none(), frequency: some('weekly'), description: none(), notes: none() },
      ]),
      endpoint: some('/v2/petroleum/stoc/wstk/data/'),
      received_at: none(),
    }

    const priceEnvelope: RawEiaEnvelope = {
      api: none(),
      request: none(),
      response: none(),
      data: some([
        { period: some('2022-01-01'), date: none(), value: some('80.5'), unit: some('USD/bbl'), series_id: some('RWTC'), series: none(), product: none(), geography: none(), frequency: some('weekly'), description: none(), notes: none() },
      ]),
      endpoint: some('/v2/petroleum/pri/spt/data/'),
      received_at: none(),
    }

    const refineryEnvelope = (seriesId: string, value: string, unit = 'MBBL/D'): RawEiaEnvelope => ({
      api: none(),
      request: none(),
      response: none(),
      data: some([
        { period: some('2022-01-01'), date: none(), value: some(value), unit: some(unit), series_id: none(), series: some(seriesId), product: none(), geography: some('U.S.'), frequency: some('weekly'), description: none(), notes: none() },
      ]),
      endpoint: some('/v2/petroleum/pnp/wiup/data/'),
      received_at: none(),
    })

    const supplyEnvelope = (seriesId: string, value: string): RawEiaEnvelope => ({
      api: none(),
      request: none(),
      response: none(),
      data: some([
        { period: some('2022-01-01'), date: none(), value: some(value), unit: some('MBBL/D'), series_id: none(), series: some(seriesId), product: none(), geography: some('U.S.'), frequency: some('weekly'), description: none(), notes: none() },
      ]),
      endpoint: some('/v2/petroleum/sum/sndw/data/'),
      received_at: none(),
    })

    const paramsAreSome = (
      params: EiaRequest['params'],
    ): params is Extract<EiaRequest['params'], { readonly kind: 'Some' }> => params.kind === 'Some'

    const seriesIdFrom = (r: TestRequest): string =>
      ifElse(
        paramsAreSome,
        params => params.value['facets[series][]'],
        () => '',
      )(r.params)

    const endpointIncludes = (text: string) => (r: TestRequest): boolean =>
      String(r.endpoint).includes(text)

    const seriesIs = (seriesId: string) => (r: TestRequest): boolean =>
      seriesIdFrom(r) === seriesId

    const defaultEnvelope: RawEiaEnvelope = { api: none(), request: none(), response: none(), data: some([]), endpoint: none(), received_at: none() }

    const choose: (r: TestRequest) => Result<RawEiaEnvelope, UpstreamError> = cond([
      [endpointIncludes('stoc'), () => success(inventoryEnvelope)],
      [endpointIncludes('pri'), () => success(priceEnvelope)],
      [allPass([endpointIncludes('pnp'), seriesIs('WCRRIUS2')]), () => success(refineryEnvelope('WCRRIUS2', '16'))],
      [allPass([endpointIncludes('pnp'), seriesIs('WGIRIUS2')]), () => success(refineryEnvelope('WGIRIUS2', '17'))],
      [allPass([endpointIncludes('pnp'), seriesIs('WOCLEUS2')]), () => success(refineryEnvelope('WOCLEUS2', '18'))],
      [allPass([endpointIncludes('pnp'), seriesIs('WPULEUS3')]), () => success(refineryEnvelope('WPULEUS3', '90', '%'))],
      [allPass([endpointIncludes('sum'), seriesIs('WCRFPUS2')]), () => success(supplyEnvelope('WCRFPUS2', '13'))],
      [allPass([endpointIncludes('sum'), seriesIs('WCRIMUS2')]), () => success(supplyEnvelope('WCRIMUS2', '7'))],
      [allPass([endpointIncludes('sum'), seriesIs('WCREXUS2')]), () => success(supplyEnvelope('WCREXUS2', '4'))],
      [() => true, () => success(defaultEnvelope)],
    ])

    const fakeEiaClient: EiaClient = {
      loadRows: (req) => Promise.resolve(choose(req)),
    }

    const runner = buildWalkingSkeleton({ eiaClient: fakeEiaClient })

    const cmd: WalkingSkeletonCommand = { reportWeekIso: '2022-01-01' }

    const result = await runner(cmd)

    // Expect success Result
    expect(Reflect.get(result, 'ok')).toBe(true)
  })
})
