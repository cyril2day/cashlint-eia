import { foundationPillars } from '@/app/foundation'
export default function HomePage() {
  return (
    <main className="app-shell">
      <div className="app-shell__backdrop" aria-hidden="true" />
      <section className="app-shell__card" aria-labelledby="foundation-title">
        <p className="app-shell__eyebrow">Phase 1 foundation</p>
        <h1 className="app-shell__title" id="foundation-title">
          Oil Lint is scaffolded and ready for the next task.
        </h1>
        <p className="app-shell__lede">
          This route stays intentionally thin. It exists only to prove the application shell,
          Pristine Styles package, and stylesheet foundation are wired together.
        </p>

        <section className="app-shell__panel" aria-labelledby="foundation-stack-title">
          <div className="app-shell__panel-header">
            <h2 className="app-shell__panel-title" id="foundation-stack-title">
              Foundation stack
            </h2>
            <span className="app-shell__panel-badge">Placeholder route</span>
          </div>

          <ul className="app-shell__pillars">
            {foundationPillars.map((pillar) => (
              <li key={pillar} className="app-shell__pillar">
                {pillar}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  )
}