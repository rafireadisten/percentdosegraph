# GitHub Machine-to-Machine Development Setup

## Complete Codebase Replication Guide

Your PercentDoseGraph codebase is now fully configured for distributed development across multiple machines via GitHub.

## What's Been Set Up

### Authentication System ✅
- JWT-based login/register with bcrypt password hashing
- Optional Google OAuth integration
- Account and profile management linked to user accounts
- Token persistence and session validation

### CI/CD Pipeline ✅
- **GitHub Actions workflows** automatically:
  - Build and deploy React frontend to GitHub Pages
  - Save API build artifacts for deployment
  - Run tests and linting on all commits
  - Support PR reviews before main merge

### Deployment Options ✅
- **GitHub Pages**: Frontend auto-deploys (free)
- **Railway/Render**: API deployment (free tier available)
- **Docker**: Containerized deployment anywhere
- **Vercel**: Full-stack deployment
- **AWS Lambda**: Serverless option

### Multi-Machine Workflow ✅
- Git-based synchronization
- Workspaces support for monorepo
- Environment configuration for different machines
- Docker Compose for local full-stack development

## Getting Started

### Step 1: Create GitHub Repository
```bash
# Visit https://github.com/new
# Create "percentdosegraph" repository
# Choose: Public, MIT License
```

### Step 2: Push Current Codebase
```bash
cd /Users/readisten/Documents/percentdosegraph
git remote add origin https://github.com/YOUR_USERNAME/percentdosegraph.git
git branch -M main
git push -u origin main
```

### Step 3: Configure GitHub Secrets
```
Settings → Secrets and variables → Actions
+ New repository secret:
  JWT_SECRET = (generate a strong key)
  GOOGLE_CLIENT_ID = (optional)
  GOOGLE_CLIENT_SECRET = (optional)
```

### Step 4: Enable GitHub Pages
```
Settings → Pages
Source: Deploy from a branch
Branch: gh-pages (auto-created by workflow)
```

### Step 5: Clone on Machine 2
```bash
git clone https://github.com/YOUR_USERNAME/percentdosegraph.git
cd percentdosegraph
npm install
npm run dev:full
```

## File Reference

| File | Purpose | Status |
|------|---------|--------|
| `.github/workflows/deploy.yml` | Auto-deploy to GitHub Pages | ✅ Created |
| `.github/workflows/test.yml` | Run tests on all commits | ✅ Created |
| `Dockerfile` | Containerize API server | ✅ Created |
| `docker-compose.yml` | Local full-stack development | ✅ Created |
| `docs/GITHUB_SETUP.md` | Detailed setup instructions | ✅ Created |
| `docs/GITHUB_DEVOPS.md` | Deployment platform guides | ✅ Created |
| `docs/DEPLOYMENT.md` | Production checklist | ✅ Created |
| `artifacts/api-server/.env` | Local secrets (not tracked) | 🔧 Create locally |

## Daily Workflow

### Morning - Machine A (Start Development)
```bash
cd ~/Documents/percentdosegraph
git pull origin main
npm install  # if dependencies changed
npm run dev:full
# Start work...
```

### Afternoon - Machine B (Pull Latest)
```bash
cd ~/projects/percentdosegraph
git pull origin main
npm install
npm run dev:full
# See Machine A's changes automatically
```

### End of Day - Push Changes
```bash
git add .
git commit -m "feat: description of changes"
git push origin main
# Workflow auto-triggers → builds and deploys
```

## Access Points

### Local Development
- React: `http://localhost:8080`
- Static: `http://localhost:8080/../frontend-static/`
- API: `http://localhost:3001/api`

### GitHub Interface
- Repository: `https://github.com/YOUR_USERNAME/percentdosegraph`
- Actions: `https://github.com/YOUR_USERNAME/percentdosegraph/actions`
- Pages: `https://YOUR_USERNAME.github.io/percentdosegraph`

### Deployed API (Choose One)
- Railway: Follow `docs/GITHUB_DEVOPS.md` 
- Render: Follow `docs/GITHUB_DEVOPS.md`
- Your own server: Use Docker image

## Important Files Already Committed

```
✅ Authentication system (JWT + bcryptjs)
✅ React frontend with auth page
✅ Static HTML/JS version
✅ API routes for auth, accounts, profiles, doses
✅ Database schema with accounts
✅ Build scripts and npm workspaces
✅ GitHub Actions workflows
✅ Docker configuration
✅ Documentation
```

## Next Actions

1. **Create GitHub repo** with your username
2. **Add remote and push**: 
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/percentdosegraph.git
   git push -u origin main
   ```
3. **Configure GitHub Secrets** (Settings → Secrets)
4. **Watch Actions tab** after first push (auto-deploys on success)
5. **Clone on machine 2**: `git clone https://github.com/YOUR_USERNAME/percentdosegraph.git`
6. **Deploy API** to Railway/Render (instructions in `docs/GITHUB_DEVOPS.md`)

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         GitHub Repository                │
│  (Source of truth for all machines)      │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
┌─────────┐ ┌────────┐ ┌──────────────┐
│Machine A│ │Machine B│ │GitHub Actions│
│ (Dev)   │ │ (Dev)  │ │  (CI/CD)     │
└─────────┘ └────────┘ └──────────────┘
     │         │         │
     └─────────┼─────────┘
               │
     ┌─────────┴──────────────┐
     ▼                        ▼
┌──────────────┐      ┌──────────────────┐
│Github Pages  │      │ API Deployment   │
│ (Frontend)   │      │(Railway/Render)  │
└──────────────┘      └──────────────────┘
```

## Security Checklist

- ✅ `.env` in `.gitignore` (secrets never tracked)
- ✅ GitHub Secrets used for API configuration
- ✅ JWT_SECRET must be 32+ characters
- ✅ OAuth credentials stored as Secrets
- ✅ Database credentials as Secrets
- ✅ API CORS configured for allowed origins
- ✅ Password hashing with bcrypt (12 rounds)

## Troubleshooting

**"git remote add" fails?**
```bash
git remote remove origin  # Clear existing
git remote add origin https://github.com/YOUR_USERNAME/percentdosegraph.git
```

**API not deploying?**
- Check Actions tab for workflow errors
- Verify `npm run build:api` works locally
- Ensure secrets are set in GitHub

**Frontend shows 404 after deployment?**
- Check GitHub Pages settings (Settings → Pages)
- Verify `deploy/index.html` exists after build
- Ensure workflows completed successfully

**Can't pull on Machine 2?**
```bash
git config pull.rebase false  # Use merge strategy
git pull origin main
```

---

**Status:** ✅ Codebase ready for GitHub deployment and multi-machine development

**Repository configured with:**
- Full authentication system
- CI/CD automation  
- Multiple deployment options
- Cross-machine synchronization
- Production-ready structure

Push to GitHub and start collaborative development! 🚀
