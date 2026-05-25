import { describe, expect, it } from 'vitest'

import { buildLiveAppViewModel, buildLiveSummaryViewModel } from '@/application/workflows/build-live-summary-view-model'
import { createFakeEiaClient } from '@/application/ports/fake-eia-client'
import { createLiveWeeklyDependencies } from '@/application/dependencies/live-weekly-dependencies'
import { cond } from '@/shared/fp'
import { ifElse } from '@/shared/fp'
import { isFailure, isSuccess, type Result, success } from '@/shared/result'
import type { EiaRequest, UpstreamError } from '@/application/ports/eia-client'
import { none, some } from '@/shared/maybe'
import type { RawEiaEnvelope, RawEiaRow } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import { inventoryValidEnvelope } from '../fixtures/eia/stoc-wstk/inventory-valid'
import { priceValidEnvelope } from '../fixtures/eia/pri-spt/price-valid'

type SeriesValues = Readonly<{
  readonly current: string
  readonly previous: string
  readonly unit: string
}>

const refinerySeriesValues: Readonly<Record<string, SeriesValues>> = {
  WCRRIUS2: { current: '16958', previous: '16909', unit: 'MBBL/D' },
  WGIRIUS2: { current: '17300', previous: '17201', unit: 'MBBL/D' },
  WOCLEUS2: { current: '18162', previous: '18162', unit: 'MBBL/D' },
  WPULEUS3: { current: '92.1', previous: '91.7', unit: '%' },
}

const supplySeriesValues: Readonly<Record<string, SeriesValues>> = {
  WCRFPUS2: { current: '13000', previous: '12900', unit: 'MBBL/D' },
  WCRIMUS2: { current: '7000', previous: '7200', unit: 'MBBL/D' },
  WCREXUS2: { current: '4000', previous: '3900', unit: 'MBBL/D' },
}

const defaultSeriesValues: SeriesValues = { current: '0', previous: '0', unit: 'MBBL/D' }

const fixturePeriods: readonly string[] = [
  '2026-01-09',
  '2026-01-02',
  '2025-12-26',
  '2025-12-19',
  '2025-12-12',
]

const stringOrEmpty = (value: string | undefined): string =>
  ifElse(
    (candidate: string | undefined): candidate is string => candidate !== undefined,
    candidate => candidate,
    () => '',
  )(value)

const valuesForHistory = (values: SeriesValues): readonly string[] => [
  values.current,
  values.previous,
  values.previous,
  values.previous,
  values.previous,
]

const rowFor = (seriesId: string, period: string, value: string, unit: string): RawEiaRow => ({
  period: some(period),
  date: some(period),
  value: some(value),
  unit: some(unit),
  series_id: none(),
  series: some(seriesId),
  product: some('CrudeOil'),
  geography: some('U.S.'),
  frequency: some('weekly'),
  description: some('sanitized live fixture'),
  notes: none(),
})

const envelopeFor = (endpoint: string, seriesId: string, valuesBySeries: Readonly<Record<string, SeriesValues>>): RawEiaEnvelope => {
  const values = ifElse(
    (candidate: SeriesValues | undefined): candidate is SeriesValues => candidate !== undefined,
    candidate => candidate,
    () => defaultSeriesValues,
  )(valuesBySeries[seriesId])

  return {
    api: none(),
    request: none(),
    response: none(),
    data: some(
      fixturePeriods.map((period, index) =>
        rowFor(seriesId, period, stringOrEmpty(valuesForHistory(values)[index]), values.unit),
      ),
    ),
    endpoint: some(endpoint),
    received_at: none(),
  }
}

const paramsAreSome = (
  params: EiaRequest['params'],
): params is Extract<EiaRequest['params'], { readonly kind: 'Some' }> => params.kind === 'Some'

const requestSeriesId = (request: EiaRequest): string =>
  ifElse(
    paramsAreSome,
    candidate => stringOrEmpty(candidate.value['facets[series][]']),
    () => '',
  )(request.params)

const emptyEnvelopeFor = (endpoint: string): RawEiaEnvelope => ({
  api: none(),
  request: none(),
  response: none(),
  data: some([]),
  endpoint: some(endpoint),
  received_at: none(),
})

const requestForEnvelope = (request: EiaRequest): typeof inventoryValidEnvelope | typeof priceValidEnvelope | RawEiaEnvelope =>
  cond<[EiaRequest], typeof inventoryValidEnvelope | typeof priceValidEnvelope | RawEiaEnvelope>([
    [candidate => candidate.endpoint.includes('stoc'), () => inventoryValidEnvelope],
    [candidate => candidate.endpoint.includes('pri'), () => priceValidEnvelope],
    [candidate => candidate.endpoint.includes('pnp'), candidate => envelopeFor(candidate.endpoint, requestSeriesId(candidate), refinerySeriesValues)],
    [candidate => candidate.endpoint.includes('sum'), candidate => envelopeFor(candidate.endpoint, requestSeriesId(candidate), supplySeriesValues)],
    [() => true, candidate => emptyEnvelopeFor(candidate.endpoint)],
  ])(request)

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    isSuccess,
    candidate => candidate.value,
    () => {
      throw new Error('expected success')
    },
  )(result)

const unwrapFailure = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): FailureValue =>
  ifElse(
    isFailure,
    candidate => candidate.error,
    () => {
      throw new Error('expected failure')
    },
  )(result)

describe('live summary view model', () => {
  it('maps live EIA fixtures into a presentation summary with real values', async () => {
    const fakeClient = createFakeEiaClient((request: EiaRequest) =>
      Promise.resolve(success(requestForEnvelope(request))),
    )

    const runner = buildLiveSummaryViewModel(
      createLiveWeeklyDependencies({ eiaClient: fakeClient }),
    )

    const result = await runner({ reportWeekIso: '2026-01-09' })
    const summary = unwrapSuccess(result)

    expect(result.ok).toBe(true)
    expect(summary.reportWeekText).toBe('2026-01-09')
    expect(summary.geographyText).toBe('USTotal')
    expect(summary.displayState).toBe('partial')
    expect(summary.cards).toHaveLength(3)
    expect(summary.cards.find(card => card.kind === 'system')?.valueText).toBe('Tightening')
    expect(summary.cards.find(card => card.kind === 'inventory')?.valueText).toContain('836,125')
    expect(summary.cards.find(card => card.kind === 'price')?.valueText).toContain('76.31')
    expect(summary.cards.find(card => card.kind === 'inventory')?.subtitleText).toEqual({ kind: 'Some', value: '2026-01-09 · USTotal' })
    expect(summary.cards.find(card => card.kind === 'price')?.subtitleText).toEqual({ kind: 'Some', value: '2026-01-09 · USTotal' })
    expect(summary.cards.find(card => card.kind === 'inventory')?.trendLabel).toEqual({ kind: 'Some', value: 'Down' })
    expect(summary.cards.find(card => card.kind === 'price')?.trendLabel).toEqual({ kind: 'Some', value: 'Up' })
    expect(summary.headline).toContain('Tightening')
    expect(summary.caveats.map(caveat => caveat.kind)).not.toContain('missing-previous-observation')
    expect(summary.caveats.map(caveat => caveat.kind)).not.toContain('full-system-balance-not-computed')
    expect(summary.summary).not.toContain('live weekly')
  })

  it('returns a typed upstream failure when the underlying client fails', async () => {
    const fakeError: UpstreamError = {
      kind: 'UpstreamError',
      message: 'upstream unavailable',
    }

    const fakeClient = createFakeEiaClient(() => Promise.resolve({ ok: false, error: fakeError }))

    const runner = buildLiveSummaryViewModel(
      createLiveWeeklyDependencies({ eiaClient: fakeClient }),
    )

    const result = await runner({ reportWeekIso: '2026-01-09' })
    const error = unwrapFailure(result)

    expect(result.ok).toBe(false)
    expect(error.kind).toBe('UpstreamFailure')
    expect(JSON.stringify(result)).not.toContain('secret-test-key')
  })

  it('maps live EIA fixtures into data-backed chart panels', async () => {
    const fakeClient = createFakeEiaClient((request: EiaRequest) =>
      Promise.resolve(success(requestForEnvelope(request))),
    )

    const runner = buildLiveAppViewModel(
      createLiveWeeklyDependencies({ eiaClient: fakeClient }),
    )

    const result = await runner({ reportWeekIso: '2026-01-09' })
    const viewModel = unwrapSuccess(result)

    expect(viewModel.chartsGallery.panels.map(panel => panel.chartKind)).toEqual([
      'TimeSeries',
      'Sparkline',
      'MetricCard',
      'BarChart',
      'Histogram',
      'BoxPlot',
      'AreaChart',
      'VarianceChart',
    ])
    expect(viewModel.chartsGallery.panels.find(panel => panel.chartKind === 'TimeSeries')?.state).toBe('Complete')
    expect(viewModel.chartsGallery.panels.find(panel => panel.chartKind === 'Sparkline')?.state).toBe('Complete')
    expect(viewModel.chartsGallery.panels.find(panel => panel.chartKind === 'BarChart')?.state).toBe('Partial')
    expect(viewModel.chartsGallery.panels.find(panel => panel.chartKind === 'VarianceChart')?.state).toBe('Complete')
    expect(viewModel.chartsGallery.stateSummary.map(item => `${item.label}:${item.valueLabel}`)).toEqual([
      'Ready:6',
      'Cautious:2',
      'Waiting:0',
      'Needs history:0',
    ])
    expect(JSON.stringify(viewModel.chartsGallery)).toContain('836125')
    expect(JSON.stringify(viewModel.chartsGallery)).toContain('76.31')
  })
})
