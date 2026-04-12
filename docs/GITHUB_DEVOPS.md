# GitHub API & Development Guide

## Remote Machine Access via GitHub

### Using GitHub Web Editor (Codespaces)

**Instant Cloud Development:**
```bash
# 1. on github.com, press . (period) to open web editor
# 2. Terminal automatically available
# 3. Run: npm install && npm run dev:full
# 4. Open ports panel → http://localhost:8080
```

### Using GitHub CLI for Remote Ops

**Install GitHub CLI:**
```bash
brew install gh  # macOS
```

**Clone & Setup:**
```bash
gh repo clone YOUR_USERNAME/percentdosegraph
cd percentdosegraph
npm install
```

**Push from any machine:**
```bash
git add .
git commit -m "feat: update auth system"
gh repo sync YOUR_USERNAME/percentdosegraph
git push
```

### Machine-to-Machine Sync

**Machine A (Initial Push):**
```bash
cd /Users/readisten/Documents/percentdosegraph
git remote add origin https://github.com/YOUR_USERNAME/percentdosegraph.git
git push -u origin main
```

**Machine B (Pull & Develop):**
```bash
git clone https://github.com/YOUR_USERNAME/percentdosegraph.git
cd percentdosegraph
npm install
npm run dev:full
```

**Keep Synced:**
```bash
# Before starting work
git pull origin main
npm install

# After making changes
git add .
git commit -m "feat: description"
git push origin main
```

### Deploying API Server

#### Option 1: Railway (Recommended)
```bash
npm install -g railway
railway login
railway init
railway add
railway up
```

#### Option 2: Render.com
1. Connect GitHub repo to Render dashboard
2. Create new Web Service
3. Build command: `npm run build:api`
4. Start command: `npm --workspace @workspace/api-server start`
5. Add environment variables in dashboard

#### Option 3: Docker to Any Server
```bash
docker build -t percentdosegraph-api .
docker run -p 3001:3001 \
  -e JWT_SECRET=your-secret \
  percentdosegraph-api
```

#### Option 4: AWS Lambda (Serverless)
```bash
# Use serverless framework
npm install -g serverless
serverless create --template aws-nodejs --path api
# Configure and deploy
```

### API Endpoints Available

**Auth:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token
- `POST /api/auth/logout` - Clear session
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/google/callback` - OAuth callback

**Accounts:**
- `GET /api/accounts` - List all
- `POST /api/accounts` - Create
- `GET /api/accounts/:id` - Fetch
- `PUT /api/accounts/:id` - Update
- `DELETE /api/accounts/:id` - Remove

**Profiles:**
- `GET /api/profiles` - List
- `POST /api/profiles` - Create
- `PUT /api/profiles/:id` - Update
- `DELETE /api/profiles/:id` - Delete

**Doses:**
- `GET /api/doses` - List dose events
- `POST /api/doses` - Log dose
- `DELETE /api/doses/:id` - Remove

### Frontend URLs

**Local Development:**
- React: `http://localhost:8080`
- Static: `http://localhost:8080/frontend-static/`
- API: `http://localhost:3001/api`

**GitHub Pages (After Deploy):**
- Frontend: `https://YOUR_USERNAME.github.io/percentdosegraph/`
- Requires API deployed separately

### Environment Variables

**Local (.env files):**
```
# artifacts/api-server/.env
JWT_SECRET=dev-secret-key
GOOGLE_CLIENT_ID=your-google-key
GOOGLE_CLIENT_SECRET=your-google-secret
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

**GitHub Actions (Secrets):**
```
Settings → Secrets and variables → Actions
+ New repository secret:
  JWT_SECRET
  GOOGLE_CLIENT_ID (optional)
  GOOGLE_CLIENT_SECRET (optional)
```

### Workflow: Multi-Machine Development

**Time: 8:00 AM - Machine A (Home)**
```bash
cd ~/Documents/percentdosegraph
git pull origin main
npm run dev:full
# Make changes to auth system
git add .
git commit -m "feat: improve login UX"
git push origin main
```

**Time: 2:00 PM - Machine B (Office)**
```bash
cd ~/projects/percentdosegraph
git pull origin main
npm install  # if deps changed
npm run dev:full
# See changes from Machine A
# Continue development
```

**Time: 5:00 PM - Sync Back**
```bash
# On Machine B
git add .
git commit -m "fix: auth token refresh"
git push origin main

# Later on Machine A
git pull origin main
npm install
# Continue with latest code
```

### Continuous Integration Status

Check: `https://github.com/YOUR_USERNAME/percentdosegraph/actions`

**Workflow Triggers:**
- Push to main → Deploy to GitHub Pages
- Push to main → Build API artifact
- PR to main → Run tests

**View Logs:**
```bash
gh run view -R YOUR_USERNAME/percentdosegraph
gh run logs [RUN_ID] -R YOUR_USERNAME/percentdosegraph
```

### Security Best Practices

1. **Never commit secrets:**
   ```bash
   # .env files in .gitignore
   echo ".env" >> .gitignore
   git add .gitignore
   git commit -m "chore: ensure secrets not tracked"
   ```

2. **Use GitHub Secrets** for all API keys

3. **Enable branch protection** (Settings → Branches)
   - Require PR reviews before merge
   - Require status checks to pass

4. **Auto-lock old PRs** to prevent accidental merges

### Debugging Remote Development

**Issue: Frontend can't reach API**
```bash
# Check API_BASE_PATH in app.js
# For GitHub Pages, update to deployed API URL
# Or use relative path /api (with reverse proxy)
```

**Issue: Database not persisting**
```bash
# File-based: Check accounts.json and profiles.json writable
# PostgreSQL: Ensure DATABASE_URL set in Secrets
```

**Issue: GitHub Pages 404**
```bash
# Verify deploy/ folder has index.html
# Check GitHub Pages settings: Settings → Pages
# Source should be gh-pages branch (auto-created by workflow)
```

---

Ready for distributed development across any machines via GitHub! 🚀
