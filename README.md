# PercentDoseGraph

PercentDoseGraph is a lightweight browser app for clinicians and pharmacists who want to review medication dosing as a percentage of a patient-specific maximum dose over different time windows.

## GitHub Repository Assets

This repository includes several files configured for GitHub hosting:
- **`.github/`** - GitHub-specific configuration (workflows, issue templates, PR templates)
- **`LICENSE`** - MIT open source license
- **`CONTRIBUTING.md`** - Developer contribution guidelines
- **`SECURITY.md`** - Security policy and vulnerability reporting
- **`deploy/`** - Deployment-ready folder for web hosting services
- **`.gitignore`, `.gitattributes`, `.npmrc`** - Git and npm configuration

These are only relevant if pushing to GitHub. For local development of the application itself, focus on the core files listed below.

## What this first version does

- captures the core clinical context: patient, medication, dose unit, and max dose
- lets you add dated dose events
- summarizes exposure across 1 day, 1 week, 1 year, 2 years, 3 years, 5 years, or 10 years
- visualizes average dose as `% of max`
- highlights higher-risk periods with an 80% reference line

## Features

- **Expanded Drug Library**: 35+ medications with clinical dosing guidelines
- **Data Management**: Import/export JSON, export CSV, clear all data
- **Medication Profiles**: Save and load named medication snapshots
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Inference**: Auto-suggests max doses from built-in library

## File Structure

```
percentdosegraph/
├── index.html          # Main application interface
├── script.js           # Application logic and chart rendering
├── styles.css          # Styling and responsive design
├── drug-library.json   # Expanded medication reference library
├── profiles.json       # Saved medication profiles
└── data/               # Sample data files
    ├── doses.json      # Sample dose events
    └── drugs.json      # Alternative drug format
```

## Quick Start

1. Open `index.html` in a modern web browser
2. The app loads with sample data for demonstration
3. Configure patient and medication settings
4. Add dose events using the form
5. View trends in the chart panel
6. Save profiles for different patients/medications

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

## Replit Integration

This app incorporates resources and features from an advanced Replit-generated version, including:

- Expanded drug library with 25+ additional medications
- Profile management system
- Enhanced data persistence concepts
- Improved UI patterns and responsive design

## Important note

The bundled `drug-library.json` is a starter reference library for inference and display. It is not a validated clinical formulary and should remain clinician-adjustable.

## Good next steps

- add CSV upload for MAR or dispensing history
- support multiple medications and route conversions
- store data locally with IndexedDB or in a backend service
- add patient-level guardrails such as renal adjustment, weight-based caps, or cumulative exposure alerts
- export charts and summary reports for documentation

## Recent enhancements

- Added data export functionality (JSON and CSV formats)
- Added data import from JSON files
- Added clear all data button for resetting the application
- Integrated expanded drug library from Replit resources
- Added medication profiles for saving/loading configurations
