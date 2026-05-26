import React from 'react'

export type ChartErrorMessageViewModel = Readonly<{
  readonly title: string
  readonly message: string
}>

export function ChartErrorMessage({ error }: Readonly<{ readonly error: ChartErrorMessageViewModel }>) {
  return (
    <div className="chart-error-message" role="note">
      <strong>{error.title}</strong>
      <span>{error.message}</span>
    </div>
  )
}
