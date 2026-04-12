# Changelog

All notable project changes should be recorded in this file.

## 2026-04-12

### `feat: persist and restore the last workspace`
- Added automatic workspace save and restore for the static frontend so the most recent graph state returns on reload.
- Added full last-workspace snapshot persistence for the React frontend, including graph inputs and restored timeline state.
- Verified the restored graph flow against the browser-local `rafi@readisten.com` storage path and local web/API startup.

## 2026-04-05

### `feat: update core app and api flows` (`d904658`)
- Expanded the core frontend and static app flows.
- Updated API routes, auth, persistence, and profile-related server logic.
- Refreshed shared data and schema files used across the app.

### `test: add project tooling and coverage setup` (`acdbe1b`)
- Added ESLint, Prettier, Jest, Vitest, Storybook, and Lighthouse project config.
- Added frontend and API test coverage scaffolding plus Jest setup helpers.
- Updated package tooling and scripts to support linting, formatting, and test runs.
