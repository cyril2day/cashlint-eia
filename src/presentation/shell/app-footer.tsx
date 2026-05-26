import React, { type ReactElement } from 'react'

const githubRepositoryUrl = 'https://github.com/cyril2day/cashlint-eia'

export function AppFooter(): ReactElement {
  return (
    <footer className="app-footer">
      <p className="app-footer__copy">Oil Lint</p>
      <p className="app-footer__product">Data sourced from U.S. Energy Information Administration</p>
      <a className="app-footer__link" href={githubRepositoryUrl} target="_blank" rel="noreferrer">
        psi 
      </a>
    </footer>
  )
}
