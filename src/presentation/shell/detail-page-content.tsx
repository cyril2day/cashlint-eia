import React from 'react'

import { ChartPanel, defaultChartPanelControls } from '@/presentation/charts/components/chart-panel'
import type { DetailContentSectionViewModel, DetailPageViewModel, HomeNavigationCardViewModel } from '@/presentation/contracts'
import { DetailPageShell } from '@/presentation/shell/detail-page-shell'
import { DetailRowList } from '@/presentation/shell/detail-row-list'
import { SummaryCardShell } from '@/presentation/shell/summary-card-shell'
import { none } from '@/shared/maybe'

const introParagraph = (paragraph: string) => (
  <p key={paragraph} className="detail-page__intro-text">{paragraph}</p>
)

const contentParagraph = (paragraph: string) => (
  <p key={paragraph} className="detail-page__content-text">{paragraph}</p>
)

const contentSection = (section: DetailContentSectionViewModel) => (
  <section key={section.title} className="detail-page__content-section" aria-labelledby={`detail-section-${section.title}`}>
    <h2 className="detail-page__section-title" id={`detail-section-${section.title}`}>{section.title}</h2>
    <div className="detail-page__content-body">{section.body.map(contentParagraph)}</div>
    <DetailRowList rows={section.rows} />
  </section>
)

const navigationNudge = (card: HomeNavigationCardViewModel) => (
  <a key={card.href} className="oil-lint-shell__nav-card" href={card.href}>
    <span className="oil-lint-shell__nav-card-title">{card.title}</span>
    <span className="oil-lint-shell__nav-card-body">{card.body}</span>
    <span className="oil-lint-shell__nav-card-link">{card.linkLabel} &rarr;</span>
  </a>
)

export function DetailPageContent({ viewModel }: Readonly<{ readonly viewModel: DetailPageViewModel }>) {
  return (
    <DetailPageShell viewModel={viewModel}>
      <section className="detail-page__intro" aria-label="Page context">
        {viewModel.intro.map(introParagraph)}
      </section>
      <section className="detail-page__section" aria-label="Detail cards">
        <ul className="oil-lint-shell__card-grid">
          {viewModel.cards.map(card => <SummaryCardShell key={card.kind} {...card} chart={none()} />)}
        </ul>
      </section>
      <section className="detail-page__section" aria-label="Detail facts">
        <DetailRowList rows={viewModel.rows} />
      </section>
      <section className="detail-page__section" aria-label="Detail charts">
        <div className="chart-gallery__grid">
          {viewModel.charts.map(panel => <ChartPanel key={panel.id} viewModel={panel} controls={defaultChartPanelControls} />)}
        </div>
      </section>
      {viewModel.contentSections.map(contentSection)}
      <nav className="oil-lint-shell__nav-card-grid" aria-label="Related pages">
        {viewModel.navigationNudges.map(navigationNudge)}
      </nav>
    </DetailPageShell>
  )
}
