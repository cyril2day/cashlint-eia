import { unwrap } from '@/shared/maybe'
import type { TrustedBoundaryInput, BoundaryDto, InventoryBoundaryDto, PriceBoundaryDto, RefineryBoundaryDto, SupplyBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { bindResult, failure, success, sequenceResults, mapResult, mapError } from '@/shared/result'
import type { Result } from '@/shared/result'
import { mapPeriodCandidateToReportWeek } from '@/contexts/measurement/normalizers/period'
import { makeIncompleteWeeklyInputError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'
import { formatReportWeekIso, type ReportWeek } from '@/contexts/measurement/model/report-week'
import { cond, ifElse } from '@/shared/fp'

export type NormalizedWeeklyInput = ReadonlyArray<{
  readonly reportWeek: ReportWeek
  readonly inventories: readonly InventoryBoundaryDto[]
  readonly refinery: readonly RefineryBoundaryDto[]
  readonly supply: readonly SupplyBoundaryDto[]
  readonly prices: readonly PriceBoundaryDto[]
}>

type NormalizeWeeklyFactsError = ReturnType<typeof makeIncompleteWeeklyInputError>
type WeeklyEntry = Readonly<{ readonly week: ReportWeek; readonly dto: BoundaryDto }>
type WeeklyBucket = Readonly<{
  readonly reportWeek: ReportWeek
  readonly inventories: readonly BoundaryDto[]
  readonly refinery: readonly BoundaryDto[]
  readonly supply: readonly BoundaryDto[]
  readonly prices: readonly BoundaryDto[]
}>

const isInventoryDto = (dto: BoundaryDto): dto is InventoryBoundaryDto => dto.kind === 'Inventory'
const isRefineryDto = (dto: BoundaryDto): dto is RefineryBoundaryDto => dto.kind === 'Refinery'
const isSupplyDto = (dto: BoundaryDto): dto is SupplyBoundaryDto => dto.kind === 'Supply'
const isPriceDto = (dto: BoundaryDto): dto is PriceBoundaryDto => dto.kind === 'Price'

const makeIncompleteErrorForDto = (dto: BoundaryDto): NormalizeWeeklyFactsError =>
  makeIncompleteWeeklyInputError({ endpoint: dto.source.endpoint, seriesId: unwrap(dto.seriesId) })

const createEmptyWeeklyBucket = (reportWeek: ReportWeek): WeeklyBucket => ({
  reportWeek,
  inventories: [],
  refinery: [],
  supply: [],
  prices: [],
})

const readOrCreateWeeklyBucket = (reportWeek: ReportWeek) => (bucket: WeeklyBucket | undefined): WeeklyBucket =>
  ifElse(
    (candidate: WeeklyBucket | undefined) => candidate === undefined,
    () => createEmptyWeeklyBucket(reportWeek),
    (candidate: WeeklyBucket) => candidate,
  )(bucket)

const appendInventory = (dto: BoundaryDto) => (bucket: WeeklyBucket): WeeklyBucket => ({
  ...bucket,
  inventories: [...bucket.inventories, dto],
})

const appendRefinery = (dto: BoundaryDto) => (bucket: WeeklyBucket): WeeklyBucket => ({
  ...bucket,
  refinery: [...bucket.refinery, dto],
})

const appendSupply = (dto: BoundaryDto) => (bucket: WeeklyBucket): WeeklyBucket => ({
  ...bucket,
  supply: [...bucket.supply, dto],
})

const appendPrice = (dto: BoundaryDto) => (bucket: WeeklyBucket): WeeklyBucket => ({
  ...bucket,
  prices: [...bucket.prices, dto],
})

const updateBucketWithDto = (dto: BoundaryDto) => (bucket: WeeklyBucket): WeeklyBucket =>
  cond<[BoundaryDto], WeeklyBucket>([
    [isInventoryDto, candidate => appendInventory(candidate)(bucket)],
    [isRefineryDto, candidate => appendRefinery(candidate)(bucket)],
    [isSupplyDto, candidate => appendSupply(candidate)(bucket)],
    [isPriceDto, candidate => appendPrice(candidate)(bucket)],
  ])(dto)

const mapDtoToWeek = (dto: BoundaryDto): Result<WeeklyEntry, NormalizeWeeklyFactsError> => {
  const period = unwrap(dto.periodCandidate)

  return ifElse(
    (candidate: unknown) => candidate === undefined,
    () => failure(makeIncompleteErrorForDto(dto)),
    (candidate: unknown) =>
      mapError(
        mapResult(mapPeriodCandidateToReportWeek(String(candidate)), week => ({ week, dto })),
        () => makeIncompleteErrorForDto(dto),
      ),
  )(period)
}

const groupEntriesByWeek = (entries: readonly WeeklyEntry[]): Record<string, WeeklyBucket> =>
  entries.reduce<Record<string, WeeklyBucket>>((groups, entry) => {
    const weekKey = formatReportWeekIso(entry.week)
    const bucket = readOrCreateWeeklyBucket(entry.week)(groups[weekKey])
    const updatedBucket = updateBucketWithDto(entry.dto)(bucket)
    return { ...groups, [weekKey]: updatedBucket }
  }, {})

const toNormalizedWeeklyInput = (groups: Record<string, WeeklyBucket>): NormalizedWeeklyInput =>
  Object.values(groups).map(group => ({
    reportWeek: group.reportWeek,
    inventories: group.inventories.filter(isInventoryDto),
    refinery: group.refinery.filter(isRefineryDto),
    supply: group.supply.filter(isSupplyDto),
    prices: group.prices.filter(isPriceDto),
  }))

export const normalizeWeeklyFacts = (
  input: TrustedBoundaryInput,
): Result<NormalizedWeeklyInput, NormalizeWeeklyFactsError> =>
  bindResult(sequenceResults(input.inputs.map(mapDtoToWeek)), entries =>
    success(toNormalizedWeeklyInput(groupEntriesByWeek(entries))),
  )

export default normalizeWeeklyFacts
