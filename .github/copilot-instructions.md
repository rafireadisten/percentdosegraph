# Project Guidelines

## Code Style

Follow ESLint and Prettier configurations. See [.eslintrc.json](.eslintrc.json) and [.prettierrc.json](.prettierrc.json) for rules. Use single quotes, semicolons, 2-space indentation.

## Architecture

Monorepo with npm workspaces: React frontend in [frontend-react/](frontend-react/), Node.js API in [artifacts/api-server/](artifacts/api-server/), shared libraries in [lib/](lib/). Supports dual persistence: JSON files or PostgreSQL via Drizzle ORM.

## Build and Test

- Install: `npm install`
- Dev: `npm run dev:full` (API + frontend)
- Build: `npm run build:all`
- Test: `npm test` (Jest, 70% coverage required)
- Lint: `npm run lint`

## Conventions

- API routes in [artifacts/api-server/src/routes/](artifacts/api-server/src/routes/), registered in routes/index.ts
- Use Passport for auth, Pino for logging
- Frontend: React hooks, constants in UPPERCASE
- Environment variables: JWT_SECRET required (32+ chars), DATABASE_URL for PostgreSQL
- Prioritize accuracy and safety in clinical dosing features

See [README.md](README.md) for overview, [TESTING.md](TESTING.md) for testing details, [DEPLOYMENT.md](DEPLOYMENT.md) for deployment.</content>
<parameter name="filePath">/Users/readisten/Documents/percentdosegraph/.github/copilot-instructions.md