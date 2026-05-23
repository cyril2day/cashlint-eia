import type { TrustedBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { bindResultStep, mapError, mapResult, sequenceResults, success } from '@/shared/result'
import { ifElse, pipeWith } from '@/shared/fp'
import type { Result } from '@/shared/result'
import { normalizeWeeklyFacts, type NormalizedWeeklyInput } from '@/contexts/measurement/normalizers/normalizeWeeklyFacts'
import { buildInventoryMeasurements, buildPriceMeasurement, buildRefineryMeasurements, buildSupplyMeasurements, type MeasurementBuilderError } from './build-measurements'
import { assembleWeeklyPetroleumFactsWithPolicy, type WeeklyPetroleumFactsError, type WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import type { InventoryMeasurement } from '@/contexts/measurement/model/inventory-measurement'
import type { PriceMeasurement } from '@/contexts/measurement/model/price-measurement'
import type { RefineryMeasurement } from '@/contexts/measurement/model/refinery-measurement'
import type { SupplyMeasurement } from '@/contexts/measurement/model/supply-measurement'
import { validateWeeklyFacts, type WeeklyFactsValidationError } from './validate-weekly-facts'
import { assembleRefinerySet, type RefinerySet, type RefinerySetError } from '@/contexts/measurement/model/refinery-set'
import { assembleSupplySet, type SupplySet, type SupplySetError } from '@/contexts/measurement/model/supply-set'
import { type Maybe, none, some } from '@/shared/maybe'
import type { RequiredMeasurementPolicy } from '@/contexts/measurement/model/required-measurement-policy'
import { walkingSkeletonRequiredMeasurementPolicy } from '@/contexts/measurement/model/required-measurement-policy'

export type MeasurementInputWorkflowError =
  | Readonly<{ readonly kind: 'NormalizeError'; readonly input: unknown }>
  | Readonly<{ readonly kind: 'BuilderError'; readonly input: string }>
  | Readonly<{ readonly kind: 'RefinerySetError'; readonly input: string }>
  | Readonly<{ readonly kind: 'SupplySetError'; readonly input: string }>
  | WeeklyPetroleumFactsError
  | WeeklyFactsValidationError

const mapBuilderError = (e: MeasurementBuilderError): MeasurementInputWorkflowError => ({ kind: 'BuilderError', input: String(e) })

type NormalizedEntry = NormalizedWeeklyInput[number]
type StageWithInventories = { entry: NormalizedEntry; inventories: readonly InventoryMeasurement[] }
type StageWithPrice = StageWithInventories & { price: PriceMeasurement }
type StageWithRefineryMeasurements = StageWithPrice & { refineryMeasurements: readonly RefineryMeasurement[] }
type StageWithSupplyMeasurements = StageWithRefineryMeasurements & { supplyMeasurements: readonly SupplyMeasurement[] }
type StageWithRefinery = StageWithSupplyMeasurements & { refinery: Maybe<RefinerySet> }
type StageWithSupply = StageWithRefinery & { supply: Maybe<SupplySet> }

const mapBuilderResult = <T>(r: Result<T, MeasurementBuilderError>): Result<T, MeasurementInputWorkflowError> =>
  mapError(r, mapBuilderError)

const identityError = <T, E>(r: Result<T, E>): Result<T, E | MeasurementInputWorkflowError> => mapError(r, e => e)

const mapRefinerySetError = (e: RefinerySetError): MeasurementInputWorkflowError => ({ kind: 'RefinerySetError', input: String(e) })

const mapSupplySetError = (e: SupplySetError): MeasurementInputWorkflowError => ({ kind: 'SupplySetError', input: String(e) })

const mapSetToMaybe = <SetValue, SetError>(
  setResult: Result<SetValue, SetError>,
  mapSetError: (error: SetError) => MeasurementInputWorkflowError,
): Result<Maybe<SetValue>, MeasurementInputWorkflowError> =>
  mapResult(mapError(setResult, mapSetError), some)

const assembleRefinerySetResult = (items: readonly RefineryMeasurement[]): Result<Maybe<RefinerySet>, MeasurementInputWorkflowError> =>
  mapSetToMaybe(assembleRefinerySet(items), mapRefinerySetError)

const assembleEmptyAwareRefinerySet = (
  policy: RequiredMeasurementPolicy,
  items: readonly RefineryMeasurement[],
): Result<Maybe<RefinerySet>, MeasurementInputWorkflowError> =>
  ifElse(
    () => policy.requireRefinery === false,
    () => success<Maybe<RefinerySet>>(none()),
    () => assembleRefinerySetResult(items),
  )()

const assembleRefineryForPolicy = (
  policy: RequiredMeasurementPolicy,
  measurements: readonly RefineryMeasurement[],
): Result<Maybe<RefinerySet>, MeasurementInputWorkflowError> =>
  ifElse(
    (items: readonly RefineryMeasurement[]) => items.length === 0,
    (items: readonly RefineryMeasurement[]) => assembleEmptyAwareRefinerySet(policy, items),
    assembleRefinerySetResult,
  )(measurements)

const assembleSupplySetResult = (items: readonly SupplyMeasurement[]): Result<Maybe<SupplySet>, MeasurementInputWorkflowError> =>
  mapSetToMaybe(assembleSupplySet(items), mapSupplySetError)

const assembleEmptyAwareSupplySet = (
  policy: RequiredMeasurementPolicy,
  items: readonly SupplyMeasurement[],
): Result<Maybe<SupplySet>, MeasurementInputWorkflowError> =>
  ifElse(
    () => policy.requireSupply === false,
    () => success<Maybe<SupplySet>>(none()),
    () => assembleSupplySetResult(items),
  )()

const assembleSupplyForPolicy = (
  policy: RequiredMeasurementPolicy,
  measurements: readonly SupplyMeasurement[],
): Result<Maybe<SupplySet>, MeasurementInputWorkflowError> =>
  ifElse(
    (items: readonly SupplyMeasurement[]) => items.length === 0,
    (items: readonly SupplyMeasurement[]) => assembleEmptyAwareSupplySet(policy, items),
    assembleSupplySetResult,
  )(measurements)

const withInventories = (entry: NormalizedEntry): Result<StageWithInventories, MeasurementInputWorkflowError> =>
  mapResult(
    mapBuilderResult(buildInventoryMeasurements(entry.reportWeek, entry.inventories)),
    inventories => ({ entry, inventories }),
  )

const withPrice = (stage: StageWithInventories): Result<StageWithPrice, MeasurementInputWorkflowError> =>
  mapResult(
    mapBuilderResult(buildPriceMeasurement(stage.entry.reportWeek, stage.entry.prices)),
    price => ({ ...stage, price }),
  )

const withRefineryMeasurements = (stage: StageWithPrice): Result<StageWithRefineryMeasurements, MeasurementInputWorkflowError> =>
  mapResult(
    mapBuilderResult(buildRefineryMeasurements(stage.entry.reportWeek, stage.entry.refinery)),
    refineryMeasurements => ({ ...stage, refineryMeasurements }),
  )

const withSupplyMeasurements = (stage: StageWithRefineryMeasurements): Result<StageWithSupplyMeasurements, MeasurementInputWorkflowError> =>
  mapResult(
    mapBuilderResult(buildSupplyMeasurements(stage.entry.reportWeek, stage.entry.supply)),
    supplyMeasurements => ({ ...stage, supplyMeasurements }),
  )

const withRefineryForPolicy =
  (policy: RequiredMeasurementPolicy) =>
  (stage: StageWithSupplyMeasurements): Result<StageWithRefinery, MeasurementInputWorkflowError> =>
    mapResult(
      assembleRefineryForPolicy(policy, stage.refineryMeasurements),
      refinery => ({ ...stage, refinery }),
    )

const withSupplyForPolicy =
  (policy: RequiredMeasurementPolicy) =>
  (stage: StageWithRefinery): Result<StageWithSupply, MeasurementInputWorkflowError> =>
    mapResult(
      assembleSupplyForPolicy(policy, stage.supplyMeasurements),
      supply => ({ ...stage, supply }),
    )

const assembleFactsForPolicy =
  (policy: RequiredMeasurementPolicy) =>
  (stage: StageWithSupply): Result<WeeklyPetroleumFacts, MeasurementInputWorkflowError> =>
    identityError(
      assembleWeeklyPetroleumFactsWithPolicy({
        policy,
        inventories: stage.inventories,
        refinery: stage.refinery,
        supply: stage.supply,
        prices: [stage.price],
      }),
    )

const processNormalizedEntry = (
  policy: RequiredMeasurementPolicy,
  entry: NormalizedEntry,
): Result<WeeklyPetroleumFacts, MeasurementInputWorkflowError> => {
  const pipeline = pipeWith(
    bindResultStep,
    [
      withInventories,
      withPrice,
      withRefineryMeasurements,
      withSupplyMeasurements,
      withRefineryForPolicy(policy),
      withSupplyForPolicy(policy),
      assembleFactsForPolicy(policy),
    ],
  )

  return pipeline(entry)
}

const normalizeTrustedBoundaryInput = (
  input: TrustedBoundaryInput,
): Result<NormalizedWeeklyInput, MeasurementInputWorkflowError> =>
  mapError(normalizeWeeklyFacts(input), error => ({ kind: 'NormalizeError', input: error }))

const buildWeeklyFactsForPolicy =
  (policy: RequiredMeasurementPolicy) =>
  (normalized: NormalizedWeeklyInput): Result<readonly WeeklyPetroleumFacts[], MeasurementInputWorkflowError> =>
    identityError(sequenceResults(normalized.map(entry => processNormalizedEntry(policy, entry))))

const validateWeeklyFactsForPolicy =
  (policy: RequiredMeasurementPolicy) =>
  (facts: readonly WeeklyPetroleumFacts[]): Result<readonly WeeklyPetroleumFacts[], MeasurementInputWorkflowError> =>
    identityError(sequenceResults(facts.map(weeklyFacts => validateWeeklyFacts(weeklyFacts, policy))))

export const processTrustedBoundaryMeasurements = (
  input: TrustedBoundaryInput,
  policy: RequiredMeasurementPolicy = walkingSkeletonRequiredMeasurementPolicy,
): Result<readonly WeeklyPetroleumFacts[], MeasurementInputWorkflowError> =>
  pipeWith(
    bindResultStep,
    [
      normalizeTrustedBoundaryInput,
      buildWeeklyFactsForPolicy(policy),
      validateWeeklyFactsForPolicy(policy),
    ],
  )(input)

export default processTrustedBoundaryMeasurements
