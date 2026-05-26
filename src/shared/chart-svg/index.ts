import { formatDecimalCoordinate } from '@/shared/decimal'
import { ifElse, isNonEmptyString } from '@/shared/fp'
import { firstArrayItem, isNonEmptyArray, lastArrayItem } from '@/shared/collection'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'

export type ChartSvgFrame = Readonly<{
  readonly width: number
  readonly height: number
  readonly paddingTop: number
  readonly paddingRight: number
  readonly paddingBottom: number
  readonly paddingLeft: number
  readonly plotX: number
  readonly plotY: number
  readonly plotWidth: number
  readonly plotHeight: number
}>

export type ChartDomain = Readonly<{
  readonly minimum: number
  readonly maximum: number
}>

export type ChartSvgPoint = Readonly<{
  readonly x: number
  readonly y: number
}>

export const defaultChartSvgFrame: ChartSvgFrame = {
  width: 420,
  height: 220,
  paddingTop: 18,
  paddingRight: 20,
  paddingBottom: 46,
  paddingLeft: 72,
  plotX: 72,
  plotY: 18,
  plotWidth: 328,
  plotHeight: 156,
}

const defaultDomain: ChartDomain = {
  minimum: 0,
  maximum: 1,
}

const rawDomainFromNonEmptyValues = (values: readonly [number, ...number[]]): ChartDomain => ({
  minimum: Math.min(...values),
  maximum: Math.max(...values),
})

const rawNumericDomain = (values: readonly number[]): ChartDomain =>
  ifElse(
    isNonEmptyArray<number>,
    rawDomainFromNonEmptyValues,
    () => defaultDomain,
  )(values)

const domainHasSpread = (domain: ChartDomain): boolean => domain.maximum > domain.minimum

const widenFlatDomain = (domain: ChartDomain): ChartDomain => ({
  minimum: domain.minimum - 1,
  maximum: domain.maximum + 1,
})

const ensureDomainSpread = (domain: ChartDomain): ChartDomain =>
  ifElse(
    domainHasSpread,
    candidate => candidate,
    widenFlatDomain,
  )(domain)

export const numericDomain = (values: readonly number[]): ChartDomain =>
  ensureDomainSpread(rawNumericDomain(values))

const domainPadding = (domain: ChartDomain): number =>
  (domain.maximum - domain.minimum) * 0.08

export const paddedNumericDomain = (values: readonly number[]): ChartDomain => {
  const domain = numericDomain(values)
  const padding = domainPadding(domain)

  return {
    minimum: domain.minimum - padding,
    maximum: domain.maximum + padding,
  }
}

export const chartDomainBounds = (domain: ChartDomain): readonly [number, number] => [
  domain.minimum,
  domain.maximum,
]

export const scaleDomainToRange =
  (domain: ChartDomain, rangeStart: number, rangeEnd: number) =>
  (value: number): number => {
    const ratio = (value - domain.minimum) / (domain.maximum - domain.minimum)

    return rangeStart + (ratio * (rangeEnd - rangeStart))
  }

export const scaleXInFrame = (
  domain: ChartDomain,
  frame: ChartSvgFrame,
) => scaleDomainToRange(domain, frame.plotX, frame.plotX + frame.plotWidth)

export const scaleYInFrame = (
  domain: ChartDomain,
  frame: ChartSvgFrame,
) => scaleDomainToRange(domain, frame.plotY + frame.plotHeight, frame.plotY)

export const svgPoint = (point: ChartSvgPoint): string =>
  `${formatDecimalCoordinate(point.x)},${formatDecimalCoordinate(point.y)}`

export const svgPointList = (points: readonly ChartSvgPoint[]): string =>
  points.map(svgPoint).join(' ')

export const firstChartPoint = (points: readonly [ChartSvgPoint, ...ChartSvgPoint[]]): ChartSvgPoint =>
  firstArrayItem(points)

export const lastChartPoint = (points: readonly [ChartSvgPoint, ...ChartSvgPoint[]]): ChartSvgPoint =>
  lastArrayItem(points)

export const chartValueAxisLabel = (unitLabel: Maybe<string>): string =>
  matchMaybe<string, string>({
    Some: unit => `Value (${unit})`,
    None: () => 'Value',
  })(unitLabel)

export const toSvgPathMaybe = (candidate: string | null): Maybe<string> =>
  ifElse(
    (value: string | null): value is string => isNonEmptyString(value),
    value => some(String(value)),
    () => none(),
  )(candidate)
