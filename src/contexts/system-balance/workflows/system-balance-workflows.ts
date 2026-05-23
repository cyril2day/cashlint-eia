import {
  formatGeographyScope,
  formatMeasurementUnit,
  formatReportWeekIso,
  measurementUnitCategory,
} from '@/contexts/measurement/model'
import type {
  InventoryMeasurement,
  MeasurementUnit,
  RefinerySet,
  SupplyMeasurement,
  SupplySet,
  WeeklyPetroleumFacts,
} from '@/contexts/measurement/model'
import { bindResult, combineResults, success, failure } from '@/shared/result'
import type { Result } from '@/shared/result'
import { ifElse, cond, allPass, pipeWith } from '@/shared/fp'
import { isSome, some, none, type Maybe } from '@/shared/maybe'

import { createSystemBalanceError } from '../errors'
import type { SystemBalanceError, SystemBalanceErrorKind } from '../errors'
import type { SystemBalancePolicy } from '../policies'
import {
  type AvailableSupply,
  type BalanceCaveat,
  type BalanceCaveatKind,
  type BalanceConfidence,
  type BalanceConfidenceLevel,
  type BalanceDriver,
  type BalanceDriverKind,
  type InventoryChange,
  type InventoryMovement,
  type NetImports,
  type PressureClassification,
  type RefineryDemand,
  type SupplyPressure,
  type SystemBalanceAnalysis,
  type SystemBalanceState,
} from '../model'

const sameUnit = (left: MeasurementUnit, right: MeasurementUnit): boolean =>
  formatMeasurementUnit(left) === formatMeasurementUnit(right)

const sameWeek = (
  left: { readonly reportWeek: WeeklyPetroleumFacts['reportWeek'] },
  right: { readonly reportWeek: WeeklyPetroleumFacts['reportWeek'] },
): boolean => formatReportWeekIso(left.reportWeek) === formatReportWeekIso(right.reportWeek)

const sameGeography = (
  left: { readonly geography: WeeklyPetroleumFacts['geography'] },
  right: { readonly geography: WeeklyPetroleumFacts['geography'] },
): boolean => formatGeographyScope(left.geography) === formatGeographyScope(right.geography)

const differentWeek = (
  left: { readonly reportWeek: WeeklyPetroleumFacts['reportWeek'] },
  right: { readonly reportWeek: WeeklyPetroleumFacts['reportWeek'] },
): boolean => sameWeek(left, right) === false

const differentGeography = (
  left: { readonly geography: WeeklyPetroleumFacts['geography'] },
  right: { readonly geography: WeeklyPetroleumFacts['geography'] },
): boolean => sameGeography(left, right) === false

const flowUnit = (unit: MeasurementUnit): boolean => measurementUnitCategory(unit) === 'flow'

const stockUnit = (unit: MeasurementUnit): boolean => measurementUnitCategory(unit) === 'stock'

const classifySignedValue = <Positive, Negative, Neutral>(
  value: number,
  tolerance: number,
  positive: Positive,
  negative: Negative,
  neutral: Neutral,
): Positive | Negative | Neutral =>
  cond<[number], Positive | Negative | Neutral>([
    [candidate => candidate > tolerance, () => positive],
    [candidate => candidate < -tolerance, () => negative],
    [() => true, () => neutral],
  ])(value)

const caveat = (kind: BalanceCaveatKind): BalanceCaveat => ({ kind })

const uniqueCaveats = (caveats: readonly BalanceCaveat[]): readonly BalanceCaveat[] =>
  caveats.filter((candidate, index) => caveats.findIndex(value => value.kind === candidate.kind) === index)

const requireSome = <Value>(
  value: Maybe<Value>,
  kind: SystemBalanceErrorKind,
  input: string,
): Result<Value, SystemBalanceError> =>
  ifElse(
    isSome<Value>,
    candidate => success(candidate.value),
    () => failure(createSystemBalanceError(kind, input)),
  )(value)

type UnitPair = readonly [
  { readonly unit: MeasurementUnit },
  { readonly unit: MeasurementUnit },
]

const sameUnitPair = (pair: UnitPair): boolean => sameUnit(pair[0].unit, pair[1].unit)
const flowUnitPair = (pair: UnitPair): boolean => allPass([
  (candidate: UnitPair) => flowUnit(candidate[0].unit),
  (candidate: UnitPair) => flowUnit(candidate[1].unit),
  sameUnitPair,
])(pair)
const stockUnitPair = (pair: UnitPair): boolean => allPass([
  (candidate: UnitPair) => stockUnit(candidate[0].unit),
  (candidate: UnitPair) => stockUnit(candidate[1].unit),
  sameUnitPair,
])(pair)

const requireFlowPair = (
  left: { readonly unit: MeasurementUnit },
  right: { readonly unit: MeasurementUnit },
  input: string,
): Result<UnitPair, SystemBalanceError> =>
  ifElse(
    flowUnitPair,
    (pair: UnitPair) => success(pair),
    () => failure(createSystemBalanceError('IncompatibleUnits', input)),
  )([left, right])

const requireStockPair = (
  left: { readonly unit: MeasurementUnit },
  right: { readonly unit: MeasurementUnit },
  input: string,
): Result<UnitPair, SystemBalanceError> =>
  ifElse(
    stockUnitPair,
    (pair: UnitPair) => success(pair),
    () => failure(createSystemBalanceError('IncompatibleUnits', input)),
  )([left, right])

type NetImportsInput = Readonly<{
  readonly imports: Maybe<SupplyMeasurement>
  readonly exportsValue: Maybe<SupplyMeasurement>
}>

type NetImportsRequiredInput = Readonly<{
  readonly imports: SupplyMeasurement
  readonly exportsValue: SupplyMeasurement
}>

const requireNetImportsInput = (input: NetImportsInput): Result<NetImportsRequiredInput, SystemBalanceError> =>
  combineResults(
    requireSome(input.imports, 'MissingImports', 'imports'),
    requireSome(input.exportsValue, 'MissingExports', 'exports'),
    (imports, exportsValue) => ({ imports, exportsValue }),
  )

const calculateRequiredNetImports = (input: NetImportsRequiredInput): Result<NetImports, SystemBalanceError> =>
  cond<[NetImportsRequiredInput], Result<NetImports, SystemBalanceError>>([
    [
      value => differentWeek(value.imports.fact, value.exportsValue.fact),
      () => failure(createSystemBalanceError('ReportWeekMismatch', 'imports,exports')),
    ],
    [
      value => differentGeography(value.imports.fact, value.exportsValue.fact),
      () => failure(createSystemBalanceError('GeographyMismatch', 'imports,exports')),
    ],
    [
      () => true,
      value => bindResult(requireFlowPair(value.imports.fact, value.exportsValue.fact, 'imports,exports'), () =>
        success({
          value: value.imports.fact.value - value.exportsValue.fact.value,
          unit: value.imports.fact.unit,
          reportWeek: value.imports.fact.reportWeek,
          geography: value.imports.fact.geography,
          imports: value.imports,
          exports: value.exportsValue,
        }),
      ),
    ],
  ])(input)

export const calculateNetImports = (
  imports: Maybe<SupplyMeasurement>,
  exportsValue: Maybe<SupplyMeasurement>,
): Result<NetImports, SystemBalanceError> =>
  bindResult(requireNetImportsInput({ imports, exportsValue }), calculateRequiredNetImports)

type AvailableSupplyInput = Readonly<{
  readonly production: Maybe<SupplyMeasurement>
  readonly netImports: Maybe<NetImports>
}>

type AvailableSupplyRequiredInput = Readonly<{
  readonly production: SupplyMeasurement
  readonly netImports: NetImports
}>

const requireAvailableSupplyInput = (
  input: AvailableSupplyInput,
): Result<AvailableSupplyRequiredInput, SystemBalanceError> =>
  combineResults(
    requireSome(input.production, 'MissingProduction', 'production'),
    requireSome(input.netImports, 'MissingImports', 'net-imports'),
    (production, netImports) => ({ production, netImports }),
  )

const calculateRequiredAvailableSupply = (
  input: AvailableSupplyRequiredInput,
): Result<AvailableSupply, SystemBalanceError> =>
  cond<[AvailableSupplyRequiredInput], Result<AvailableSupply, SystemBalanceError>>([
    [
      value => differentWeek(value.production.fact, value.netImports),
      () => failure(createSystemBalanceError('ReportWeekMismatch', 'production,net-imports')),
    ],
    [
      value => differentGeography(value.production.fact, value.netImports),
      () => failure(createSystemBalanceError('GeographyMismatch', 'production,net-imports')),
    ],
    [
      () => true,
      value => bindResult(requireFlowPair(value.production.fact, value.netImports, 'production,net-imports'), () =>
        success({
          value: value.production.fact.value + value.netImports.value,
          unit: value.production.fact.unit,
          reportWeek: value.production.fact.reportWeek,
          geography: value.production.fact.geography,
          production: value.production,
          netImports: value.netImports,
        }),
      ),
    ],
  ])(input)

export const calculateAvailableSupply = (
  production: Maybe<SupplyMeasurement>,
  netImports: Maybe<NetImports>,
): Result<AvailableSupply, SystemBalanceError> =>
  bindResult(requireAvailableSupplyInput({ production, netImports }), calculateRequiredAvailableSupply)

export const deriveRefineryDemand = (
  refinery: Maybe<RefinerySet>,
): Result<RefineryDemand, SystemBalanceError> =>
  bindResult(requireSome(refinery, 'MissingRefineryDemandComponent', 'refinery-net-input'), value =>
    ifElse(
      (candidate: RefinerySet) => flowUnit(candidate.netInput.fact.unit),
      (candidate: RefinerySet) => success<RefineryDemand>({
        value: candidate.netInput.fact.value,
        unit: candidate.netInput.fact.unit,
        reportWeek: candidate.reportWeek,
        geography: candidate.geography,
        refineryInput: candidate.netInput,
        assumption: 'SimplifiedCrudeBalance',
      }),
      () => failure(createSystemBalanceError('IncompatibleUnits', 'refinery-net-input')),
    )(value),
  )

type InventoryChangeInput = Readonly<{
  readonly currentInventory: Maybe<InventoryMeasurement>
  readonly previousInventory: Maybe<InventoryMeasurement>
  readonly policy: SystemBalancePolicy
}>

type InventoryChangeRequiredInput = Readonly<{
  readonly currentInventory: InventoryMeasurement
  readonly previousInventory: InventoryMeasurement
  readonly policy: SystemBalancePolicy
}>

const requireInventoryChangeInput = (
  input: InventoryChangeInput,
): Result<InventoryChangeRequiredInput, SystemBalanceError> =>
  combineResults(
    requireSome(input.currentInventory, 'MissingCurrentInventory', 'current-inventory'),
    requireSome(input.previousInventory, 'MissingPreviousInventory', 'previous-inventory'),
    (currentInventory, previousInventory) => ({
      currentInventory,
      previousInventory,
      policy: input.policy,
    }),
  )

const sameInventoryProduct = (input: InventoryChangeRequiredInput): boolean =>
  String(input.currentInventory.product.product) === String(input.previousInventory.product.product)

const calculateRequiredInventoryChange = (
  input: InventoryChangeRequiredInput,
): Result<InventoryChange, SystemBalanceError> =>
  cond<[InventoryChangeRequiredInput], Result<InventoryChange, SystemBalanceError>>([
    [
      value => sameInventoryProduct(value) === false,
      () => failure(createSystemBalanceError('UnsupportedBalanceComponent', 'inventory-product')),
    ],
    [
      value => differentGeography(value.currentInventory.fact, value.previousInventory.fact),
      () => failure(createSystemBalanceError('GeographyMismatch', 'current-inventory,previous-inventory')),
    ],
    [
      value => sameWeek(value.currentInventory.fact, value.previousInventory.fact),
      () => failure(createSystemBalanceError('ReportWeekMismatch', 'current-inventory,previous-inventory')),
    ],
    [
      () => true,
      value => bindResult(
        requireStockPair(value.currentInventory.fact, value.previousInventory.fact, 'current-inventory,previous-inventory'),
        () => {
          const changeValue = value.currentInventory.fact.value - value.previousInventory.fact.value
          const movement: InventoryMovement = classifySignedValue(
            changeValue,
            value.policy.inventoryFlatTolerance,
            'StockBuild',
            'StockDraw',
            'StockFlat',
          )

          return success({
            value: changeValue,
            unit: value.currentInventory.fact.unit,
            reportWeek: value.currentInventory.fact.reportWeek,
            geography: value.currentInventory.fact.geography,
            currentInventory: value.currentInventory,
            previousInventory: value.previousInventory,
            movement,
          })
        },
      ),
    ],
  ])(input)

export const calculateInventoryChange = (
  currentInventory: Maybe<InventoryMeasurement>,
  previousInventory: Maybe<InventoryMeasurement>,
  policy: SystemBalancePolicy,
): Result<InventoryChange, SystemBalanceError> =>
  bindResult(
    requireInventoryChangeInput({ currentInventory, previousInventory, policy }),
    calculateRequiredInventoryChange,
  )

type SupplyPressureInput = Readonly<{
  readonly availableSupply: Maybe<AvailableSupply>
  readonly refineryDemand: Maybe<RefineryDemand>
  readonly policy: SystemBalancePolicy
}>

type SupplyPressureRequiredInput = Readonly<{
  readonly availableSupply: AvailableSupply
  readonly refineryDemand: RefineryDemand
  readonly policy: SystemBalancePolicy
}>

const requireSupplyPressureInput = (
  input: SupplyPressureInput,
): Result<SupplyPressureRequiredInput, SystemBalanceError> =>
  combineResults(
    requireSome(input.availableSupply, 'MissingSupply', 'available-supply'),
    requireSome(input.refineryDemand, 'MissingRefineryDemandComponent', 'refinery-demand'),
    (availableSupply, refineryDemand) => ({
      availableSupply,
      refineryDemand,
      policy: input.policy,
    }),
  )

const calculateRequiredSupplyPressure = (
  input: SupplyPressureRequiredInput,
): Result<SupplyPressure, SystemBalanceError> =>
  cond<[SupplyPressureRequiredInput], Result<SupplyPressure, SystemBalanceError>>([
    [
      value => differentWeek(value.availableSupply, value.refineryDemand),
      () => failure(createSystemBalanceError('ReportWeekMismatch', 'available-supply,refinery-demand')),
    ],
    [
      value => differentGeography(value.availableSupply, value.refineryDemand),
      () => failure(createSystemBalanceError('GeographyMismatch', 'available-supply,refinery-demand')),
    ],
    [
      () => true,
      value => bindResult(requireFlowPair(value.availableSupply, value.refineryDemand, 'available-supply,refinery-demand'), () => {
        const pressureValue = value.availableSupply.value - value.refineryDemand.value
        const pressure: PressureClassification = classifySignedValue(
          pressureValue,
          value.policy.supplyPressureNeutralTolerance,
          'SurplusPressure',
          'TightnessPressure',
          'NeutralPressure',
        )

        return success({
          value: pressureValue,
          unit: value.availableSupply.unit,
          reportWeek: value.availableSupply.reportWeek,
          geography: value.availableSupply.geography,
          availableSupply: value.availableSupply,
          refineryDemand: value.refineryDemand,
          pressure,
        })
      }),
    ],
  ])(input)

export const calculateSupplyPressure = (
  availableSupply: Maybe<AvailableSupply>,
  refineryDemand: Maybe<RefineryDemand>,
  policy: SystemBalancePolicy,
): Result<SupplyPressure, SystemBalanceError> =>
  bindResult(
    requireSupplyPressureInput({ availableSupply, refineryDemand, policy }),
    calculateRequiredSupplyPressure,
  )

type BalanceStateInput = Readonly<{
  readonly inventoryChange: Maybe<InventoryChange>
  readonly supplyPressure: Maybe<SupplyPressure>
  readonly policy: SystemBalancePolicy
}>

type BalanceStateRequiredInput = Readonly<{
  readonly inventoryChange: InventoryChange
  readonly supplyPressure: SupplyPressure
}>

const requireBalanceStateInput = (
  input: BalanceStateInput,
): Result<BalanceStateRequiredInput, SystemBalanceError> =>
  combineResults(
    requireSome(input.inventoryChange, 'UnableToClassifyBalanceState', 'inventory-change'),
    requireSome(input.supplyPressure, 'UnableToClassifyBalanceState', 'supply-pressure'),
    (inventoryChange, supplyPressure) => ({ inventoryChange, supplyPressure }),
  )

const missingEvidenceState = (policy: SystemBalancePolicy): Result<SystemBalanceState, SystemBalanceError> =>
  ifElse(
    (value: SystemBalancePolicy) => value.missingEvidenceBehavior === 'ReturnUnknown',
    () => success<SystemBalanceState>('Unknown'),
    () => failure(createSystemBalanceError('UnableToClassifyBalanceState', 'missing-evidence')),
  )(policy)

const requiredBalanceState = (input: BalanceStateRequiredInput): Result<SystemBalanceState, SystemBalanceError> =>
  cond<[BalanceStateRequiredInput], Result<SystemBalanceState, SystemBalanceError>>([
    [
      allPass([
        value => value.inventoryChange.movement === 'StockDraw',
        value => value.supplyPressure.pressure === 'TightnessPressure',
      ]),
      () => success<SystemBalanceState>('Tightening'),
    ],
    [
      allPass([
        value => value.inventoryChange.movement === 'StockBuild',
        value => value.supplyPressure.pressure === 'SurplusPressure',
      ]),
      () => success<SystemBalanceState>('Loosening'),
    ],
    [
      allPass([
        value => value.inventoryChange.movement === 'StockFlat',
        value => value.supplyPressure.pressure === 'NeutralPressure',
      ]),
      () => success<SystemBalanceState>('Balanced'),
    ],
    [() => true, () => success<SystemBalanceState>('Mixed')],
  ])(input)

export const classifyBalanceState = (
  inventoryChange: Maybe<InventoryChange>,
  supplyPressure: Maybe<SupplyPressure>,
  policy: SystemBalancePolicy,
): Result<SystemBalanceState, SystemBalanceError> => {
  const required = requireBalanceStateInput({ inventoryChange, supplyPressure, policy })

  return ifElse(
    (result: Result<BalanceStateRequiredInput, SystemBalanceError>) => result.ok,
    (result: Result<BalanceStateRequiredInput, SystemBalanceError>) =>
      bindResult(result, requiredBalanceState),
    () => missingEvidenceState(policy),
  )(required)
}

const changed = (current: number, previous: number, tolerance: number): boolean =>
  Math.abs(current - previous) > tolerance

const materialDriver = (
  kind: BalanceDriverKind,
  value: number,
  unit: MeasurementUnit,
  current: WeeklyPetroleumFacts,
): BalanceDriver => ({
  kind,
  value,
  unit,
  reportWeek: current.reportWeek,
  geography: current.geography,
})

const directionDriverKind = (
  currentValue: number,
  previousValue: number,
  increased: BalanceDriverKind,
  decreased: BalanceDriverKind,
): BalanceDriverKind =>
  ifElse(
    (value: number) => value > previousValue,
    () => increased,
    () => decreased,
  )(currentValue)

type SupplyDriverInput = Readonly<{
  readonly current: WeeklyPetroleumFacts
  readonly currentSupply: SupplySet
  readonly previousSupply: SupplySet
  readonly policy: SystemBalancePolicy
}>

const driverForChange = (
  current: WeeklyPetroleumFacts,
  currentValue: number,
  previousValue: number,
  unit: MeasurementUnit,
  increased: BalanceDriverKind,
  decreased: BalanceDriverKind,
  policy: SystemBalancePolicy,
): readonly BalanceDriver[] =>
  ifElse(
    (_value: WeeklyPetroleumFacts) => changed(currentValue, previousValue, policy.driverMaterialityTolerance),
    () => [materialDriver(
      directionDriverKind(currentValue, previousValue, increased, decreased),
      currentValue - previousValue,
      unit,
      current,
    )],
    () => [],
  )(current)

const supplyDriversFromPair = (input: SupplyDriverInput): readonly BalanceDriver[] => [
  ...driverForChange(
    input.current,
    input.currentSupply.production.fact.value,
    input.previousSupply.production.fact.value,
    input.currentSupply.production.fact.unit,
    'IncreasedProduction',
    'DecreasedProduction',
    input.policy,
  ),
  ...driverForChange(
    input.current,
    input.currentSupply.imports.fact.value,
    input.previousSupply.imports.fact.value,
    input.currentSupply.imports.fact.unit,
    'IncreasedImports',
    'DecreasedImports',
    input.policy,
  ),
  ...driverForChange(
    input.current,
    input.currentSupply.exports.fact.value,
    input.previousSupply.exports.fact.value,
    input.currentSupply.exports.fact.unit,
    'IncreasedExports',
    'DecreasedExports',
    input.policy,
  ),
]

const maybeSupplyDrivers = (
  current: WeeklyPetroleumFacts,
  previous: WeeklyPetroleumFacts,
  policy: SystemBalancePolicy,
): readonly BalanceDriver[] => {
  const supplyPair = combineResults(
    requireSome(current.supply, 'MissingSupply', 'current-supply'),
    requireSome(previous.supply, 'MissingSupply', 'previous-supply'),
    (currentSupply, previousSupply) => ({ currentSupply, previousSupply, current, policy }),
  )

  return ifElse(
    (result: Result<SupplyDriverInput, SystemBalanceError>) => result.ok,
    result => supplyDriversFromPair(result.value),
    () => [],
  )(supplyPair)
}

type RefineryDriverInput = Readonly<{
  readonly current: WeeklyPetroleumFacts
  readonly currentRefinery: RefinerySet
  readonly previousRefinery: RefinerySet
  readonly policy: SystemBalancePolicy
}>

const refineryDriversFromPair = (input: RefineryDriverInput): readonly BalanceDriver[] =>
  driverForChange(
    input.current,
    input.currentRefinery.netInput.fact.value,
    input.previousRefinery.netInput.fact.value,
    input.currentRefinery.netInput.fact.unit,
    'StrongerRefineryDemand',
    'WeakerRefineryDemand',
    input.policy,
  )

const maybeRefineryDrivers = (
  current: WeeklyPetroleumFacts,
  previous: WeeklyPetroleumFacts,
  policy: SystemBalancePolicy,
): readonly BalanceDriver[] => {
  const refineryPair = combineResults(
    requireSome(current.refinery, 'MissingRefineryDemandComponent', 'current-refinery'),
    requireSome(previous.refinery, 'MissingRefineryDemandComponent', 'previous-refinery'),
    (currentRefinery, previousRefinery) => ({ currentRefinery, previousRefinery, current, policy }),
  )

  return ifElse(
    (result: Result<RefineryDriverInput, SystemBalanceError>) => result.ok,
    result => refineryDriversFromPair(result.value),
    () => [],
  )(refineryPair)
}

const inventoryDrivers = (
  current: WeeklyPetroleumFacts,
  inventoryChange: InventoryChange,
): readonly BalanceDriver[] =>
  cond<[InventoryChange], readonly BalanceDriver[]>([
    [
      value => value.movement === 'StockDraw',
      value => [materialDriver('InventoryDraw', value.value, value.unit, current)],
    ],
    [
      value => value.movement === 'StockBuild',
      value => [materialDriver('InventoryBuild', value.value, value.unit, current)],
    ],
    [() => true, () => []],
  ])(inventoryChange)

const pressureDrivers = (
  current: WeeklyPetroleumFacts,
  supplyPressure: SupplyPressure,
  policy: SystemBalancePolicy,
): readonly BalanceDriver[] =>
  ifElse(
    (value: SupplyPressure) => Math.abs(value.value) > policy.supplyPressureNeutralTolerance,
    value => [materialDriver('SupplyPressureMovement', value.value, value.unit, current)],
    () => [],
  )(supplyPressure)

export const identifyBalanceDrivers = (
  current: WeeklyPetroleumFacts,
  previous: WeeklyPetroleumFacts,
  inventoryChange: InventoryChange,
  supplyPressure: SupplyPressure,
  policy: SystemBalancePolicy,
): readonly BalanceDriver[] => [
  ...inventoryDrivers(current, inventoryChange),
  ...pressureDrivers(current, supplyPressure, policy),
  ...maybeRefineryDrivers(current, previous, policy),
  ...maybeSupplyDrivers(current, previous, policy),
]

const policyCaveats = (
  current: WeeklyPetroleumFacts,
  policy: SystemBalancePolicy,
): readonly BalanceCaveat[] => [
  ...ifElse(
    (value: SystemBalancePolicy) => value.requireSimplifiedCrudeBalanceCaveat,
    () => [caveat('SimplifiedCrudeBalance')],
    () => [],
  )(policy),
  ...ifElse(
    (value: SystemBalancePolicy) => value.includeRateComparisonCaveat,
    () => [caveat('RateToStockComparisonLimitation')],
    () => [],
  )(policy),
  ...ifElse(
    (value: SystemBalancePolicy) => value.partialGeographyCaveatGeographies.includes(formatGeographyScope(current.geography)),
    () => [caveat('PartialGeographyCoverage')],
    () => [],
  )(policy),
]

const stateCaveats = (balanceState: SystemBalanceState): readonly BalanceCaveat[] =>
  cond<[SystemBalanceState], readonly BalanceCaveat[]>([
    [value => value === 'Mixed', () => [caveat('MixedSignalDirection')]],
    [value => value === 'Unknown', () => [caveat('UnknownStateDueToMissingEvidence')]],
    [() => true, () => []],
  ])(balanceState)

export const createBalanceCaveats = (
  balanceState: SystemBalanceState,
  current: WeeklyPetroleumFacts,
  policy: SystemBalancePolicy,
): readonly BalanceCaveat[] =>
  uniqueCaveats([...policyCaveats(current, policy), ...stateCaveats(balanceState)])

const confidenceOrder: readonly BalanceConfidenceLevel[] = ['Unknown', 'Low', 'Medium', 'High']

const lowerConfidence = (
  current: BalanceConfidenceLevel,
  candidate: BalanceConfidenceLevel,
): BalanceConfidenceLevel =>
  ifElse(
    (value: BalanceConfidenceLevel) => confidenceOrder.indexOf(value) < confidenceOrder.indexOf(current),
    value => value,
    () => current,
  )(candidate)

const initialConfidence = (balanceState: SystemBalanceState): BalanceConfidenceLevel =>
  cond<[SystemBalanceState], BalanceConfidenceLevel>([
    [value => value === 'Unknown', () => 'Unknown'],
    [value => value === 'Mixed', () => 'Medium'],
    [() => true, () => 'High'],
  ])(balanceState)

const isBalanceConfidenceLevel = (input: unknown): input is BalanceConfidenceLevel =>
  confidenceOrder.some(level => level === input)

const caveatPenalty = (
  caveatValue: BalanceCaveat,
  policy: SystemBalancePolicy,
  fallback: BalanceConfidenceLevel,
): BalanceConfidenceLevel =>
  ifElse(
    isBalanceConfidenceLevel,
    value => value,
    () => fallback,
  )(policy.caveatConfidencePenalty[caveatValue.kind])

export const assignBalanceConfidence = (
  balanceState: SystemBalanceState,
  caveats: readonly BalanceCaveat[],
  policy: SystemBalancePolicy,
): BalanceConfidence => ({
  level: caveats.reduce(
    (level, value) => lowerConfidence(level, caveatPenalty(value, policy, level)),
    initialConfidence(balanceState),
  ),
})

const crudeInventory = (facts: WeeklyPetroleumFacts): Maybe<InventoryMeasurement> => {
  const measurement = facts.inventories.find(inventory => String(inventory.product.product) === 'CrudeOil')

  return ifElse(
    (value: InventoryMeasurement | undefined): value is InventoryMeasurement => value !== undefined,
    value => some(value),
    none,
  )(measurement)
}

type CompositionContext = Readonly<{
  readonly current: WeeklyPetroleumFacts
  readonly previous: WeeklyPetroleumFacts
  readonly policy: SystemBalancePolicy
  readonly supply: SupplySet
  readonly refinery: RefinerySet
  readonly netImports: NetImports
  readonly availableSupply: AvailableSupply
  readonly refineryDemand: RefineryDemand
  readonly inventoryChange: InventoryChange
  readonly supplyPressure: SupplyPressure
  readonly balanceState: SystemBalanceState
  readonly caveats: readonly BalanceCaveat[]
}>

const requireCurrentFacts = (
  current: Maybe<WeeklyPetroleumFacts>,
  policy: SystemBalancePolicy,
): Result<Pick<CompositionContext, 'current' | 'policy'>, SystemBalanceError> =>
  bindResult(requireSome(current, 'MissingCurrentWeeklyFacts', 'current-weekly-facts'), value =>
    success({ current: value, policy }))

const stepPreviousFacts = (
  previous: Maybe<WeeklyPetroleumFacts>,
) => (
  context: Pick<CompositionContext, 'current' | 'policy'>,
): Result<Pick<CompositionContext, 'current' | 'previous' | 'policy'>, SystemBalanceError> =>
  bindResult(requireSome(previous, 'MissingPreviousWeeklyFacts', 'previous-weekly-facts'), value =>
    success({ ...context, previous: value }))

const stepCurrentSupply = (
  context: Pick<CompositionContext, 'current' | 'previous' | 'policy'>,
): Result<Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply'>, SystemBalanceError> =>
  bindResult(requireSome(context.current.supply, 'MissingSupply', 'supply'), value =>
    success({ ...context, supply: value }))

const stepCurrentRefinery = (
  context: Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply'>,
): Result<Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery'>, SystemBalanceError> =>
  bindResult(requireSome(context.current.refinery, 'MissingRefineryDemandComponent', 'refinery'), value =>
    success({ ...context, refinery: value }))

const stepNetImports = (
  context: Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery'>,
): Result<Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery' | 'netImports'>, SystemBalanceError> =>
  bindResult(calculateNetImports({ kind: 'Some', value: context.supply.imports }, { kind: 'Some', value: context.supply.exports }), value =>
    success({ ...context, netImports: value }))

const stepAvailableSupply = (
  context: Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery' | 'netImports'>,
): Result<Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery' | 'netImports' | 'availableSupply'>, SystemBalanceError> =>
  bindResult(calculateAvailableSupply({ kind: 'Some', value: context.supply.production }, { kind: 'Some', value: context.netImports }), value =>
    success({ ...context, availableSupply: value }))

const stepRefineryDemand = (
  context: Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery' | 'netImports' | 'availableSupply'>,
): Result<Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery' | 'netImports' | 'availableSupply' | 'refineryDemand'>, SystemBalanceError> =>
  bindResult(deriveRefineryDemand({ kind: 'Some', value: context.refinery }), value =>
    success({ ...context, refineryDemand: value }))

const stepInventoryChange = (
  context: Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery' | 'netImports' | 'availableSupply' | 'refineryDemand'>,
): Result<Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery' | 'netImports' | 'availableSupply' | 'refineryDemand' | 'inventoryChange'>, SystemBalanceError> =>
  bindResult(calculateInventoryChange(crudeInventory(context.current), crudeInventory(context.previous), context.policy), value =>
    success({ ...context, inventoryChange: value }))

const stepSupplyPressure = (
  context: Pick<CompositionContext, 'current' | 'previous' | 'policy' | 'supply' | 'refinery' | 'netImports' | 'availableSupply' | 'refineryDemand' | 'inventoryChange'>,
): Result<Omit<CompositionContext, 'balanceState' | 'caveats'>, SystemBalanceError> =>
  bindResult(calculateSupplyPressure({ kind: 'Some', value: context.availableSupply }, { kind: 'Some', value: context.refineryDemand }, context.policy), value =>
    success({ ...context, supplyPressure: value }))

const stepBalanceState = (
  context: Omit<CompositionContext, 'balanceState' | 'caveats'>,
): Result<Omit<CompositionContext, 'caveats'>, SystemBalanceError> =>
  bindResult(classifyBalanceState({ kind: 'Some', value: context.inventoryChange }, { kind: 'Some', value: context.supplyPressure }, context.policy), value =>
    success({ ...context, balanceState: value }))

const stepCaveats = (
  context: Omit<CompositionContext, 'caveats'>,
): Result<CompositionContext, SystemBalanceError> =>
  success({ ...context, caveats: createBalanceCaveats(context.balanceState, context.current, context.policy) })

const toSystemBalanceAnalysis = (
  context: CompositionContext,
): Result<SystemBalanceAnalysis, SystemBalanceError> =>
  success({
    reportWeek: context.current.reportWeek,
    geography: context.current.geography,
    netImports: context.netImports,
    availableSupply: context.availableSupply,
    refineryDemand: context.refineryDemand,
    inventoryChange: context.inventoryChange,
    supplyPressure: context.supplyPressure,
    balanceState: context.balanceState,
    drivers: identifyBalanceDrivers(context.current, context.previous, context.inventoryChange, context.supplyPressure, context.policy),
    caveats: context.caveats,
    confidence: assignBalanceConfidence(context.balanceState, context.caveats, context.policy),
  })

export const composeSystemBalanceAnalysis = (
  current: Maybe<WeeklyPetroleumFacts>,
  previous: Maybe<WeeklyPetroleumFacts>,
  policy: SystemBalancePolicy,
): Result<SystemBalanceAnalysis, SystemBalanceError> => {
  const pipeline = pipeWith(<Input, Failure, Output>(
    step: (value: Input) => Result<Output, Failure>,
    result: Result<Input, Failure>,
  ) => bindResult(result, step), [
    stepPreviousFacts(previous),
    stepCurrentSupply,
    stepCurrentRefinery,
    stepNetImports,
    stepAvailableSupply,
    stepRefineryDemand,
    stepInventoryChange,
    stepSupplyPressure,
    stepBalanceState,
    stepCaveats,
    toSystemBalanceAnalysis,
  ])

  return bindResult(requireCurrentFacts(current, policy), value => pipeline(value))
}
