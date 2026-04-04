# GitHub Setup Guide for PercentDoseGraph

## Machine-to-Machine Web Development

This guide enables seamless development across multiple machines using GitHub as the central repository.

### Quick Start

1. **Create Repository on GitHub**
   ```bash
   # Visit https://github.com/new and create "percentdosegraph" repository
   # Choose: Public, MIT License, .gitignore (Node.js)
   ```

2. **Add Remote to Local Repository**
   ```bash
   cd /Users/readisten/Documents/percentdosegraph
   git remote add origin https://github.com/YOUR_USERNAME/percentdosegraph.git
   git branch -M main
   git push -u origin main
   ```

3. **Clone on Machine 2**
   ```bash
   git clone https://github.com/YOUR_USERNAME/percentdosegraph.git
   cd percentdosegraph
   npm install
   ```

### GitHub Features Enabled

#### 1. **Automated Deployment Pipeline**
- **GitHub Pages**: Static frontend auto-deploys to `YOUR_USERNAME.github.io/percentdosegraph`
- **API Artifact**: Node.js API builds available as downloadable artifacts
- **Trigger**: Automatic on `git push` to main branch

#### 2. **CI/CD Workflows** (`.github/workflows/`)
- `deploy.yml`: Builds frontend and API, deploys to GitHub Pages
- `test.yml`: Runs linting and builds on every push/PR

#### 3. **Environments & Secrets**
For the API server, configure secrets in GitHub:

Settings → Secrets and variables → Actions

```
JWT_SECRET: your-super-secret-jwt-key-change-this-in-production
GOOGLE_CLIENT_ID: (optional)
GOOGLE_CLIENT_SECRET: (optional)
DATABASE_URL: (optional for PostgreSQL)
```

Add to workflow:
```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
```

### Development Workflow

#### Machine 1 (Development)
```bash
# Make changes
npm run dev:full  # Start both API and frontend
git add .
git commit -m "feat: add new feature"
git push origin main
```

#### Machine 2 (Pulls Latest)
```bash
git pull origin main
npm install  # if dependencies changed
npm run dev:full
```

### Accessing Deployed App

After push to main:
1. **Frontend**: `https://YOUR_USERNAME.github.io/percentdosegraph`
2. **API**: Deploy via Actions to your own server, or use locally with:
   ```bash
   npm run dev:api  # Runs on http://localhost:3001
   ```

### API Server Deployment Options

#### Option A: Local Development (Current)
```bash
npm run dev:api      # Development mode with file persistence
npm run start        # Production (built dist/)
```

#### Option B: Docker Deployment
Create `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --omit=dev
RUN npm run build:api
EXPOSE 3001
CMD ["npm", "start"]
```

Deploy to:
- **Railway.app** (free tier)
- **Render.com** (free tier)
- **Heroku** (paid)
- **Fly.io** (free tier with billing)

#### Option C: Vercel (Recommended for Full-Stack)
```bash
npm i -g vercel
vercel --prod
```

### Shared Development Best Practices

#### Branch Strategy
```bash
# Feature development
git checkout -b feature/auth-improvements
npm run dev:full
# ... make changes ...
git push origin feature/auth-improvements

# Create PR on GitHub
# After review/approval, merge to main
```

#### Sync Between Machines
```bash
# Machine 2 before starting
git fetch origin
git pull origin main
npm install  # Always safe to re-run

# Machine 1 after other machine pushes
git pull origin main
npm install  # If package.json changed
```

### Account & Auth on GitHub

The authentication system is now integrated:

**Account System Features:**
- JWT-based authentication
- Bcrypt password hashing
- Optional Google OAuth SSO
- Account and profile management
- React and Static JS support

**Local Testing:**
1. Start API: `npm run dev:api`
2. Start Frontend: `npm run dev:web`
3. Register at `http://localhost:8080`
4. Profiles linked to accounts via accounts.json

### Troubleshooting

**Pages not deploying?**
- Check Actions tab for workflow errors
- Ensure `npm run build:all` completes successfully locally
- Verify `deploy/` folder has `index.html`

**API not accessible from frontend?**
- Ensure backend CORS allows frontend origin
- Check `API_BASE_PATH` in frontend code
- For production, update API endpoint to deployed URL

**Authentication issues?**
- Verify JWT_SECRET is set in `.env` (local) or GitHub Secrets (CI/CD)
- Check browser console for token storage errors
- Ensure auth endpoints respond with proper CORS headers

### Next Steps

1. **Create GitHub repository** with your username
2. **Push codebase** using remote setup above
3. **Configure Secrets** for JWT and OAuth (if using)
4. **Test workflow** by making a push to main
5. **Verify deployment** to GitHub Pages
6. **Clone on Machine 2** and start developing

---

**Repository Structure for GitHub:**
```
percentdosegraph/
├── artifacts/api-server/     # Node.js API server
├── frontend-react/           # React frontend (built)
├── frontend-static/          # Static HTML/JS frontend
├── lib/                       # Shared utilities
├── deploy/                    # GitHub Pages output
├── .github/workflows/         # CI/CD pipelines
├── package.json              # Root workspace config
└── README.md
```

All code is version-controlled and ready for collaborative machine-to-machine development!
