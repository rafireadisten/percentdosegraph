# DoseGraph

Compare and see medication doses over time.

## Why DoseGraph Exists

Imagine being tasked with reviewing 20 years of a patient's medication dosing history spread across roughly 100 pages of printed records, with only 72 hours to produce a usable result. Under those constraints, the task quickly proves impractical and goes unfinished.

This isn't just a hypothetical example of system inefficiency. It's something I have personally experienced.

In 2026, I was finally able to revisit the problem with a new advantage: AI tools that made it possible to begin building a viable computerized graphing solution.

DoseGraph's main job is simple: show each drug dose as a percent of that drug's maximum dose over time. This lets you clearly compare different drugs, or compare the same drug at different times.

## What DoseGraph Does

- captures the core clinical context: patient, medication, dose unit, and max dose
- lets you add dated dose events and defined dose segments
- shows each drug as `% of max dose` over time
- supports multiple timeframe views from `1d` through `10y` plus custom ranges
- lets you save and load medication profiles
- supports local and backend-backed account/profile workflows

## Features

- **Dose Graphing**: Compare medications or compare one medication across time
- **Profile Limits By Account Type**: `5` patient, `20` clinician, unlimited developer
- **Drug Library**: Built-in medication list including inhaled drugs and combination inhalers
- **Editing Workflow**: Update doses from the form workflow and from graph-linked detail panels
- **Data Tools**: Import/export options moved behind advanced actions for a cleaner UI

## Core Files

```
percentdosegraph/
├── index.html                 # Landing page
├── about.html                 # Origin story and product context
├── accounts.html              # Account tiers and profile-management overview
├── frontend-static/           # Static DoseGraph experience
├── frontend-react/            # Dynamic React web app
├── script.js                  # Main static-app logic
├── styles.css                 # Shared styling
├── drug-library.json          # Local medication reference library
└── data/                      # Local sample/reference data
```

## Quick Start

```bash
npm install
npm run dev:web
npm run dev:api
```

Then open the local app in your browser.

For a simple static-only check, you can also open `index.html` directly in a modern browser.

## Backend Persistence

The API server supports two persistence modes:

- `file` mode: default fallback using `data/drugs.json`, `data/doses.json`, and `profiles.json`
- `database` mode: enabled when `DATABASE_URL` is set

When `DATABASE_URL` is present, the API now:

- creates the required `drugs`, `doses`, and `profiles` tables automatically on boot
- seeds the database one time from the existing JSON files when the tables are empty
- exposes the current persistence mode at `GET /api/health`

Useful commands:

```bash
npm run dev:api
npm run db:init
```

Optional environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `PERSISTENCE_SEED_ON_BOOT=false`: skip one-time JSON seeding during startup

### Backend Accounts And Profiles

Medication profiles can now belong to persisted backend accounts.

Core endpoints:

- `GET /api/accounts`
- `POST /api/accounts`
- `GET /api/accounts/:id`
- `PUT /api/accounts/:id`
- `DELETE /api/accounts/:id`
- `GET /api/accounts/:id/profiles`
- `POST /api/accounts/:id/profiles`
- `GET /api/profiles?accountId=:id`

For backward compatibility, `POST /api/profiles` still works and will attach the profile to the default backend account when no `accountId` is provided.

## Data Export/Import

- **Export JSON**: Complete backup of settings and dose events
- **Export CSV**: Filtered dose data for the current route
- **Import JSON**: Restore from exported backup files
- **Profiles**: Save/load named medication configurations

## Important note

The bundled `drug-library.json` is a starter reference library for inference and display. It is not a validated clinical formulary and should remain clinician-adjustable.

## Mobile App Development

A React Native mobile app skeleton is ready for rapid development. It shares the same backend API and business logic as the web app.

### Quick Start

```bash
# Setup mobile development environment
npm run dev:mobile:ios          # Start iOS simulator
npm run dev:mobile:android      # Start Android emulator
npm run dev:mobile              # Interactive mode (choose platform)
```

### Mobile Architecture

```
mobile/
├── app/                  # React Native Expo app (START HERE)
│   ├── src/
│   │   ├── screens/     # UI screens
│   │   ├── hooks/       # Data fetching hooks
│   │   └── components/  # Reusable UI components
├── shared/              # Shared code with web app
│   ├── api/            # API client + validation
│   └── store/          # State management (Zustand)
└── ARCHITECTURE.md     # Full development guide
```

### Key Features

- **Shared Backend**: Uses the same API as web app
- **Offline Support**: Local data persists when offline
- **Automatic Sync**: Profiles and doses sync when reconnected
- **No Code Duplication**: Business logic lives in `shared/`
- **Rapid Development**: Clone screens, add hooks, deploy

### Integration Points

For rapid development, add features here:

1. **New Screen**: `mobile/app/src/screens/MyScreen.tsx`
2. **Data Hook**: `mobile/app/src/hooks/useMyData.ts`
3. **API Method**: `mobile/shared/api/apiClient.ts`
4. **Global State**: `mobile/shared/store/index.ts`

See [mobile/INTEGRATION_POINTS.md](mobile/INTEGRATION_POINTS.md) for detailed plug points and patterns.

### Build for Production

```bash
npm run build:mobile:production  # Build iOS + Android
```

Requires EAS (Expo Application Services) account. See [mobile/ARCHITECTURE.md](mobile/ARCHITECTURE.md) for details.
