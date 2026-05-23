import type { Decimal } from '@/shared/decimal'
import type {
  GeographyScope,
  InventoryMeasurement,
  MeasurementUnit,
  RefineryMeasurement,
  ReportWeek,
  SupplyMeasurement,
} from '@/contexts/measurement/model'

export type NetImports = Readonly<{
  readonly value: Decimal
  readonly unit: MeasurementUnit
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly imports: SupplyMeasurement
  readonly exports: SupplyMeasurement
}>

export type AvailableSupply = Readonly<{
  readonly value: Decimal
  readonly unit: MeasurementUnit
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly production: SupplyMeasurement
  readonly netImports: NetImports
}>

export type RefineryDemand = Readonly<{
  readonly value: Decimal
  readonly unit: MeasurementUnit
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly refineryInput: RefineryMeasurement
  readonly assumption: 'SimplifiedCrudeBalance'
}>

export type InventoryMovement = 'StockBuild' | 'StockDraw' | 'StockFlat'

export type InventoryChange = Readonly<{
  readonly value: Decimal
  readonly unit: MeasurementUnit
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly currentInventory: InventoryMeasurement
  readonly previousInventory: InventoryMeasurement
  readonly movement: InventoryMovement
}>

export type PressureClassification = 'SurplusPressure' | 'TightnessPressure' | 'NeutralPressure'

export type SupplyPressure = Readonly<{
  readonly value: Decimal
  readonly unit: MeasurementUnit
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly availableSupply: AvailableSupply
  readonly refineryDemand: RefineryDemand
  readonly pressure: PressureClassification
}>

export type SystemBalanceState = 'Tightening' | 'Loosening' | 'Balanced' | 'Mixed' | 'Unknown'

export type BalanceDriverKind =
  | 'InventoryDraw'
  | 'InventoryBuild'
  | 'StrongerRefineryDemand'
  | 'WeakerRefineryDemand'
  | 'IncreasedProduction'
  | 'DecreasedProduction'
  | 'IncreasedImports'
  | 'DecreasedImports'
  | 'IncreasedExports'
  | 'DecreasedExports'
  | 'SupplyPressureMovement'

export type BalanceDriver = Readonly<{
  readonly kind: BalanceDriverKind
  readonly value: Decimal
  readonly unit: MeasurementUnit
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
}>

export type BalanceCaveatKind =
  | 'SimplifiedCrudeBalance'
  | 'RateToStockComparisonLimitation'
  | 'MissingOptionalComponent'
  | 'MixedSignalDirection'
  | 'PartialGeographyCoverage'
  | 'UnknownStateDueToMissingEvidence'

export type BalanceCaveat = Readonly<{
  readonly kind: BalanceCaveatKind
}>

export type BalanceConfidenceLevel = 'High' | 'Medium' | 'Low' | 'Unknown'

export type BalanceConfidence = Readonly<{
  readonly level: BalanceConfidenceLevel
}>

export type SystemBalanceAnalysis = Readonly<{
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly netImports: NetImports
  readonly availableSupply: AvailableSupply
  readonly refineryDemand: RefineryDemand
  readonly inventoryChange: InventoryChange
  readonly supplyPressure: SupplyPressure
  readonly balanceState: SystemBalanceState
  readonly drivers: readonly BalanceDriver[]
  readonly caveats: readonly BalanceCaveat[]
  readonly confidence: BalanceConfidence
}>
