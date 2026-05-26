import type { SparklinePointViewModel, SparklineViewModel } from '@/presentation/charts/contracts'
import type { SparklineWidgetInput, SparklineWidgetPoint } from '@/presentation/charts/widgets/sparkline/sparkline-widget'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'

const toSparklineWidgetPoint = (point: SparklinePointViewModel): SparklineWidgetPoint => ({
  x: point.x,
  y: point.y,
})

const currentPoint = (point: Maybe<SparklinePointViewModel>): Maybe<SparklineWidgetPoint> =>
  matchMaybe<SparklinePointViewModel, Maybe<SparklineWidgetPoint>>({
    Some: value => some(toSparklineWidgetPoint(value)),
    None: none,
  })(point)

export const mapSparklineViewModelToWidgetInput = (
  viewModel: SparklineViewModel,
): SparklineWidgetInput => ({
  label: viewModel.label,
  points: viewModel.points.map(toSparklineWidgetPoint),
  currentPoint: currentPoint(viewModel.currentPoint),
  accessibilitySummary: viewModel.accessibilitySummary,
})
