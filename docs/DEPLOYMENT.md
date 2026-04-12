# Deployment Guide

## Quickstart Deployment Options

Choose one based on your infrastructure needs:

### 1. GitHub Pages + Local API (Easiest)
```bash
npm run build:deploy
git push origin main
# Frontend auto-deploys to GitHub Pages
# Run API locally: npm run dev:api
```

### 2. Railway (Easiest Full Deploy)
```bash
# Frontend deploys to GitHub Pages automatically
# API deploys to Railway via this guide:

npm install -g railway
railway login
cd artifacts/api-server
railway init
railway add  # Select Node.js
railway up
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

## Environment Setup

### GitHub Secrets (for CI/CD)
1. Go to repo Settings → Secrets and variables → Actions
2. Add these secrets:
   - `JWT_SECRET` - Your JWT signing key
   - `GOOGLE_CLIENT_ID` - (optional) Google OAuth ID
   - `GOOGLE_CLIENT_SECRET` - (optional) Google OAuth secret

### Local .env Files
Create `artifacts/api-server/.env`:
```
JWT_SECRET=your-super-secret-key-here
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
- [ ] Domain/URL for frontend configured
- [ ] CORS settings match frontend domain
- [ ] JWT secret is strong (32+ characters)
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
