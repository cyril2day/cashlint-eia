import type { TrustedBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { mapError, mapResult, sequenceResults } from '@/shared/result'
import { pipeWith } from '@/shared/fp'
import { binder } from '@/contexts/acl/eia-ingestion-acl/helpers/translatorPipeline'
import type { Result } from '@/shared/result'
import { normalizeWeeklyFacts, type NormalizedWeeklyInput } from '@/contexts/measurement/normalizers/normalizeWeeklyFacts'
import { buildInventoryMeasurements, buildPriceMeasurement, type MeasurementBuilderError } from './build-measurements'
import { assembleWeeklyPetroleumFacts, type WeeklyPetroleumFactsError, type WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import type { InventoryMeasurement } from '@/contexts/measurement/model/inventory-measurement'
import type { PriceMeasurement } from '@/contexts/measurement/model/price-measurement'
import { validateWeeklyFacts, type WeeklyFactsValidationError } from './validate-weekly-facts'

export type MeasurementInputWorkflowError =
  | Readonly<{ readonly kind: 'NormalizeError'; readonly input: unknown }>
  | Readonly<{ readonly kind: 'BuilderError'; readonly input: string }>
  | WeeklyPetroleumFactsError
  | WeeklyFactsValidationError

const mapBuilderError = (e: MeasurementBuilderError): MeasurementInputWorkflowError => ({ kind: 'BuilderError', input: String(e) })

type NormalizedEntry = NormalizedWeeklyInput[number]

const mapBuilderResult = <T>(r: Result<T, MeasurementBuilderError>): Result<T, MeasurementInputWorkflowError> =>
  mapError(r, mapBuilderError)

const identityError = <T, E>(r: Result<T, E>): Result<T, E | MeasurementInputWorkflowError> => mapError(r, e => e)

const processNormalizedEntry = (entry: NormalizedEntry): Result<WeeklyPetroleumFacts, MeasurementInputWorkflowError> => {
  type Stage1 = { entry: NormalizedEntry; inventories: readonly InventoryMeasurement[] }
  type Stage2 = Stage1 & { price: PriceMeasurement }

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
      (s2: Stage2) => identityError(assembleWeeklyPetroleumFacts(s2.inventories, [s2.price])),
    ],
  )

  return pipeline(entry)
}

export const processTrustedBoundaryMeasurements = (
  input: TrustedBoundaryInput,
): Result<readonly WeeklyPetroleumFacts[], MeasurementInputWorkflowError> =>
  pipeWith(
    <I, F, O>(step: (value: I) => Result<O, F>, result: Result<I, F>) => binder(step, result),
    [
      (i: TrustedBoundaryInput) => mapError(normalizeWeeklyFacts(i), e => ({ kind: 'NormalizeError', input: e })),
      (normalized: NormalizedWeeklyInput) => mapError(sequenceResults(normalized.map(processNormalizedEntry)), e => ({ kind: 'BuilderError', input: String(e) })),
      (builtArray: readonly WeeklyPetroleumFacts[]) => identityError(sequenceResults(builtArray.map(wpf => validateWeeklyFacts(wpf)))),
    ],
  )(input)

export default processTrustedBoundaryMeasurements