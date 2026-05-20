import { unwrap } from '@/shared/maybe'
import type { TrustedBoundaryInput, BoundaryDto, InventoryBoundaryDto, PriceBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { bindResult, failure, success, sequenceResults, mapResult, mapError } from '@/shared/result'
import type { Result } from '@/shared/result'
import { mapPeriodCandidateToReportWeek } from '@/contexts/measurement/normalizers/period'
import { makeIncompleteWeeklyInputError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'
import { formatReportWeekIso, type ReportWeek } from '@/contexts/measurement/model/report-week'
import { ifElse } from '@/shared/fp'

export type NormalizedWeeklyInput = ReadonlyArray<{
  readonly reportWeek: ReportWeek
  readonly inventories: readonly InventoryBoundaryDto[]
  readonly prices: readonly PriceBoundaryDto[]
}>

const mapDtoToWeek = (d: BoundaryDto): Result<{ week: ReportWeek; dto: BoundaryDto }, ReturnType<typeof makeIncompleteWeeklyInputError>> => {
  const period = unwrap(d.periodCandidate)

  return ifElse(
    (candidate: unknown) => candidate === undefined,
    () => failure(makeIncompleteWeeklyInputError({ endpoint: d.source.endpoint, seriesId: unwrap(d.seriesId) })),
    (candidate: unknown) =>
      mapError(
        mapResult(mapPeriodCandidateToReportWeek(String(candidate)), week => ({ week, dto: d })),
        () => makeIncompleteWeeklyInputError({ endpoint: d.source.endpoint, seriesId: unwrap(d.seriesId) }),
      ),
  )(period)
}

export const normalizeWeeklyFacts = (
  input: TrustedBoundaryInput,
): Result<NormalizedWeeklyInput, ReturnType<typeof makeIncompleteWeeklyInputError>> =>
  bindResult(sequenceResults(input.inputs.map(mapDtoToWeek)), entries => {
    const groups = entries.reduce<Record<string, { reportWeek: ReportWeek; inventories: BoundaryDto[]; prices: BoundaryDto[] }>>((acc, e) => {
      const key = formatReportWeekIso(e.week)

      const prev = acc[key]

      const makeEmptyGroup = (w: ReportWeek) => {
        const inventories: BoundaryDto[] = []
        const prices: BoundaryDto[] = []
        return { reportWeek: w, inventories, prices }
      }

      const base = ifElse((candidate: unknown) => candidate === undefined, () => makeEmptyGroup(e.week), () => prev)(prev)

      const updated = {
        reportWeek: base.reportWeek,
        inventories: ifElse(
          (_: BoundaryDto) => _.kind === 'Inventory',
          (_: BoundaryDto) => [...base.inventories, _],
          (_: BoundaryDto) => base.inventories,
        )(e.dto),
        prices: ifElse(
          (_: BoundaryDto) => _.kind === 'Price',
          (_: BoundaryDto) => [...base.prices, _],
          (_: BoundaryDto) => base.prices,
        )(e.dto),
      }

      return { ...acc, [key]: updated }
    }, {})

    const result: NormalizedWeeklyInput = Object.values(groups).map(g => ({
      reportWeek: g.reportWeek,
      inventories: g.inventories.filter((x): x is InventoryBoundaryDto => x.kind === 'Inventory'),
      prices: g.prices.filter((x): x is PriceBoundaryDto => x.kind === 'Price'),
    }))

    return success(result)
  })

export default normalizeWeeklyFacts
