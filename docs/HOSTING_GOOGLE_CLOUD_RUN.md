# Deploy Backend to Google Cloud Run (FREE)

## Why Google Cloud Run?

- **Cost:** FREE tier includes 2 million requests/month
- **Auto-scaling:** Handles 0 to 1000s of requests automatically
- **No cold starts:** Fast startup (ready in ~500ms)
- **Pay per use:** After free tier, only ~$0.00002 per request
- **Memory efficient:** Your app uses only what it needs
- **Always updated:** Just `git push`, Cloud Run handles builds

---

## Estimated Monthly Costs

| Traffic Level | Requests/mo | Free Tier? | Estimated Cost |
|---------------|------------|-----------|-----------------|
| Light (user testing) | 5,000 | ✅ YES | $0 |
| Medium (10-50 users) | 50,000 | ✅ YES | $0 |
| Heavy (100-500 users) | 500,000 | ✅ YES | $0 |
| Very Heavy (1000+ users) | 2,000,000+ | ✅ Part of it | $0-50 |

**Bottom line:** For normal clinical use, you'll never leave the free tier.

---

## Prerequisites

- Google account (create at google.com if needed)
- Google Cloud CLI installed
- Dockerfile in repo (you have one!)
- Docker Hub account optional (for image building)

---

## Step 1: Set Up Google Cloud Project

### 1.1 Create Google Cloud Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with Google account
3. If first time, accept terms and complete setup

### 1.2 Create a New Project

1. Click project dropdown (top left)
2. Click **NEW PROJECT**
3. Enter name: `percentdosegraph`
4. Click **CREATE**
5. Wait for creation (1 minute)
6. Select new project from dropdown

### 1.3 Enable Required APIs

1. Search for "Cloud Run API" in search bar
2. Click **ENABLE**
3. Search for "Cloud Build API"
4. Click **ENABLE**
5. Search for "Artifact Registry API"
6. Click **ENABLE**

---

## Step 2: Install Google Cloud CLI

### macOS

```bash
# Install using Homebrew
brew install google-cloud-sdk

# Initialize
gcloud init

# When prompted:
# 1. Create new configuration: Press Y
# 2. Choose your Google Cloud project
# 3. Set default region: us-central1
```

### Linux

```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### Verify Installation

```bash
gcloud --version
# Should show: Google Cloud SDK X.XX.X
```

---

## Step 3: Authenticate

```bash
# Login to Google Cloud
gcloud auth login

# Browser opens, sign in with your Google account
# Grant permissions when asked
# Returns to terminal when complete

# Verify authentication
gcloud auth list
# Should show your email with ACTIVE status
```

---

## Step 4: Configure Your Project

```bash
# Set project ID
gcloud config set project percentdosegraph

# Set default region (closest to users, or us-central1)
gcloud config set run/region us-central1

# Verify config
gcloud config list
```

---

## Step 5: Set Environment Variables

Before deployment, create `.env.production` with secrets:

```bash
# In your repository root
cat > .env.production << EOF
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
AUTH_SECRET=$(openssl rand -base64 32)
PORT=3001
LOG_LEVEL=info
EOF

# DO NOT commit this file!
# Add to .gitignore if not already there
echo ".env.production" >> .gitignore
git add .gitignore
git commit -m "Ensure .env.production in gitignore"
```

---

## Step 6: Deploy to Cloud Run

### Simple Deploy (Recommended)

From your project root:

```bash
gcloud run deploy pdg-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --allow-unauthenticated \
  --update-env-vars JWT_SECRET=$(grep JWT_SECRET .env.production | cut -d= -f2),AUTH_SECRET=$(grep AUTH_SECRET .env.production | cut -d= -f2),NODE_ENV=production

# When asked about using Dockerfile, press Y
# When asked to enable API, press Y
# Deployment starts!
```

**What this does:**
- Builds Docker image from your Dockerfile
- Deploys to Cloud Run
- Sets environment variables securely
- Allows public access (unauthenticated)
- Assigns you a public URL

### Watch Deployment Progress

```bash
# In terminal, you'll see:
# Building Dockerfile...
# Pushing image...
# Deploying to Cloud Run...
# Waiting for deployment...

# When complete, you get:
# Service [pdg-api] revision [pdg-api-00001-abc] 
# has been successfully deployed and is serving traffic at:
# https://pdg-api-xxxxx.run.app
```

**Your backend URL:** Copy the `https://pdg-api-xxxxx.run.app` URL

---

## Step 7: Verify Deployment

### Test Health Endpoint

```bash
# Replace with your actual URL from deployment
BACKEND_URL="https://pdg-api-xxxxx.run.app"

# Test health check
curl $BACKEND_URL/api/health

# Should return JSON like:
# {"status":"ok","uptime":123,"memory":...}
```

### Test Authentication

```bash
# Get auth token
curl -X POST $BACKEND_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Should return JWT token if user created successfully
```

### View Live Logs

```bash
# Stream logs in real-time
gcloud run logs read pdg-api --limit 50 --follow

# Or see logs in UI
# https://console.cloud.google.com/run?project=percentdosegraph
```

---

## Step 8: Update Frontend to Use New Backend

Edit [frontend-react/app.js](../frontend-react/app.js):

Find this line (around line 15):
```javascript
const API_BASE_URL = 'http://localhost:3001';
```

Replace with your Cloud Run URL:
```javascript
const API_BASE_URL = 'https://pdg-api-xxxxx.run.app';
```

Rebuild and redeploy frontend:
```bash
npm run build:deploy
git add .
git commit -m "Update backend API URL for Cloud Run"
git push origin main

# If using Cloudflare Pages, it auto-redeploys
# Check Cloudflare dashboard for new deployment
```

---

## Step 9: Test End-to-End

1. Open frontend in browser: `https://percentdosegraph.pages.dev`
2. Create a patient account
3. Add a medication
4. Enter a dose
5. Check that data persists
6. View logs to confirm API calls:

```bash
gcloud run logs read pdg-api --limit 20
```

---

## Monitoring & Management

### View Service Details

```bash
gcloud run services describe pdg-api

# Shows:
# - Service URL
# - Latest revision
# - Memory info
# - Scaling settings
```

### View Recent Deployments

```bash
gcloud run revisions list --service pdg-api --region us-central1

# Shows all previous versions
# Can rollback to any revision if needed
```

### View Costs

```bash
# In Google Cloud Console:
# 1. Go to Billing (left sidebar)
# 2. See current month usage
# 3. Set budget alerts (optional)
```

### Access Cloud Run Dashboard

```
https://console.cloud.google.com/run?project=percentdosegraph
```

Features:
- Live logs
- Metrics (requests, latency, errors)
- Deployments
- Settings
- Environment variables

---

## Troubleshooting

### Deployment Fails

**Check build logs:**
```bash
gcloud run deploy ... (command)

# Scroll up in terminal to see error
# Usually: missing npm script, Docker issue, or syntax error

# View full build logs:
gcloud builds log <BUILD_ID> --stream
```

**Common fixes:**
```bash
# Verify Dockerfile exists
ls Dockerfile

# Verify build script works locally
npm run build:api

# Check for syntax errors
npm run lint

# Test Docker image locally
docker build -t test .
docker run test npm start
```

### API Returns 502 Bad Gateway

```bash
# Check logs
gcloud run logs read pdg-api --limit 50

# Look for startup errors
# Usually: PORT not set correctly, missing dependencies

# Verify Dockerfile sets PORT
grep "PORT" Dockerfile

# Redeploy with explicit PORT
gcloud run deploy pdg-api \
  --set-env-vars PORT=3001
```

### Can't Connect from Frontend

**Check CORS:**
```bash
# Test from browser console
curl -H "Origin: https://percentdosegraph.pages.dev" \
  https://pdg-api-xxxxx.run.app/api/health
```

**If CORS error:**
1. Likely CORS not configured in Node app
2. Check [artifacts/api-server/src/app.ts](../artifacts/api-server/src/app.ts) for CORS middleware
3. Verify frontend API_BASE_URL matches exactly

---

## Cost Management

### Set Budget Alerts

1. Google Cloud Console → Billing
2. Click **Budgets and alerts**
3. Click **CREATE BUDGET**
4. Set limit: $10/month (or your preference)
5. Set alert threshold: 50%, 90%, 100%
6. Get email notifications if approaching limit

### View Detailed Costs

```bash
gcloud billing accounts list

# See current month charges
gcloud billing accounts describe YOUR_ACCOUNT_ID
```

### Estimate Costs

For typical PDG usage:

```
2 million requests/month free tier
= ~2,740 requests per day
= ~114 requests per hour
```

At 100 active users checking doses: **FREE**
At 1000+ active users: **~$0-20/month**

---

## Redeploy Process

Every time you update your code:

```bash
# Make changes
nano artifacts/api-server/src/routes/health.ts

# Commit
git add .
git commit -m "Update API endpoint"

# Redeploy
gcloud run deploy pdg-api \
  --source . \
  --platform managed \
  --region us-central1

# New revision deployed automatically
# Old revision still available for rollback
```

---

## Rollback to Previous Version

If deployment breaks something:

```bash
# List all revisions
gcloud run revisions list --service pdg-api --region us-central1

# Get the previous good revision ID
# Then route 100% traffic to it
gcloud run traffic-split pdg-api \
  --to-revisions GOOD_REVISION_ID=100 \
  --region us-central1
```

---

## Advanced: CI/CD with GitHub Actions

Optional: Auto-deploy on every push to main

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to Cloud Run

on:
  push:
    branches:
      - main
    paths:
      - 'artifacts/api-server/**'
      - 'lib/**'
      - 'Dockerfile'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: percentdosegraph
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy pdg-api \
            --source . \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated
```

Then:
1. Create service account with Cloud Run Deploy role
2. Export JSON key
3. Add as GitHub Secret: `GCP_SA_KEY`
4. Push to main → auto-deploys!

---

## Key Commands Reference

```bash
# Deploy
gcloud run deploy pdg-api --source .

# View logs
gcloud run logs read pdg-api --follow

# Describe service
gcloud run services describe pdg-api

# List revisions
gcloud run revisions list --service pdg-api

# Delete service (caution!)
gcloud run services delete pdg-api

# View in browser
gcloud run services describe pdg-api --format="value(status.url)"
```

---

## Summary

| Step | Time | Status |
|------|------|--------|
| Create GCP project | 5 min | ✅ |
| Install Cloud SDK | 5 min | ✅ |
| Configure auth | 5 min | ✅ |
| Deploy to Cloud Run | 5 min | ✅ |
| Test endpoint | 5 min | ✅ |
| Connect frontend | 10 min | ✅ |
| **Total** | **35 min** | ✅ Complete! |

---

## Cost Summary

| Item | Price |
|------|-------|
| Cloud Run (free tier) | $0 |
| First 2M requests/mo | Included |
| After free tier per req | $0.00002 |
| Managed database (not used) | N/A |
| **Your monthly cost** | **$0** |

---

## Support & Documentation

- Cloud Run docs: https://cloud.google.com/run/docs
- Pricing details: https://cloud.google.com/run/pricing
- Support: https://cloud.google.com/support
- Quotas: https://cloud.google.com/run/quotas
