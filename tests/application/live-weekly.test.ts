import { describe, it, expect } from 'vitest'
import { success } from '@/shared/result'
import { some, none } from '@/shared/maybe'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import { cond, ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'
import type { EiaRequest, EiaRequestParamValue, UpstreamError } from '@/application/ports/eia-client'
import { buildLiveWeekly } from '@/application/workflows/live-weekly'
import type { EiaClient } from '@/application/ports/eia-client'
import type { LiveWeeklyCommand } from '@/application/commands/live-weekly-command'

type TestRequest = Pick<EiaRequest, 'endpoint' | 'params'>
type TestSeriesValue = Readonly<{ readonly value: string; readonly unit: string }>

const defaultTestSeriesValue: TestSeriesValue = { value: '0', unit: 'MBBL/D' }

const refineryValueBySeries: Readonly<Record<string, TestSeriesValue>> = {
  WCRRIUS2: { value: '16', unit: 'MBBL/D' },
  WGIRIUS2: { value: '17', unit: 'MBBL/D' },
  WOCLEUS2: { value: '18', unit: 'MBBL/D' },
  WPULEUS3: { value: '90', unit: '%' },
}

const supplyValueBySeries: Readonly<Record<string, TestSeriesValue>> = {
  WCRFPUS2: { value: '13', unit: 'MBBL/D' },
  WCRIMUS2: { value: '7', unit: 'MBBL/D' },
  WCREXUS2: { value: '4', unit: 'MBBL/D' },
}

const valueForSeries = (
  valuesBySeries: Readonly<Record<string, TestSeriesValue>>,
) =>
  (seriesId: string): TestSeriesValue =>
    ifElse(
      (candidate: TestSeriesValue | undefined): candidate is TestSeriesValue => candidate !== undefined,
      candidate => candidate,
      () => defaultTestSeriesValue,
    )(valuesBySeries[seriesId])

const rowForSeries = (
  valuesBySeries: Readonly<Record<string, TestSeriesValue>>,
) =>
  (seriesId: string) => {
    const seriesValue = valueForSeries(valuesBySeries)(seriesId)

    return { period: some('2022-01-01'), date: none(), value: some(seriesValue.value), unit: some(seriesValue.unit), series_id: none(), series: some(seriesId), product: none(), geography: some('U.S.'), frequency: some('weekly'), description: none(), notes: none() }
  }

const seriesParamValueToIds = (value: EiaRequestParamValue): readonly string[] =>
  ifElse(
    Array.isArray,
    candidate => candidate,
    candidate => [candidate],
  )(value)

describe('live-weekly application workflow', () => {
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

    const paramsAreSome = (
      params: EiaRequest['params'],
    ): params is Extract<EiaRequest['params'], { readonly kind: 'Some' }> => params.kind === 'Some'

    const paramsToSeriesIds = (
      params: Extract<EiaRequest['params'], { readonly kind: 'Some' }>,
    ): readonly string[] => seriesParamValueToIds(params.value['facets[series][]'])

    const seriesIdsFrom = (r: TestRequest): readonly string[] =>
      ifElse(
        paramsAreSome,
        paramsToSeriesIds,
        () => [],
      )(r.params)

    const endpointIncludes = (text: string) => (r: TestRequest): boolean =>
      String(r.endpoint).includes(text)

    const refineryEnvelopeForRequest = (r: TestRequest): RawEiaEnvelope => ({
      api: none(),
      request: none(),
      response: none(),
      data: some(seriesIdsFrom(r).map(rowForSeries(refineryValueBySeries))),
      endpoint: some('/v2/petroleum/pnp/wiup/data/'),
      received_at: none(),
    })

    const supplyEnvelopeForRequest = (r: TestRequest): RawEiaEnvelope => ({
      api: none(),
      request: none(),
      response: none(),
      data: some(seriesIdsFrom(r).map(rowForSeries(supplyValueBySeries))),
      endpoint: some('/v2/petroleum/sum/sndw/data/'),
      received_at: none(),
    })

    const defaultEnvelope: RawEiaEnvelope = { api: none(), request: none(), response: none(), data: some([]), endpoint: none(), received_at: none() }

    const choose: (r: TestRequest) => Result<RawEiaEnvelope, UpstreamError> = cond([
      [endpointIncludes('stoc'), () => success(inventoryEnvelope)],
      [endpointIncludes('pri'), () => success(priceEnvelope)],
      [endpointIncludes('pnp'), candidate => success(refineryEnvelopeForRequest(candidate))],
      [endpointIncludes('sum'), candidate => success(supplyEnvelopeForRequest(candidate))],
      [() => true, () => success(defaultEnvelope)],
    ])

    const fakeEiaClient: EiaClient = {
      loadRows: (req) => Promise.resolve(choose(req)),
    }

    const runner = buildLiveWeekly({ eiaClient: fakeEiaClient })

    const cmd: LiveWeeklyCommand = { reportWeekIso: '2022-01-01' }

    const result = await runner(cmd)

    // Expect success Result
    expect(Reflect.get(result, 'ok')).toBe(true)
  })
})
