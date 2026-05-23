import { OilLintPresentationShell } from '@/presentation'
import { oilLintPresentationViewModel } from '@/presentation/shell/oil-lint-presentation-view-model'

export default function HomePage() {
  return <OilLintPresentationShell viewModel={oilLintPresentationViewModel} />
}