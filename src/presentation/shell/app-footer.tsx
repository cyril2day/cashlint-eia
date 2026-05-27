import React, { type ReactElement } from 'react'

const githubRepositoryUrl = 'https://github.com/cyril2day/cashlint-eia'
const eiaUrl = 'https://www.eia.gov/'

export function AppFooter(): ReactElement {
  return (
    <footer className="app-footer">
      <p className="app-footer__copy">Oil Lint</p>
      <p className="app-footer__product">
        Uses public data from the <a className="app-footer__link" href={eiaUrl} target="_blank" rel="noreferrer">U.S. Energy Information Administration</a>.
        Oil Lint is not affiliated with or endorsed by EIA.
      </p>
      <a className="app-footer__link" href={githubRepositoryUrl} target="_blank" rel="noreferrer">
        psi 
      </a>
    </footer>
  )
}
