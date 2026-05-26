import type { AreaChartMarkerViewModel, AreaChartPointViewModel, AreaChartViewModel } from '@/presentation/charts/contracts'
import type { AreaChartWidgetInput, AreaChartWidgetMarker, AreaChartWidgetPoint } from '@/presentation/charts/widgets/area-chart/area-chart-widget'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'

const toAreaChartWidgetPoint = (point: AreaChartPointViewModel): readonly AreaChartWidgetPoint[] =>
  matchMaybe<number, readonly AreaChartWidgetPoint[]>({
    Some: value => [{
      x: point.x,
      y: value,
      xLabel: point.reportWeekIso,
    }],
    None: () => [],
  })(point.y)

const toAreaChartWidgetMarker = (marker: AreaChartMarkerViewModel): AreaChartWidgetMarker => ({
  x: marker.x,
  y: marker.y,
  label: marker.label,
})

const currentMarker = (
  marker: Maybe<AreaChartMarkerViewModel>,
): Maybe<AreaChartWidgetMarker> =>
  matchMaybe<AreaChartMarkerViewModel, Maybe<AreaChartWidgetMarker>>({
    Some: value => some(toAreaChartWidgetMarker(value)),
    None: none,
  })(marker)

export const mapAreaChartViewModelToWidgetInput = (
  viewModel: AreaChartViewModel,
): AreaChartWidgetInput => ({
  points: viewModel.points.flatMap(toAreaChartWidgetPoint),
  baseline: viewModel.baseline,
  currentMarker: currentMarker(viewModel.currentMarker),
  referenceMarkers: viewModel.referenceMarkers.map(toAreaChartWidgetMarker),
  accessibilitySummary: viewModel.accessibilitySummary,
})
