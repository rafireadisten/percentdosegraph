# Deploy Frontend to Cloudflare Pages (FREE)

## Why Cloudflare Pages?

- **Cost:** FREE (no credit card needed, no paid tier)
- **Bandwidth:** Unlimited (even on free tier)
- **Build time:** Sub-second deployments
- **CDN:** Global included
- **Custom domain:** Free
- **Auto-deploy:** On every GitHub push
- **Performance:** Sub-millisecond latency worldwide

---

## Prerequisites

- GitHub account (you have this)
- Cloudflare account (free sign-up at cloudflare.com)
- Repository already pushed to GitHub (you have this)

---

## Step-by-Step Deployment

### 1. Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com)
2. Click "Sign up"
3. Enter email and password
4. Verify email
5. Skip domain verification for now (we'll use Cloudflare's free domain first)

### 2. Create Pages Project

1. Log into Cloudflare dashboard
2. In left sidebar, click **Pages**
3. Click **Create a project**
4. Click **Connect to Git**
5. Select **GitHub**
6. Click **Authorize Cloudflare**
7. You'll be redirected to GitHub to authorize - click **Authorize cloudflare**
8. Select organization: **rafireadisten** (or your personal account)
9. Choose repository: **percentdosegraph**
10. Click **Begin setup**

### 3. Configure Build Settings

**Framework preset:** None (or Node)

**Build command:**
```
npm run build:deploy
```

**Build output directory:**
```
deploy
```

**Environment variables:** (Optional - leave blank for now)

Click **Save and Deploy**

### 4. Wait for Deployment

Watch the build process:
- Logs show: `npm ci`, `npm run build:deploy`, etc.
- Should complete in 1-3 minutes
- When green checkmark appears, deployment is SUCCESS

### 5. Get Your URL

After deployment, Cloudflare assigns a subdomain:
```
https://percentdosegraph.pages.dev
```

### Test Production Frontend

```bash
# Test the frontend loads
curl https://percentdosegraph.pages.dev

# Should return HTML of your React app

# Open in browser
open https://percentdosegraph.pages.dev
```

---

## Add Custom Domain (Optional)

If you own `dosegraph.com`:

### Option A: Use Cloudflare DNS (Recommended)

1. In Cloudflare Pages project settings
2. Click **Custom domains**
3. Enter your domain: `dosegraph.com`
4. Click **Activate domain**
5. Follow Cloudflare's instructions to update nameservers at registrar
6. DNS will propagate in 24-48 hours

### Option B: Use CNAME (Existing DNS)

If you use another DNS provider (Namecheap, Route 53, etc.):

1. In Cloudflare Pages → **Custom domains**
2. Enter domain: `dosegraph.com`
3. Cloudflare shows CNAME record:
   ```
   Name: your-app
   Value: percentdosegraph.pages.dev
   ```
4. Add this CNAME record in your DNS provider
5. Wait 24-48 hours for propagation

---

## Auto-Deploy on Git Push

Cloudflare Pages automatically redeploys when you push to GitHub:

```bash
# Make changes locally
nano frontend-react/app.js

# Commit and push
git add .
git commit -m "Update app"
git push origin main

# Watch deployment in Cloudflare Pages UI
# New build starts automatically
# Site updates in 1-3 minutes
```

---

## Monitoring & Analytics

In Cloudflare Pages dashboard:

- **Analytics:** Real-time visitor stats
- **Deployments:** History of all builds
- **Settings:** Change build command or environment
- **Custom domains:** Manage your domains

### View Build Logs

1. Click on latest deployment
2. Scroll to "Build log"
3. See full npm output (helpful for debugging)

---

## Troubleshooting

### Build Fails

**Common causes:**

1. **Wrong build directory**
   - Should be: `deploy`
   - Check in your [package.json](../package.json): `npm run build:deploy` creates this

2. **Missing dependencies**
   - Cloudflare runs `npm ci` automatically
   - If it fails, check `package.json` for syntax errors

3. **Environment variables needed**
   - Check build output for errors about missing vars
   - Add in Pages → Settings → Environment variables

**View detailed logs:**
1. Pages → Deployments → Failed build
2. Click "View build log"
3. Scroll to error message

### Site Shows 404

1. Verify build output directory is `deploy`
2. Check file exists: `ls deploy/index.html`
3. Cloudflare Pages requires `index.html` in root of build directory

### API Calls Fail (CORS)

Your frontend needs to know where the backend is:

1. Get your Google Cloud Run URL (from next guide)
2. Edit [frontend-react/app.js](../frontend-react/app.js)
3. Find `API_BASE_URL = ...` around line 15
4. Update to: `const API_BASE_URL = 'https://pdg-api-xxxxx.run.app';`
5. Run `npm run build:deploy` locally (or just push)
6. Cloudflare redeploys automatically

---

## Cost Analysis

| Item | Cost |
|------|------|
| Cloudflare Pages hosting | $0 |
| Bandwidth (unlimited) | $0 |
| Deployments (unlimited) | $0 |
| Custom domain | $0 (if moved to Cloudflare DNS) |
| **Total** | **$0/month** |

---

## Performance Benchmarks

Typical metrics for PDG on Cloudflare Pages:

- **TTFB (Time to First Byte):** ~50-100ms
- **Page Load Time:** ~1-2 seconds
- **Lighthouse Score:** 85-90+
- **Uptime:** 99.9%+

---

## Next Steps

1. ✅ Deploy frontend to Cloudflare Pages
2. 📋 Deploy backend to Google Cloud Run (see [HOSTING_GOOGLE_CLOUD_RUN.md](./HOSTING_GOOGLE_CLOUD_RUN.md))
3. 🔗 Update frontend API URL to point to backend
4. ✨ Test end-to-end (frontend → backend)
5. 🎯 Add custom domain

---

## Key Commands Reference

```bash
# Build locally to verify
npm run build:deploy

# Check output
ls -la deploy/

# Push to trigger Cloudflare deploy
git push origin main

# Monitor deploys (via web UI)
# https://dash.cloudflare.com → Pages → percentdosegraph
```

---

## Support

- Cloudflare docs: https://developers.cloudflare.com/pages/
- Status page: https://www.cloudflarestatus.com/
- Community: https://community.cloudflare.com/
