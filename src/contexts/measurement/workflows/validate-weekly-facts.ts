import { cond, ifElse, pipeWith } from '@/shared/fp'
import { bindResultStep, failure, mapError, mapResult, sequenceResults, success, type Result } from '@/shared/result'
import { parseReportWeek, formatReportWeekIso, type ReportWeek } from '@/contexts/measurement/model/report-week'
import { parseGeographyScope, formatGeographyScope, type GeographyScope } from '@/contexts/measurement/model/geography-scope'
import { parseInventoryMeasurement, type InventoryMeasurement } from '@/contexts/measurement/model/inventory-measurement'
import { parsePriceMeasurement, type PriceMeasurement } from '@/contexts/measurement/model/price-measurement'
import { assembleWeeklyPetroleumFactsWithPolicy, type WeeklyPetroleumFacts, type WeeklyPetroleumFactsError, isWeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import { walkingSkeletonRequiredMeasurementPolicy, type RequiredMeasurementPolicy } from '@/contexts/measurement/model/required-measurement-policy'

export type WeeklyFactsValidationError =
  | WeeklyPetroleumFactsError
  | Readonly<{ readonly kind: 'InvalidWeeklyPetroleumFactsInput'; readonly input: string }>

type ValidationStart = Readonly<{ readonly input: WeeklyPetroleumFacts }>
type ValidationWithWeek = ValidationStart & Readonly<{ readonly reportWeek: ReportWeek }>
type ValidationWithGeo = ValidationWithWeek & Readonly<{ readonly geography: GeographyScope }>
type ValidationWithInventories = ValidationWithGeo & Readonly<{ readonly inventories: readonly InventoryMeasurement[] }>
type ValidationWithPrice = ValidationWithInventories & Readonly<{ readonly price: PriceMeasurement }>
type ValidationWithAssembled = ValidationWithPrice & Readonly<{ readonly assembled: WeeklyPetroleumFacts }>

const makeInvalidWeeklyFactsInputError = (input: unknown): WeeklyFactsValidationError => ({
  kind: 'InvalidWeeklyPetroleumFactsInput',
  input: String(input),
})
const mapToInvalidWeeklyFactsInput = (input: unknown) => (): WeeklyFactsValidationError =>
  makeInvalidWeeklyFactsInputError(input)

const makeMissingInventory = (): WeeklyFactsValidationError => ({ kind: 'MissingRequiredMeasurement', missing: 'inventory' })

const makeMissingPrice = (): WeeklyFactsValidationError => ({ kind: 'MissingRequiredMeasurement', missing: 'price' })

const isReadonlyUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const validateInventoryArray = (values: readonly unknown[]): Result<readonly InventoryMeasurement[], WeeklyFactsValidationError> =>
  cond([
    [(inventoryValues: readonly unknown[]) => inventoryValues.length === 0, () => failure(makeMissingInventory())],
    [() => true, (inventoryValues: readonly unknown[]) => mapError(sequenceResults(inventoryValues.map(parseInventoryMeasurement)), mapToInvalidWeeklyFactsInput(inventoryValues))],
  ])(values)

const handleMissingOrInvalidInventory = (value: unknown): Result<readonly InventoryMeasurement[], WeeklyFactsValidationError> =>
  cond([
    [(candidate: unknown) => candidate === undefined, () => failure(makeMissingInventory())],
    [() => true, (candidate: unknown) => failure(makeInvalidWeeklyFactsInputError(candidate))],
  ])(value)

const validateReportWeekCoherence = (
  candidate: ValidationWithAssembled,
  assembled: WeeklyPetroleumFacts,
): Result<WeeklyPetroleumFacts, WeeklyFactsValidationError> =>
  ifElse(
    (value: ValidationWithPrice) => reportWeeksMatch(value.reportWeek, assembled.reportWeek),
    () => success(candidate.input),
    (value: ValidationWithPrice) =>
      failure<WeeklyFactsValidationError>({
        kind: 'ReportWeekMismatch',
        input: formatReportWeekIso(value.reportWeek) + ',' + formatReportWeekIso(assembled.reportWeek),
      }),
  )(candidate)

const validateGeographyCoherence = (
  candidate: ValidationWithAssembled,
  assembled: WeeklyPetroleumFacts,
): Result<WeeklyPetroleumFacts, WeeklyFactsValidationError> =>
  ifElse(
    (value: ValidationWithPrice) => geographiesMatch(value.geography, assembled.geography),
    () => success(candidate.input),
    (value: ValidationWithPrice) =>
      failure<WeeklyFactsValidationError>({
        kind: 'GeographyMismatch',
        input: formatGeographyScope(value.geography) + ',' + formatGeographyScope(assembled.geography),
      }),
  )(candidate)

const parseInventories = (candidate: unknown): Result<readonly InventoryMeasurement[], WeeklyFactsValidationError> =>
  ifElse(isReadonlyUnknownArray, validateInventoryArray, handleMissingOrInvalidInventory)(candidate)

const parsePrice = (candidate: unknown): Result<PriceMeasurement, WeeklyFactsValidationError> =>
  ifElse(
    (value: unknown) => value === undefined,
    () => failure(makeMissingPrice()),
    (value: unknown) => mapError(parsePriceMeasurement(value), mapToInvalidWeeklyFactsInput(value)),
  )(candidate)

const mapReportWeekParseError = (error: { readonly input: string }): WeeklyFactsValidationError =>
  ({ kind: 'InvalidWeeklyPetroleumFactsInput', input: error.input })

const mapGeographyParseError = (error: { readonly input: string }): WeeklyFactsValidationError =>
  ({ kind: 'InvalidWeeklyPetroleumFactsInput', input: error.input })

const mapIntoContext = <ContextValue, NextValue>(
  result: Result<NextValue, WeeklyFactsValidationError>,
  toContextValue: (value: NextValue) => ContextValue,
): Result<ContextValue, WeeklyFactsValidationError> =>
  mapResult(result, toContextValue)

const reportWeeksMatch = (left: ReportWeek, right: ReportWeek): boolean =>
  formatReportWeekIso(left) === formatReportWeekIso(right)

const geographiesMatch = (left: GeographyScope, right: GeographyScope): boolean =>
  formatGeographyScope(left) === formatGeographyScope(right)

const validateBrandedWeeklyFacts = (
  input: WeeklyPetroleumFacts,
  policy: RequiredMeasurementPolicy,
): Result<WeeklyPetroleumFacts, WeeklyFactsValidationError> => {
  const pipeline = pipeWith(
    bindResultStep,
    [
      (c: ValidationStart) =>
        mapIntoContext(mapError(parseReportWeek(c.input.reportWeek), mapReportWeekParseError), reportWeek => ({ ...c, reportWeek })),
      (c: ValidationWithWeek) =>
        mapIntoContext(mapError(parseGeographyScope(c.input.geography), mapGeographyParseError), geography => ({ ...c, geography })),
      (c: ValidationWithGeo) =>
        mapIntoContext(parseInventories(c.input.inventories), inventories => ({ ...c, inventories })),
      (c: ValidationWithInventories) =>
        mapIntoContext(parsePrice(c.input.price), price => ({ ...c, price })),
      (c: ValidationWithPrice) =>
        mapIntoContext(
          assembleWeeklyPetroleumFactsWithPolicy({
            policy,
            inventories: c.inventories,
            refinery: c.input.refinery,
            supply: c.input.supply,
            prices: [c.price],
          }),
          assembled => ({ ...c, assembled }),
        ),
      (c: ValidationWithAssembled) =>
        mapIntoContext(validateReportWeekCoherence(c, c.assembled), () => c),
      (c: ValidationWithAssembled) =>
        mapIntoContext(validateGeographyCoherence(c, c.assembled), () => c),
    ],
  )

  return mapResult(
    pipeline({ input }),
    () => input,
  )
}

export const validateWeeklyFacts = (
  input: unknown,
  policy: RequiredMeasurementPolicy = walkingSkeletonRequiredMeasurementPolicy,
): Result<WeeklyPetroleumFacts, WeeklyFactsValidationError> =>
  ifElse(
    isWeeklyPetroleumFacts,
    (candidate: WeeklyPetroleumFacts) => validateBrandedWeeklyFacts(candidate, policy),
    () => failure(makeInvalidWeeklyFactsInputError(input)),
  )(input)

export default validateWeeklyFacts
