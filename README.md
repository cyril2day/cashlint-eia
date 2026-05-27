# cashlint-eia

A web application for reading the U.S. petroleum market through weekly EIA data.

cashlint-eia requests live crude oil observations from the U.S. Energy Information Administration, transforms them through a structured domain model, and produces a weekly market verdict: the current condition of the U.S. crude balance, expressed as a condition label, a confidence level, and a plain-language narrative with headline, summary, and full explanation.

The current weekly read covers U.S. crude inventories, WTI spot price, refinery activity, domestic production, imports, and exports. It is intentionally scoped: the story told here is the U.S. weekly crude balance, not all petroleum conditions.

---

## The Data

cashlint-eia connects to the **EIA Open Data API v2**, under the petroleum tree.

The EIA publishes weekly petroleum statistics every Wednesday as part of its [Petroleum Status Report](https://www.eia.gov/petroleum/supply/weekly/). These are the same figures professional analysts, traders, and policy researchers watch. The app requests a recent window of weekly rows for each series and uses the most recent row as the current week.

### Series consumed

| Signal | EIA Endpoint | Series |
|---|---|---|
| U.S. crude stocks | `/v2/petroleum/stoc/wstk/data/` | `WCRSTUS1` |
| WTI spot price | `/v2/petroleum/pri/spt/data/` | `RWTC` |
| Refinery net input | `/v2/petroleum/pnp/wiup/data/` | `WCRRIUS2` |
| Refinery gross input | `/v2/petroleum/pnp/wiup/data/` | `WGIRIUS2` |
| Refinery operable capacity | `/v2/petroleum/pnp/wiup/data/` | `WOCLEUS2` |
| Refinery utilization | `/v2/petroleum/pnp/wiup/data/` | `WPULEUS3` |
| Domestic production | `/v2/petroleum/sum/sndw/data/` | `WCRFPUS2` |
| Crude imports | `/v2/petroleum/sum/sndw/data/` | `WCRIMUS2` |
| Crude exports | `/v2/petroleum/sum/sndw/data/` | `WCREXUS2` |

Inventory values are in thousand barrels (MBBL). Flow measures are in thousand barrels per day (MBBL/D). WTI is in USD per barrel.

---

## Method of Analysis

The weekly read is built in three steps.

### 1. Physical balance

The app computes a simplified crude balance from the current week's measurements:

```
net imports        = imports - exports
available supply   = domestic production + net imports
supply pressure    = available supply - refinery net input
inventory change   = current crude stocks - previous crude stocks
```

Inventory change is classified as `StockBuild`, `StockDraw`, or `StockFlat`. Supply pressure is classified as `SurplusPressure`, `TightnessPressure`, or `NeutralPressure`. Together, they produce a balance state:

| Inventory movement | Supply pressure | Balance state |
|---|---|---|
| `StockDraw` | `TightnessPressure` | `Tightening` |
| `StockBuild` | `SurplusPressure` | `Loosening` |
| `StockFlat` | `NeutralPressure` | `Balanced` |
| Any other combination | | `Mixed` |

### 2. Signal contextualization

The inventory and WTI series are each contextualized against recent history. The app computes a one-week trend direction (`Up`, `Down`, or `Flat`) for each signal and detects whether the current value is anomalous relative to the historical window. Caveats from this step propagate forward into the final analysis.

### 3. Analysis composition

The balance state and the signal directions are combined into a final `WeeklyAnalysis`. Signal alignment is classified first:

| Inventory trend | WTI trend | Alignment |
|---|---|---|
| `Down` | `Up` | `AlignedTightening` |
| `Up` | `Down` | `AlignedLoosening` |
| Mixed directions | | `Mixed` |
| Flat or missing | | `Insufficient` |

The condition, confidence, and narrative are then derived from the alignment and the balance state. Supporting signals are those whose trend direction agrees with the condition. Contradictory signals are those that cut against it.

The narrative is composed from named policy phrases and is validated to exclude forbidden language before it is accepted. Every step that can fail returns a `Result` value rather than throwing, so the composition pipeline is honest about what it could not compute.

**An honest caveat the app makes explicit:** the balance equation compares a weekly stock level change with daily-rate flow measures. It covers the U.S. crude picture only. It excludes product inventories, the Strategic Petroleum Reserve, Cushing-specific stocks, regional detail, futures curve structure, and all non-EIA market context. The verdict is a directional weekly heuristic, not a complete accounting identity.

---

## Architecture

The application is organized in three layers with strictly inward dependencies:

```
Infrastructure (EIA API adapter)
        ↓
Domain Core (bounded contexts)
        ↓
Presentation (view models + React components)
```

### Bounded contexts

**`measurement`** defines the physical vocabulary of petroleum data. `MeasurementKind`, `MeasurementUnit`, `GeographyScope`, `ReportWeek`, `InventoryMeasurement`, `PriceMeasurement`, `RefinerySet`, `SupplySet`, and `WeeklyPetroleumFacts` all live here. This context knows only about data that can be weighed and measured. It has no knowledge of analysis.

**`interpretation`** takes a `WeeklyPetroleumFacts` record and produces contextualized signals. Each signal carries a trend direction, a baseline comparison, an anomaly state, and a set of interpretation caveats. This is where a raw stock level becomes a directional market signal.

**`analysis`** reads the contextualized signal set and the system balance result, then composes the full weekly analytical narrative. It classifies signal alignment, assigns `AnalysisCondition` and `AnalysisConfidence`, collects and deduplicates caveats from all upstream sources, and assembles the `WeeklyAnalysis` with its condition label, headline, summary, explanation, supporting signals, contradictory signals, key drivers, and trace.

**`system-balance`** holds the supply and demand balance logic. It computes available supply, refinery demand, net imports, and inventory change, and classifies each into the balance-state taxonomy described above.

### Anti-Corruption Layer

All raw EIA rows pass through the `eia-ingestion-acl` before any domain type is created. The ACL is the trust boundary. It translates raw JSON into validated `BoundaryDto` values, rejects structurally invalid rows with typed `BoundaryError` values, and normalizes field-name variation across EIA response shapes. No domain context ever handles raw strings or nullable API fields. Everything past the gate is already proven to be structurally sound.

### Infrastructure

The EIA HTTP adapter is built on Node's native `http` and `https` modules. It handles:

- Configurable timeouts with abort signal propagation
- Automatic retry for transient failures and rate limit responses (429, 5xx)
- Structured, typed log events with sanitized URLs (API keys are never logged)
- Correlation ID support for tracing individual requests
- Full `Result`-typed responses at every level

### Functional core

cashlint-eia treats errors as values throughout. Every operation that can fail returns a `Result<SuccessValue, FailureValue>`:

```ts
type Result<S, F> =
  | { readonly ok: true;  readonly value: S }
  | { readonly ok: false; readonly error: F }
```

Workflows are assembled as sequential `bindResult` pipelines. A failure at any step short-circuits the rest of the chain. No exceptions cross any boundary. Absence is modeled with `Maybe<T>` rather than optional fields, null checks, or non-null assertions. All domain values are created through smart constructors with symbol brands, so the type system enforces that values can only exist if they were properly validated.

All branching in production code is expressed through Ramda combinators (`ifElse`, `cond`, `when`, `unless`, `both`, `either`, `allPass`, `anyPass`) rather than `if/else`, ternaries, or logical operators.

---

## Project structure

```
src/
├── app/                        # Next.js pages and composition roots
├── application/                # Application ports (EiaClient interface)
├── contexts/
│   ├── measurement/            # Physical domain vocabulary
│   ├── interpretation/         # Signal contextualization
│   ├── analysis/               # Weekly analytical narrative
│   ├── system-balance/         # Supply/demand balance analysis
│   └── acl/
│       └── eia-ingestion-acl/  # Trust boundary + EIA translators
├── infrastructure/
│   └── eia/                    # EIA HTTP adapter
├── presentation/
│   ├── contracts/              # ViewModel type definitions
│   ├── mappers/                # Domain to ViewModel transformations
│   ├── shell/                  # React page and panel components
│   ├── charts/                 # Chart components + geometry computation
│   ├── formatting-policies/    # Number and date formatting
│   └── display-policies/       # Display state logic
└── shared/
    ├── result/                 # Result<S, F> type and combinators
    ├── maybe/                  # Maybe<T> type and combinators
    ├── async-result/           # AsyncResult type
    ├── fp/                     # Ramda re-exports
    ├── domain/                 # Branded type helpers
    ├── decimal/                # Decimal type abstraction
    ├── date/                   # date-fns wrappers
    ├── collection/             # Collection utilities
    ├── object/                 # Object utilities
    └── chart-svg/              # SVG chart geometry primitives
```

---

## Charts

All charts in cashlint-eia are live. They render from the same `WeeklyPetroleumFacts` records returned by the EIA requests, so every data point, trend line, and historical band reflects real values from real weekly releases.

The chart gallery spans seven types:

- **Time-series** for inventory and WTI trends over the request window
- **Area charts** for supply and refinery components
- **Sparklines** for inline metric summaries on the home page
- **Metric cards** with integrated trend context
- **Histogram** for distribution of weekly observations
- **Box plot** for spread and percentile context
- **Variance chart** for measuring week-over-week change

The chart geometry is computed in TypeScript using D3 scale and path primitives, then rendered as SVG. Each chart responds to the actual shape of the data: scale domains, annotation positions, and statistical bands all adjust to what the EIA returned for the requested period. Nothing is hardcoded or illustrative.

---

## Getting started

**Prerequisites:** Node.js 20+, pnpm 10+, and a free EIA API key.
Register at [https://www.eia.gov/opendata/](https://www.eia.gov/opendata/).

```bash
# Clone the repository
git clone https://github.com/your-org/cashlint-eia.git
cd cashlint-eia

# Install dependencies
pnpm install

# Set your EIA API key
echo "EIA_API_KEY=your_key_here" > .env.local

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm build       # Production build
pnpm start       # Start the production server
pnpm typecheck   # TypeScript check
pnpm test        # Run the Vitest test suite
```

---

## FAQ

**Where does the data come from?**
All data comes from the U.S. Energy Information Administration. The EIA is a statistical agency of the U.S. Department of Energy. Its petroleum data is free, public, and updated weekly. See [https://www.eia.gov/petroleum/](https://www.eia.gov/petroleum/).

**How fresh is the data?**
The EIA publishes its Weekly Petroleum Status Report every Wednesday at approximately 10:30 a.m. Eastern Time. The app requests from the EIA API at page load time, so the data reflects whatever the EIA has published as of that moment.

**What does the condition label mean?**
The condition (`Tightening`, `Loosening`, `Balanced`, `Mixed`, or `Insufficient`) is the app's classification of the current weekly crude balance. It is derived from the alignment between the physical balance equation and the inventory and WTI signal directions. It is a directional heuristic, not a complete market forecast.

**Why does the app only cover crude oil?**
The current data ingestion is scoped to U.S. crude: inventories, WTI price, refinery inputs, and crude supply components. Product stocks, the Strategic Petroleum Reserve, Cushing-specific inventory, and other petroleum products are not yet included. The intent is to expand the scope incrementally through the same ingestion architecture.

**What series identifiers does the app use?**
The primary identifiers are `WCRSTUS1` (crude stocks), `RWTC` (WTI spot), `WCRRIUS2` (refinery net input), `WCRFPUS2` (domestic production), `WCRIMUS2` (imports), and `WCREXUS2` (exports). All are weekly frequency series under the EIA v2 petroleum endpoints. The full EIA series catalog is at [https://www.eia.gov/opendata/browser/petroleum](https://www.eia.gov/opendata/browser/petroleum).

**Can I explore the raw EIA data myself?**
Yes. The EIA Open Data browser at [https://www.eia.gov/opendata/browser/](https://www.eia.gov/opendata/browser/) lets you inspect any series, query it interactively, and read the API documentation. The petroleum subtree is at [https://www.eia.gov/opendata/browser/petroleum](https://www.eia.gov/opendata/browser/petroleum). API documentation is at [https://www.eia.gov/opendata/documentation.php](https://www.eia.gov/opendata/documentation.php).

**Is the balance calculation a full physical accounting?**
No. The balance equation mixes a weekly stock level change with daily-rate flow measures, and it covers U.S. crude only. The app is explicit about this through its caveat system. The read is a simplified directional heuristic.

---

## Built with

| | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styles | [Sass](https://sass-lang.com/) + [Pristine Styles](https://github.com/cyril2day/pristine-styles) |
| FP utilities | [Ramda](https://ramdajs.com/) |
| Charts | [D3](https://d3js.org/) |
| Date handling | [date-fns](https://date-fns.org/) |
| Testing | [Vitest](https://vitest.dev/) |
| Package manager | [pnpm](https://pnpm.io/) |

---

## License

MIT

Copyright (c) 2026 psi &lt;cy.lonsido@gmail.com&gt;
