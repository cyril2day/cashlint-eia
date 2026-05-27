import React from 'react'
import type { CSSProperties, ReactElement } from 'react'

import type { HomeMetricChartKind, HomeMetricChartPointViewModel } from '@/presentation/contracts'
import { formatDecimalCoordinate, formatDecimalCssPercent } from '@/shared/decimal'
import { cond } from '@/shared/fp'
import { matchMaybe } from '@/shared/maybe'

const chartValues = (points: readonly HomeMetricChartPointViewModel[]): readonly number[] =>
  points.map(point => point.value)

const secondaryValue = (point: HomeMetricChartPointViewModel): number =>
  matchMaybe<number, number>({
    Some: value => value,
    None: () => 0,
  })(point.secondaryValue)

const stackedTotalValue = (point: HomeMetricChartPointViewModel): number =>
  point.value + secondaryValue(point)

const stackedValues = (points: readonly HomeMetricChartPointViewModel[]): readonly number[] =>
  points.map(stackedTotalValue)

const minimumValue = (values: readonly number[]): number =>
  Math.min(...values)

const maximumValue = (values: readonly number[]): number =>
  Math.max(...values)

const absoluteMaximumValue = (values: readonly number[]): number =>
  Math.max(1, ...values.map(Math.abs))

const valueRange = (values: readonly number[]): number =>
  maximumValue(values) - minimumValue(values)

const safeRange = (values: readonly number[]): number =>
  cond<[number], number>([
    [range => range === 0, () => 1],
    [() => true, range => range],
  ])(valueRange(values))

const classWhenCurrent = (baseClassName: string) => (point: HomeMetricChartPointViewModel): string =>
  cond<[HomeMetricChartPointViewModel], string>([
    [candidate => candidate.isCurrent, () => `${baseClassName} ${baseClassName}--current`],
    [() => true, () => baseClassName],
  ])(point)

const heightStyle = (height: number): CSSProperties => ({
  height: formatDecimalCssPercent(height),
})

const barHeightFromValues =
  (values: readonly number[]) =>
  (point: HomeMetricChartPointViewModel): number =>
    18 + (((point.value - minimumValue(values)) / safeRange(values)) * 72)

const varianceHeight =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (value: number): number =>
    10 + ((Math.abs(value) / absoluteMaximumValue(chartValues(points))) * 86)

const positiveVarianceHeight =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (point: HomeMetricChartPointViewModel): number =>
    cond<[HomeMetricChartPointViewModel], number>([
      [candidate => candidate.value > 0, candidate => varianceHeight(points)(candidate.value)],
      [() => true, () => 0],
    ])(point)

const negativeVarianceHeight =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (point: HomeMetricChartPointViewModel): number =>
    cond<[HomeMetricChartPointViewModel], number>([
      [candidate => candidate.value < 0, candidate => varianceHeight(points)(candidate.value)],
      [() => true, () => 0],
    ])(point)

const renderVariancePoint =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (point: HomeMetricChartPointViewModel): ReactElement => (
    <span key={point.label} className={classWhenCurrent('home-metric-chart__variance-point')(point)}>
      <span className="home-metric-chart__variance-cell home-metric-chart__variance-cell--positive">
        <span
          className="home-metric-chart__variance-bar home-metric-chart__variance-bar--positive"
          style={heightStyle(positiveVarianceHeight(points)(point))}
        />
      </span>
      <span className="home-metric-chart__variance-cell home-metric-chart__variance-cell--negative">
        <span
          className="home-metric-chart__variance-bar home-metric-chart__variance-bar--negative"
          style={heightStyle(negativeVarianceHeight(points)(point))}
        />
      </span>
    </span>
  )

const renderVarianceBars = (points: readonly HomeMetricChartPointViewModel[]): ReactElement => (
  <div className="home-metric-chart__plot home-metric-chart__plot--variance">
    {points.map(renderVariancePoint(points))}
  </div>
)

const chartX =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (_point: HomeMetricChartPointViewModel, index: number): number =>
    4 + ((112 * index) / Math.max(1, points.length - 1))

const lineY =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (point: HomeMetricChartPointViewModel): number =>
    66 - (((point.value - minimumValue(chartValues(points))) / safeRange(chartValues(points))) * 54)

const coordinate =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (valueSelector: (point: HomeMetricChartPointViewModel) => number) =>
  (point: HomeMetricChartPointViewModel, index: number): string =>
    `${formatDecimalCoordinate(chartX(points)(point, index))},${formatDecimalCoordinate(valueSelector(point))}`

const lineCoordinate =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (point: HomeMetricChartPointViewModel, index: number): string =>
    coordinate(points)(lineY(points))(point, index)

const linePoints = (points: readonly HomeMetricChartPointViewModel[]): string =>
  points.map(lineCoordinate(points)).join(' ')

const renderSparklineLine = (points: readonly HomeMetricChartPointViewModel[]): ReactElement => (
  <div className="home-metric-chart__plot home-metric-chart__plot--sparkline">
    <svg className="home-metric-chart__svg" viewBox="0 0 120 72" aria-hidden="true" focusable="false">
      <polyline className="home-metric-chart__sparkline" points={linePoints(points)} />
    </svg>
  </div>
)

const stackedMaximum = (points: readonly HomeMetricChartPointViewModel[]): number =>
  Math.max(1, maximumValue(stackedValues(points)))

const stackedY =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (value: number): number =>
    66 - ((value / stackedMaximum(points)) * 58)

const stackedCoordinate =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (valueSelector: (point: HomeMetricChartPointViewModel) => number) =>
  (point: HomeMetricChartPointViewModel, index: number): string =>
    coordinate(points)(pointValue => stackedY(points)(valueSelector(pointValue)))(point, index)

const productionValue = (point: HomeMetricChartPointViewModel): number =>
  point.value

const stackedProductionCoordinates = (points: readonly HomeMetricChartPointViewModel[]): readonly string[] =>
  points.map(stackedCoordinate(points)(productionValue))

const stackedTotalCoordinates = (points: readonly HomeMetricChartPointViewModel[]): readonly string[] =>
  points.map(stackedCoordinate(points)(stackedTotalValue))

const reverseStrings = (values: readonly string[]): readonly string[] =>
  [...values].reverse()

const productionPolygonPoints = (points: readonly HomeMetricChartPointViewModel[]): string =>
  `${stackedProductionCoordinates(points).join(' ')} 116,66 4,66`

const importPolygonPoints = (points: readonly HomeMetricChartPointViewModel[]): string =>
  `${stackedTotalCoordinates(points).join(' ')} ${reverseStrings(stackedProductionCoordinates(points)).join(' ')}`

const renderStackedArea = (points: readonly HomeMetricChartPointViewModel[]): ReactElement => (
  <div className="home-metric-chart__plot home-metric-chart__plot--stacked">
    <svg className="home-metric-chart__svg" viewBox="0 0 120 72" aria-hidden="true" focusable="false">
      <polygon className="home-metric-chart__area home-metric-chart__area--production" points={productionPolygonPoints(points)} />
      <polygon className="home-metric-chart__area home-metric-chart__area--imports" points={importPolygonPoints(points)} />
      <polyline className="home-metric-chart__area-line" points={stackedTotalCoordinates(points).join(' ')} />
    </svg>
  </div>
)

const renderBarPoint =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (point: HomeMetricChartPointViewModel): ReactElement => (
    <span key={point.label} className={classWhenCurrent('home-metric-chart__bar-point')(point)}>
      <span
        className="home-metric-chart__bar"
        style={heightStyle(barHeightFromValues(chartValues(points))(point))}
      />
    </span>
  )

const renderBarSequence = (points: readonly HomeMetricChartPointViewModel[]): ReactElement => (
  <div className="home-metric-chart__plot home-metric-chart__plot--bars">
    {points.map(renderBarPoint(points))}
  </div>
)

export const renderHomeMetricChart =
  (points: readonly HomeMetricChartPointViewModel[]) =>
  (kind: HomeMetricChartKind): ReactElement =>
    cond<[HomeMetricChartKind], ReactElement>([
      [candidate => candidate === 'VarianceBars', () => renderVarianceBars(points)],
      [candidate => candidate === 'SparklineLine', () => renderSparklineLine(points)],
      [candidate => candidate === 'StackedArea', () => renderStackedArea(points)],
      [() => true, () => renderBarSequence(points)],
    ])(kind)
