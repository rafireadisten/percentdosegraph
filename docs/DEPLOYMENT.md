# Deployment Guide

## Quickstart Deployment Options

Choose one based on your infrastructure needs:

### 1. GitHub Pages + Local API (Easiest)
```bash
npm run build:deploy
git push origin main
# Web frontend auto-deploys to GitHub Pages via .github/workflows/deploy.yml
# Run API locally: npm run dev:api
```

### 2. Railway (Easiest Full Deploy)
```bash
# Frontend deploys to GitHub Pages automatically
# API deploys to Railway from GitHub Actions via .github/workflows/railway-api.yml
```

### 3. Docker + Any Server
```bash
docker build -t pdg-api .
docker run -p 3001:3001 \
  -e JWT_SECRET=your-key \
  -e NODE_ENV=production \
  pdg-api
```

### 4. Vercel Full-Stack
```bash
npm install -g vercel
vercel --prod
# Handles both frontend and serverless API
```

## GitHub Pages Workflow

The web app now publishes through the GitHub Actions Pages workflow in
`.github/workflows/deploy.yml`.

### One-time GitHub Pages setup
1. Open the repository on GitHub.
2. Go to `Settings -> Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to `main`, or run the `Deploy Web To GitHub Pages` workflow manually.

### What the workflow does
1. Runs `npm ci`
2. Runs `npm run build:deploy`
3. Uploads the generated `deploy/` folder
4. Publishes it to GitHub Pages

### Live URL
The default Pages URL should be:

`https://rafireadisten.github.io/percentdosegraph`

## Railway API Workflow

The API now deploys through the GitHub Actions workflow in
`.github/workflows/railway-api.yml`.

### One-time Railway setup
1. Create a Railway project and service connected to this repository.
2. Point the Railway service at the repo root so it uses the root `Dockerfile`.
3. In GitHub, open `Settings -> Secrets and variables -> Actions`.
4. Add these repository secrets:
   - `RAILWAY_TOKEN`
   - `RAILWAY_SERVICE_ID`

### Recommended Railway environment variables
Set these in the Railway service:
- `AUTH_SECRET`
- `PORT`
- `DATABASE_URL` if using Postgres instead of file persistence
- `OPENFDA_API_KEY` optional
- `LOG_LEVEL` optional
- `PERSISTENCE_SEED_ON_BOOT=false` for production if you do not want seed data

### What the workflow does
1. Runs `npm ci`
2. Runs `npm run build:api`
3. Installs the Railway CLI
4. Runs `railway up --service "$RAILWAY_SERVICE_ID" --detach`

### API health check after deploy
```bash
curl https://YOUR-RAILWAY-DOMAIN/api/health
```

## Environment Setup

### GitHub Secrets (for CI/CD)
1. Go to repo Settings → Secrets and variables → Actions
2. Add these secrets:
   - `AUTH_SECRET` - Your JWT signing key for runtime platforms that inject env from GitHub
   - `RAILWAY_TOKEN` - Railway deploy token for GitHub Actions
   - `RAILWAY_SERVICE_ID` - Railway service identifier for the API service
   - `GOOGLE_CLIENT_ID` - (optional) Google OAuth ID
   - `GOOGLE_CLIENT_SECRET` - (optional) Google OAuth secret

### Local .env Files
Create `artifacts/api-server/.env`:
```
AUTH_SECRET=your-super-secret-key-here
NODE_ENV=development
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Deployment Checklist

- [ ] All code committed to GitHub
- [ ] Secrets configured in GitHub or deployment platform
- [ ] Database URL set (if using PostgreSQL)
- [ ] API builds successfully locally
- [ ] Frontend builds to `deploy/` folder
- [ ] GitHub Actions workflows enabled
- [ ] GitHub Pages source is set to `GitHub Actions`
- [ ] Domain/URL for frontend configured
- [ ] CORS settings match frontend domain
- [ ] AUTH secret is strong (32+ characters)
- [ ] Google OAuth credentials valid (if using SSO)

## Post-Deployment

### Test API
```bash
curl -X POST http://your-api-domain/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

### Monitor Health
```bash
curl http://your-api-domain/api/health
```

## Rollback Plan

If deployment fails:
```bash
# GitHub Pages automatically keeps previous deploy
git revert [commit-hash]
git push origin main

# API can rollback to previous Railway/Render version
# via dashboard, or redeploy previous image
```
