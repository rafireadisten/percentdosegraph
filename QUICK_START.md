# Quick Reference: GitHub Setup

## 3-Step GitHub Push

```bash
# Step 1: Create repo at https://github.com/new (name: percentdosegraph)
# Step 2: Add remote
git remote add origin https://github.com/YOUR_USERNAME/percentdosegraph.git
git branch -M main
git push -u origin main

# Step 3: Configure Secrets
# Settings → Secrets and variables → Actions
# Add: JWT_SECRET, GOOGLE_CLIENT_ID (optional), GOOGLE_CLIENT_SECRET (optional)
```

## Quick Commands Reference

### Local Development (Both Machines)
```bash
npm install              # First time
npm run dev:full        # Start API + Frontend
npm run dev:api        # API only
npm run dev:web        # Frontend only
```

### Sync Between Machines
```bash
# Machine A: After making changes
git add .
git commit -m "feat: description"
git push origin main

# Machine B: Before starting
git pull origin main
npm install  # if package.json changed
npm run dev:full
```

### With Docker
```bash
docker build -t pdg-api .
docker-compose up -d
# Frontend: http://localhost:8080
# API: http://localhost:3001/api
```

## File Locations

```
percentdosegraph/
├── .github/workflows/
│   ├── deploy.yml            ← Auto-deploy to GitHub Pages
│   ├── test.yml              ← CI testing
│   └── ci.yml                ← (existing)
├── artifacts/api-server/
│   ├── src/routes/auth.ts    ← Auth endpoints
│   ├── .env                  ← Local secrets (create)
│   └── Dockerfile            ← Docker config
├── frontend-react/           ← React app with auth
├── frontend-static/          ← Static HTML version
├── GITHUB_SETUP.md          ← Detailed setup guide
├── GITHUB_DEVOPS.md         ← Deployment platforms
├── GITHUB_INTEGRATION.md    ← Overview
├── DEPLOYMENT.md            ← Checklist
└── docker-compose.yml       ← Local full-stack
```

## Key Features

✅ **Authentication**: JWT + bcryptjs password hashing  
✅ **SSO Ready**: Google OAuth integration  
✅ **CI/CD**: Auto-deploy on every push  
✅ **Multi-Machine**: Git-synced development  
✅ **Containerized**: Docker support  
✅ **Documented**: 4 deployment guides included  

## Deployment Options (Pick One)

| Platform | Setup Time | Cost | Best For |
|----------|-----------|------|----------|
| GitHub Pages | 5 min | Free | Frontend (included) |
| Railway | 10 min | Free+ | Full-stack prototype |
| Render | 10 min | Free+ | Production API |
| Docker | 15 min | Server cost | Any infrastructure |
| Vercel | 5 min | Free+ | Serverless full-stack |

## Current Status

- ✅ Codebase: Ready to push
- ✅ Workflows: Configured
- ✅ Auth System: Complete
- ✅ Documentation: 4 guides
- ✅ Docker: Ready
- 🔧 GitHub: Awaiting username

## Next Step

**To activate:**
```bash
git remote add origin https://github.com/[YOUR_USERNAME]/percentdosegraph.git
git push -u origin main
```

Then check: `https://github.com/YOUR_USERNAME/percentdosegraph/actions`

---

**All code committed.** Ready for GitHub push! 🚀
