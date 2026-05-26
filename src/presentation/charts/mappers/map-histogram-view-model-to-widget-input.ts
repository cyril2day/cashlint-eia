import type { HistogramMarkerViewModel, HistogramViewModel } from '@/presentation/charts/contracts'
import type { HistogramWidgetInput, HistogramWidgetMarker } from '@/presentation/charts/widgets/histogram/histogram-widget'
import { matchMaybe } from '@/shared/maybe'

const toHistogramWidgetMarker = (marker: HistogramMarkerViewModel): HistogramWidgetMarker => ({
  value: marker.value,
  label: marker.label,
})

const currentMarker = (viewModel: HistogramViewModel): readonly HistogramWidgetMarker[] =>
  matchMaybe<HistogramMarkerViewModel, readonly HistogramWidgetMarker[]>({
    Some: marker => [toHistogramWidgetMarker(marker)],
    None: () => [],
  })(viewModel.currentMarker)

export const mapHistogramViewModelToWidgetInput = (
  viewModel: HistogramViewModel,
): HistogramWidgetInput => ({
  values: viewModel.values.map(value => value.value),
  binStrategy: viewModel.binStrategy,
  markers: [
    ...viewModel.referenceMarkers.map(toHistogramWidgetMarker),
    ...currentMarker(viewModel),
  ],
  accessibilitySummary: viewModel.accessibilitySummary,
})
