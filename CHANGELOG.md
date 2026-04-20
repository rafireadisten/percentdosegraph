# Changelog

All notable project changes should be recorded in this file.

## 2026-04-20

<!-- MARKER: PDG-RHEUM-ORAL-2026-04-20 -->
### `feat: add top oral rheumatology drugs with multilingual alias coverage`
- <!-- MARKER: PDG-RHEUM-DB-DATA-2026-04-20 --> Added five oral rheumatology medications to `data/drugs.json`: Methotrexate, Hydroxychloroquine, Leflunomide, Sulfasalazine, and Tofacitinib.
- <!-- MARKER: PDG-RHEUM-DB-REF-2026-04-20 --> Added matching PO reference entries to `drug-library.json` for max-dose inference and static library suggestion workflows.
- <!-- MARKER: PDG-RHEUM-ALIASES-2026-04-20 --> Included English generic/brand fields and Romanian alias mappings (`roAliases`) for each added rheumatology medication.

<!-- MARKER: PDG-CHANGESET-2026-04-20 -->
### `feat: expand multilingual drug matching and retain active graph interactions`
- <!-- MARKER: PDG-RO-ALIASES-2026-04-20 --> Added Romanian brand/generic alias coverage to both reference and catalog drug datasets using `roAliases` so Romanian medication names resolve to the same normalized drug match as existing English aliases.
- <!-- MARKER: PDG-STATIC-MATCH-2026-04-20 --> Updated static app inference and suggestion logic to include `roAliases` in match scoring and alias graph expansion.
- <!-- MARKER: PDG-GRAPH-INTERACTION-2026-04-20 --> Retained the in-progress React graph click-selection interaction updates and related bundle refresh in the current workspace snapshot.
- <!-- MARKER: PDG-LOCAL-SAMPLE-DATA-2026-04-20 --> Retained current local sample dose timeline updates in `data/doses.json` for the active working state.

## 2026-04-14

### `feat: publish deployment workflows and improve continuous dose graphing`
- Added a dedicated GitHub Pages publishing workflow and a Railway API deployment workflow so the web frontend and backend can be deployed from GitHub Actions.
- Updated deployment packaging and docs, including the `deploy/` output, Pages SPA fallback, and production API secret naming (`AUTH_SECRET`).
- Changed dose timeline logic so entries without an explicit end date continue at the same dose until the next same-medication dose change, or through the current anchor date when no later change exists.
- Updated the max daily dose editor to use free-form numeric text with commit-on-blur or Enter, avoiding forced `0.1` step behavior during manual edits.
- Rebuilt the React bundle and deploy artifacts after the deployment and graphing updates.

## 2026-04-12

### `feat: add plot-line hover definitions to both graph modes`
- Added hover definitions to the React Recharts comparison chart so hovering a plotted line shows the drug, dose normalization context, and active time frame window.
- Added matching hover definitions to the static canvas chart with line hit-testing and an overlay card for the same plot-line metadata.
- Rebuilt the React bundle and verified the frontend tests plus static script syntax checks after the chart hover changes.

### `feat: persist and restore the last workspace` (`1a17c69`)
- Added automatic workspace save and restore for the static frontend so the most recent graph state returns on reload.
- Added full last-workspace snapshot persistence for the React frontend, including graph inputs and restored timeline state.
- Verified the restored graph flow against the browser-local `rafi@readisten.com` storage path and local web/API startup.

### `data: refresh local runtime samples after graph restore retest`
- Updated the file-backed local dose samples to match the latest retest state.
- Kept the seeded local profile metadata aligned with the current persistence flow.

## 2026-04-05

### `feat: update core app and api flows` (`d904658`)
- Expanded the core frontend and static app flows.
- Updated API routes, auth, persistence, and profile-related server logic.
- Refreshed shared data and schema files used across the app.

### `test: add project tooling and coverage setup` (`acdbe1b`)
- Added ESLint, Prettier, Jest, Vitest, Storybook, and Lighthouse project config.
- Added frontend and API test coverage scaffolding plus Jest setup helpers.
- Updated package tooling and scripts to support linting, formatting, and test runs.
