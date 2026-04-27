# Cost-Effective Hosting Quick Start Guide

## TL;DR - Launch PDG for FREE in 60 Minutes

**Total cost:** $0/month (plus $12/year domain)

```
Frontend:  GitHub Pages (dosegraph.io)  → FREE
Backend:   Google Cloud Run             → FREE  
Database:  JSON + Git backup            → FREE
Domain:    Namecheap                    → $12/year
──────────────────────────────────────────────────
TOTAL: $1/month

Alternative: Use Cloudflare Pages instead (also FREE)
```

---

## 🚀 60-Minute Launch Plan

### Minute 0-5: Pre-Flight Check

```bash
cd ~/Documents/percentdosegraph

# Verify build works
npm run build:deploy
npm run build:api

# Check Docker
docker --version
```

### Minute 5-15: Frontend to Cloudflare Pages (or GitHub Pages)

#### Option A: Cloudflare Pages (Fastest)

1. Go to [cloudflare.com](https://cloudflare.com) → Sign up (FREE)
2. Click **Pages** → **Create a Project**
3. Connect GitHub → Select `percentdosegraph`
4. Build settings:
   - Command: `npm run build:deploy`
   - Output: `deploy`
5. Click **Deploy**
6. Get your URL: `https://percentdosegraph.pages.dev`

#### Option B: GitHub Pages + dosegraph.io (Already Set Up!)

Since GitHub Pages is already configured in your repo:

1. Register `dosegraph.io` on Namecheap ($12/year)
2. In GitHub → Repository Settings → **Pages**
3. Enter custom domain: `dosegraph.io`
4. Add CNAME record in Namecheap pointing to: `rafireadisten.github.io`
5. Wait 5 minutes for DNS propagation
6. Get your URL: `https://dosegraph.io`

**GitHub Pages advantages:**
- Already configured (no new signup)
- Works immediately
- Auto-deploys on `git push`
- Professional domain with same workflow

**See:** [HOSTING_GITHUB_PAGES_CUSTOM_DOMAIN.md](./HOSTING_GITHUB_PAGES_CUSTOM_DOMAIN.md) for detailed setup

### Minute 15-35: Backend to Google Cloud Run

```bash
# Install Cloud SDK
brew install google-cloud-sdk

# Login
gcloud auth login

# Create project
gcloud config set project percentdosegraph

# Deploy
gcloud run deploy pdg-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --allow-unauthenticated \
  --set-env-vars "JWT_SECRET=$(openssl rand -base64 32),NODE_ENV=production"

# Note the URL like: https://pdg-api-xxxxx.run.app
```

### Minute 35-45: Connect Frontend to Backend

Edit `frontend-react/app.js` line ~15:

```javascript
// OLD:
const API_BASE_URL = 'http://localhost:3001';

// NEW:
const API_BASE_URL = 'https://pdg-api-xxxxx.run.app';
```

Push to GitHub:
```bash
git add frontend-react/app.js
git commit -m "Update API URL for Cloud Run"
git push origin main
```

Cloudflare auto-redeploys in ~2 minutes

### Minute 45-50: Verify Everything Works

```bash
# Test frontend
curl https://percentdosegraph.pages.dev

# Test backend
curl https://pdg-api-xxxxx.run.app/api/health

# Open in browser
open https://percentdosegraph.pages.dev
```

### Minute 50-60: Add Custom Domain (Optional)

If you own a domain (`dosegraph.com`):

1. In Cloudflare Pages → Custom domains
2. Add domain
3. Update DNS CNAME record to: `percentdosegraph.pages.dev`
4. Wait 5 minutes for propagation

**Done! Site is live. ✅**

---

## 📊 What You Get

| Feature | Included |
|---------|----------|
| Frontend hosting | ✅ Unlimited bandwidth |
| Backend API | ✅ 2M requests/month free |
| Auto-scaling | ✅ Handles 0 to 1000s requests |
| Global CDN | ✅ 200+ countries |
| SSL/HTTPS | ✅ Automatic |
| Auto-deploy | ✅ On every Git push |
| Monitoring | ✅ Built-in dashboards |
| Backups | ✅ Git history |

---

## 💰 Cost Analysis

### Monthly Costs

| Usage Level | API Calls/mo | Cost |
|-------------|-------------|------|
| Testing | 10k | $0 |
| 10 users | 50k | $0 |
| 100 users | 500k | $0 |
| 1000 users | 2M | $0-10 |
| 10k users | 10M | $50-100 |

**Key insight:** You won't pay anything unless you scale to thousands of concurrent users.

### Annual Savings vs Traditional VPS

```
Traditional VPS:    $180/year
Cloudflare + Cloud: $12/year (domain only)
───────────────────────────
SAVES:              $168/year
```

---

## 🔧 Managing Your Stack

### View Frontend Deployments

```
https://dash.cloudflare.com → Pages → percentdosegraph → Deployments
```

- See all builds
- Rollback if needed
- View build logs

### View Backend Logs

```bash
gcloud run logs read pdg-api --follow
```

Or in browser:
```
https://console.cloud.google.com/run → pdg-api → Logs
```

### Check Cloud Run Costs

```
https://console.cloud.google.com/billing → Usage → Cloud Run
```

Set up spending alerts at $10/month to catch any surprises.

---

## 📈 Scaling Path

| Stage | Users | Infrastructure | Cost | Action |
|-------|-------|------------------|------|--------|
| **MVP** | 1-50 | Cloudflare + Cloud Run | $0 | Current setup |
| **Growth** | 50-500 | Same + Neon DB | $0-20 | Add PostgreSQL |
| **Scale** | 500-5k | Fly.io + managed DB | $50-150 | Upgrade backend |
| **Enterprise** | 5k+ | Kubernetes + CDN | $500+ | Full infrastructure |

You won't need to scale for a long time!

---

## ⚠️ Important Reminders

**NEVER commit these to Git:**
```bash
.env.production     ← Contains JWT_SECRET
accounts.json       ← If it had passwords (it doesn't currently)
```

**Always used when deploying:**
```bash
# Cloud Run uses .env.production temporarily during build
# But it's NOT copied into the container image
# Verify with:
docker inspect pdg-api | grep -i env
```

**Monitor costs:**
```bash
# Set up Google Cloud billing alerts
# https://console.cloud.google.com/billing
```

---

## 🆘 Troubleshooting

### Frontend shows 404

```bash
# Check build succeeded in Cloudflare UI
# Verify: npm run build:deploy creates deploy/index.html
ls deploy/index.html
```

### Backend returns 502

```bash
# Check logs
gcloud run logs read pdg-api --limit 50

# Common causes:
# - Missing environment variables
# - Port not set to 3001
# - Startup errors in app.js

# Redeploy with debug
gcloud run deploy pdg-api --source . --platform managed
```

### API calls fail from frontend

```bash
# Check API URL is correct in app.js
grep "API_BASE_URL" frontend-react/app.js

# Should match exactly what Cloud Run gives you:
# https://pdg-api-xxxxx.run.app

# Test with curl
curl https://pdg-api-xxxxx.run.app/api/health
```

---

## 📚 Detailed Guides

For complete step-by-step instructions, see:

1. **Frontend:** [HOSTING_CLOUDFLARE_PAGES.md](./HOSTING_CLOUDFLARE_PAGES.md)
2. **Backend:** [HOSTING_GOOGLE_CLOUD_RUN.md](./HOSTING_GOOGLE_CLOUD_RUN.md)
3. **Comparison:** [HOSTING_COMPARISON.md](./HOSTING_COMPARISON.md)
4. **Complete Deployment:** [PUBLIC_DOMAIN_ACCESSIBILITY.md](./PUBLIC_DOMAIN_ACCESSIBILITY.md)

---

## ✅ Success Criteria

You know it's working when:

- [ ] Frontend loads at `https://percentdosegraph.pages.dev`
- [ ] API responds to `curl https://pdg-api-xxxxx.run.app/api/health`
- [ ] Can create new patient in browser
- [ ] Can add medication
- [ ] Can enter dose and see it graphed
- [ ] Data persists after browser refresh
- [ ] CSV export works
- [ ] No console errors in DevTools (F12)

All green? 🎉 You're live!

---

## 📞 Support

If something breaks:

1. Check relevant troubleshooting section above
2. View logs (`gcloud run logs read pdg-api`)
3. Check Cloudflare deployment status
4. Review the detailed guides
5. Check Google Cloud status page

---

## 🎯 Next Steps (Optional)

After launch, consider:

- [ ] Add custom domain (`dosegraph.com`)
- [ ] Set up monitoring alerts
- [ ] Create backup strategy
- [ ] Plan CI/CD pipeline
- [ ] Scale to PostgreSQL when needed
- [ ] Add analytics
- [ ] Security audit

But these can wait! Your app is live and free. 🚀

