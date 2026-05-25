import React, { type ReactElement } from 'react'

import { GithubIcon } from '@/presentation/icons'

export function RepositoryLink({
  href,
}: Readonly<{
  readonly href: string
}>): ReactElement {
  return (
    <a
      className="app-nav__icon-button app-nav__github-link"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Open GitHub repository"
    >
      <GithubIcon />
    </a>
  )
}
