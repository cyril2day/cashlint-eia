import { describe, expect, it } from 'vitest'

import { buildLiveAppViewModel, buildLiveSummaryViewModel } from '@/application/workflows/build-live-summary-view-model'
import { createFakeEiaClient } from '@/application/ports/fake-eia-client'
import { createLiveWeeklyDependencies } from '@/application/dependencies/live-weekly-dependencies'
import { mapSummaryWithChartsToHomePageViewModel } from '@/presentation/mappers'
import { cond } from '@/shared/fp'
import { ifElse } from '@/shared/fp'
import { isFailure, isSuccess, type Result, success } from '@/shared/result'
import type { EiaRequest, EiaRequestParamValue, UpstreamError } from '@/application/ports/eia-client'
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

const seriesRowsFor = (
  seriesId: string,
  valuesBySeries: Readonly<Record<string, SeriesValues>>,
): readonly RawEiaRow[] => {
  const values = ifElse(
    (candidate: SeriesValues | undefined): candidate is SeriesValues => candidate !== undefined,
    candidate => candidate,
    () => defaultSeriesValues,
  )(valuesBySeries[seriesId])

  return fixturePeriods.map((period, index) =>
    rowFor(seriesId, period, stringOrEmpty(valuesForHistory(values)[index]), values.unit),
  )
}

const envelopeForSeriesIds = (
  endpoint: string,
  seriesIds: readonly string[],
  valuesBySeries: Readonly<Record<string, SeriesValues>>,
): RawEiaEnvelope => ({
  api: none(),
  request: none(),
  response: none(),
  data: some(seriesIds.flatMap(seriesId => seriesRowsFor(seriesId, valuesBySeries))),
  endpoint: some(endpoint),
  received_at: none(),
})

const paramsAreSome = (
  params: EiaRequest['params'],
): params is Extract<EiaRequest['params'], { readonly kind: 'Some' }> => params.kind === 'Some'

const seriesParamValueToIds = (value: EiaRequestParamValue): readonly string[] =>
  ifElse(
    Array.isArray,
    candidate => candidate,
    candidate => [candidate],
  )(value)

const paramsToSeriesIds = (
  params: Extract<EiaRequest['params'], { readonly kind: 'Some' }>,
): readonly string[] => seriesParamValueToIds(params.value['facets[series][]'])

const requestSeriesIds = (request: EiaRequest): readonly string[] =>
  ifElse(
    paramsAreSome,
    paramsToSeriesIds,
    () => [],
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
    [candidate => candidate.endpoint.includes('pnp'), candidate => envelopeForSeriesIds(candidate.endpoint, requestSeriesIds(candidate), refinerySeriesValues)],
    [candidate => candidate.endpoint.includes('sum'), candidate => envelopeForSeriesIds(candidate.endpoint, requestSeriesIds(candidate), supplySeriesValues)],
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
    expect(summary.reportWeekText).toBe('January 9, 2026')
    expect(summary.geographyText).toBe('United States')
    expect(summary.displayState).toBe('partial')
    expect(summary.cards).toHaveLength(5)
    expect(summary.cards.find(card => card.kind === 'system')?.valueText).toBe('Tightening balance')
    expect(summary.cards.find(card => card.kind === 'availableSupply')?.valueText).toBe('16,000 Mbbl/d')
    expect(summary.cards.find(card => card.kind === 'refineryDemand')?.valueText).toBe('16,958 Mbbl/d')
    expect(summary.cards.find(card => card.kind === 'inventory')?.valueText).toContain('836.1')
    expect(summary.cards.find(card => card.kind === 'price')?.valueText).toContain('$76.31')
    expect(summary.cards.find(card => card.kind === 'inventory')?.subtitleText).toEqual({ kind: 'Some', value: 'U.S. commercial crude inventories' })
    expect(summary.cards.find(card => card.kind === 'price')?.subtitleText).toEqual({ kind: 'Some', value: 'West Texas Intermediate spot price' })
    expect(summary.cards.find(card => card.kind === 'inventory')?.trendLabel).toEqual({ kind: 'Some', value: 'Down 2.4 million barrels vs. last week' })
    expect(summary.cards.find(card => card.kind === 'price')?.trendLabel).toEqual({ kind: 'Some', value: 'Up $1.56 vs. last week' })
    expect(summary.headline).toContain('Tightening')
    expect(summary.caveats.map(caveat => caveat.kind)).not.toContain('missing-previous-observation')
    expect(summary.caveats.map(caveat => caveat.kind)).not.toContain('full-system-balance-not-computed')
    expect(summary.summary).not.toContain('live weekly')
    expect(JSON.stringify(summary)).not.toContain('InventoryDraw')
    expect(JSON.stringify(summary)).not.toContain('WeakerRefineryDemand')
    expect(JSON.stringify(summary)).not.toContain('IncreasedImports')
    expect(JSON.stringify(summary)).not.toContain('SimplifiedCrudeBalance')
    expect(JSON.stringify(summary)).not.toContain('RateToStockComparisonLimitation')
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
    expect(viewModel.chartsGallery.panels.find(panel => panel.chartKind === 'Sparkline')?.state).toBe('Complete')
    expect(viewModel.chartsGallery.panels.find(panel => panel.chartKind === 'Histogram')?.state).toBe('Complete')
    expect(viewModel.chartsGallery.panels.find(panel => panel.chartKind === 'AreaChart')?.state).toBe('Complete')
    expect(viewModel.chartsGallery.stateSummary.map(item => item.label)).toEqual(['Ready', 'Cautious', 'Waiting', 'Needs history'])
    expect(viewModel.homeMetricChartHistory.availableSupply.map(point => point.value)).toContain(13000)
    expect(viewModel.homeMetricChartHistory.availableSupply.map(point => point.secondaryValue)).toContain(3000)
    expect(viewModel.homeMetricChartHistory.refineryDemand.map(point => point.value)).toContain(16958)
    expect(JSON.stringify(viewModel.chartsGallery)).toContain('836125')
    expect(JSON.stringify(viewModel.chartsGallery)).toContain('76.31')
    expect(JSON.stringify(viewModel)).not.toContain('InventoryDraw')
    expect(JSON.stringify(viewModel)).not.toContain('WeakerRefineryDemand')
    expect(JSON.stringify(viewModel)).not.toContain('IncreasedImports')
    expect(JSON.stringify(viewModel)).not.toContain('SimplifiedCrudeBalance')
    expect(JSON.stringify(viewModel)).not.toContain('RateToStockComparisonLimitation')
  })

  it('maps live fact history into responsive homepage card charts', async () => {
    const fakeClient = createFakeEiaClient((request: EiaRequest) =>
      Promise.resolve(success(requestForEnvelope(request))),
    )

    const runner = buildLiveAppViewModel(
      createLiveWeeklyDependencies({ eiaClient: fakeClient }),
    )

    const result = await runner({ reportWeekIso: '2026-01-09' })
    const viewModel = unwrapSuccess(result)
    const home = mapSummaryWithChartsToHomePageViewModel(
      viewModel.summary,
      viewModel.chartsGallery,
      some(viewModel.homeMetricChartHistory),
      some('2026-01-09'),
    )

    expect(home.metrics.find(metric => metric.id === 'availableSupply')?.chart.points.map(point => point.value)).toContain(13000)
    expect(home.metrics.find(metric => metric.id === 'availableSupply')?.chart.points.map(point => point.secondaryValue)).toContainEqual(some(3000))
    expect(home.metrics.find(metric => metric.id === 'refineryDemand')?.chart.points.map(point => point.value)).toContain(16958)
  })
})
