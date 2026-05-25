import React, { type ReactElement } from 'react'

export function CloseIcon(): ReactElement {
  return (
    <svg className="app-nav__icon app-nav__icon--close" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}
