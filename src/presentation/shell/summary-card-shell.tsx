import React from 'react'

type SummaryCardShellKind = 'inventory' | 'price' | 'system'

type SummaryCardShellProps = Readonly<{
  readonly kind: SummaryCardShellKind
  readonly title: string
  readonly value: string
  readonly note: string
}>

const summaryCardModifierByKind: Readonly<Record<SummaryCardShellKind, string>> = {
  inventory: 'oil-lint-shell__card--inventory',
  price: 'oil-lint-shell__card--price',
  system: 'oil-lint-shell__card--system',
}

export function SummaryCardShell({ kind, title, value, note }: SummaryCardShellProps) {
  return (
    <li className={`oil-lint-shell__card ${summaryCardModifierByKind[kind]}`}>
      <p className="oil-lint-shell__card-title">{title}</p>
      <p className="oil-lint-shell__card-value">{value}</p>
      <p className="oil-lint-shell__card-note">{note}</p>
    </li>
  )
}