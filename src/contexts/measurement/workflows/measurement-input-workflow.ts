import type { TrustedBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { mapError, mapResult, sequenceResults, success } from '@/shared/result'
import { cond, pipeWith } from '@/shared/fp'
import { binder } from '@/contexts/acl/eia-ingestion-acl/helpers/translatorPipeline'
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

const mapBuilderResult = <T>(r: Result<T, MeasurementBuilderError>): Result<T, MeasurementInputWorkflowError> =>
  mapError(r, mapBuilderError)

const identityError = <T, E>(r: Result<T, E>): Result<T, E | MeasurementInputWorkflowError> => mapError(r, e => e)

const mapRefinerySetError = (e: RefinerySetError): MeasurementInputWorkflowError => ({ kind: 'RefinerySetError', input: String(e) })

const mapSupplySetError = (e: SupplySetError): MeasurementInputWorkflowError => ({ kind: 'SupplySetError', input: String(e) })

const assembleRefineryForPolicy = (
  policy: RequiredMeasurementPolicy,
  measurements: readonly RefineryMeasurement[],
): Result<Maybe<RefinerySet>, MeasurementInputWorkflowError> =>
  cond<[readonly RefineryMeasurement[]], Result<Maybe<RefinerySet>, MeasurementInputWorkflowError>>([
    [() => policy.requireRefinery === true, (items: readonly RefineryMeasurement[]) => mapResult(mapError(assembleRefinerySet(items), mapRefinerySetError), some)],
    [(items: readonly RefineryMeasurement[]) => items.length === 0, () => success<Maybe<RefinerySet>>(none())],
    [() => true, (items: readonly RefineryMeasurement[]) => mapResult(mapError(assembleRefinerySet(items), mapRefinerySetError), some)],
  ])(measurements)

const assembleSupplyForPolicy = (
  policy: RequiredMeasurementPolicy,
  measurements: readonly SupplyMeasurement[],
): Result<Maybe<SupplySet>, MeasurementInputWorkflowError> =>
  cond<[readonly SupplyMeasurement[]], Result<Maybe<SupplySet>, MeasurementInputWorkflowError>>([
    [() => policy.requireSupply === true, (items: readonly SupplyMeasurement[]) => mapResult(mapError(assembleSupplySet(items), mapSupplySetError), some)],
    [(items: readonly SupplyMeasurement[]) => items.length === 0, () => success<Maybe<SupplySet>>(none())],
    [() => true, (items: readonly SupplyMeasurement[]) => mapResult(mapError(assembleSupplySet(items), mapSupplySetError), some)],
  ])(measurements)

const processNormalizedEntry = (
  policy: RequiredMeasurementPolicy,
  entry: NormalizedEntry,
): Result<WeeklyPetroleumFacts, MeasurementInputWorkflowError> => {
  type Stage1 = { entry: NormalizedEntry; inventories: readonly InventoryMeasurement[] }
  type Stage2 = Stage1 & { price: PriceMeasurement }
  type Stage3 = Stage2 & { refineryMeasurements: readonly RefineryMeasurement[] }
  type Stage4 = Stage3 & { supplyMeasurements: readonly SupplyMeasurement[] }
  type Stage5 = Stage4 & { refinery: Maybe<RefinerySet> }
  type Stage6 = Stage5 & { supply: Maybe<SupplySet> }

  const pipeline = pipeWith(
    <I, F, O>(step: (value: I) => Result<O, F>, result: Result<I, F>) => binder(step, result),
    [
      (e: NormalizedEntry) =>
        mapResult(
          mapBuilderResult(buildInventoryMeasurements(e.reportWeek, e.inventories)),
          inventories => ({ entry: e, inventories })
      ),
      (s1: Stage1) =>
        mapResult(
          mapBuilderResult(buildPriceMeasurement(s1.entry.reportWeek, s1.entry.prices)),
          price => ({ ...s1, price })
      ),
      (s2: Stage2) =>
        mapResult(
          mapBuilderResult(buildRefineryMeasurements(s2.entry.reportWeek, s2.entry.refinery)),
          refineryMeasurements => ({ ...s2, refineryMeasurements }),
        ),
      (s3: Stage3) =>
        mapResult(
          mapBuilderResult(buildSupplyMeasurements(s3.entry.reportWeek, s3.entry.supply)),
          supplyMeasurements => ({ ...s3, supplyMeasurements }),
        ),
      (s4: Stage4) =>
        mapResult(
          assembleRefineryForPolicy(policy, s4.refineryMeasurements),
          refinery => ({ ...s4, refinery }),
        ),
      (s5: Stage5) =>
        mapResult(
          assembleSupplyForPolicy(policy, s5.supplyMeasurements),
          supply => ({ ...s5, supply }),
        ),
      (s6: Stage6) =>
        identityError(
          assembleWeeklyPetroleumFactsWithPolicy({
            policy,
            inventories: s6.inventories,
            refinery: s6.refinery,
            supply: s6.supply,
            prices: [s6.price],
          }),
        ),
    ],
  )

  return pipeline(entry)
}

export const processTrustedBoundaryMeasurements = (
  input: TrustedBoundaryInput,
  policy: RequiredMeasurementPolicy = walkingSkeletonRequiredMeasurementPolicy,
): Result<readonly WeeklyPetroleumFacts[], MeasurementInputWorkflowError> =>
  pipeWith(
    <I, F, O>(step: (value: I) => Result<O, F>, result: Result<I, F>) => binder(step, result),
    [
      (i: TrustedBoundaryInput) => mapError(normalizeWeeklyFacts(i), e => ({ kind: 'NormalizeError', input: e })),
      (normalized: NormalizedWeeklyInput) => identityError(sequenceResults(normalized.map(entry => processNormalizedEntry(policy, entry)))),
      (builtArray: readonly WeeklyPetroleumFacts[]) => identityError(sequenceResults(builtArray.map(wpf => validateWeeklyFacts(wpf, policy)))),
    ],
  )(input)

export default processTrustedBoundaryMeasurements
