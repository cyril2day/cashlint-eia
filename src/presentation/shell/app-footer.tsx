import React, { type ReactElement } from 'react'

const githubRepositoryUrl = 'https://github.com/cyril2day/cashlint-eia'

export function AppFooter(): ReactElement {
  return (
    <footer className="app-footer">
      <p className="app-footer__copy">Copyright psi</p>
      <p className="app-footer__product">Oil LInt</p>
      <a className="app-footer__link" href={githubRepositoryUrl} target="_blank" rel="noreferrer">
        GitHub
      </a>
    </footer>
  )
}
