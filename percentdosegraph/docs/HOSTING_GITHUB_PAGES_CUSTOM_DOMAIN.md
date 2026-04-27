# Deploy Frontend to GitHub Pages with Custom Domain (dosegraph.io)

## Overview

GitHub Pages is already configured in your repository and automatically deploys on every push to `main`. This guide shows how to upgrade it to use the custom domain `dosegraph.io` (completely FREE).

**Current Setup:**
- URL: `https://rafireadisten.github.io/percentdosegraph`
- Auto-deploys: ✅ Yes
- Cost: $0

**After Upgrade:**
- URL: `https://dosegraph.io`
- Auto-deploys: ✅ Yes (same)
- Cost: $0 (+ $12/year domain)

---

## Step 1: Register dosegraph.io Domain

### Option A: Namecheap (Recommended)

1. Go to [namecheap.com](https://namecheap.com)
2. Search for `dosegraph.io`
3. Click **Add to cart**
4. Proceed to checkout
5. Create account if needed
6. Pay (~$12/year for .io domain)
7. Domain registered!

### Option B: Other Registrars

- GoDaddy
- Google Domains
- Route 53
- Any registrar you prefer

**Important:** Write down your domain registrar's name (you'll need it in Step 2)

---

## Step 2: Configure DNS for GitHub Pages

In your domain registrar's control panel:

### Create CNAME Record

| Field | Value |
|-------|-------|
| Type | CNAME |
| Name/Host | `www` |
| Value/Points To | `rafireadisten.github.io` |
| TTL | 3600 (or default) |

### Also Create A Records (for apex domain)

| Field | Value |
|-------|-------|
| Type | A |
| Name | `@` (root) |
| IP Address | `185.199.108.153` |
| TTL | 3600 |

Repeat for these IPs:
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

**Example for Namecheap:**

```
Host: www
Type: CNAME Record
Value: rafireadisten.github.io

Host: @
Type: A Record
Value: 185.199.108.153

(repeat A record 3 more times with other IPs)
```

**Wait:** DNS propagation takes 5-30 minutes. Time for coffee! ☕

---

## Step 3: Configure GitHub Pages

1. Go to your repository: [github.com/rafireadisten/percentdosegraph](https://github.com/rafireadisten/percentdosegraph)
2. Click **Settings** (top right)
3. Left sidebar → **Pages**
4. Under "Custom domain", enter: `dosegraph.io`
5. Click **Save**

**GitHub will verify DNS automatically:**
- Takes 1-5 minutes
- Green checkmark appears when verified
- If not verified, check DNS records in Step 2

### Enable HTTPS

After DNS verification:
1. Check the box: **Enforce HTTPS**
2. GitHub automatically issues free SSL certificate

Your site is now: `https://dosegraph.io` ✅

---

## Step 4: Verify Setup

### Test Domain Loads

```bash
# Wait for DNS to propagate
curl https://dosegraph.io

# Should return your React app HTML
# Browser: open https://dosegraph.io
```

### Check DNS Setup

```bash
# Verify CNAME record
dig dosegraph.io CNAME

# Should show: dosegraph.io. ... rafireadisten.github.io.

# Verify A records
dig dosegraph.io A

# Should show GitHub's IP addresses (185.199.xxx.xxx)
```

### Verify GitHub Pages

```bash
# Check GitHub Pages is enabled
# GitHub Settings → Pages
# Should show: "Your site is live at https://dosegraph.io"
```

---

## Cost Comparison

### Option 1: GitHub Pages (default)
```
Frontend: rafireadisten.github.io/percentdosegraph
Cost: $0/month
❌ Not professional looking
```

### Option 2: GitHub Pages + dosegraph.io
```
Frontend: dosegraph.io
Domain: Namecheap $12/year = $1/month
Cost: $1/month
✅ Professional domain
✅ Easy to share
```

### Option 3: Cloudflare Pages + dosegraph.io
```
Frontend: dosegraph.io (via Cloudflare)
Domain: Namecheap $12/year = $1/month
Cost: $1/month
✅ Faster deployments (~1 min)
✅ Better performance
✅ More features
```

---

## Auto-Deploy Still Works

After upgrade, deployment is **unchanged:**

```bash
# Make changes
nano frontend-react/app.js

# Commit and push
git add .
git commit -m "Update feature"
git push origin main

# GitHub Pages automatically rebuilds and deploys
# Site updates at https://dosegraph.io in ~3 minutes
```

---

## Troubleshooting

### Domain Not Working (404 Error)

**Likely causes:**

1. **DNS not propagated yet**
   - Takes 5-30 minutes usually
   - Check: `dig dosegraph.io`
   - Wait longer and try again

2. **Wrong DNS records**
   - Verify CNAME record in registrar control panel
   - Verify A records (all 4 IPs)
   - Should show: `rafireadisten.github.io` for CNAME

3. **GitHub Pages not updated**
   - Refresh GitHub Settings → Pages
   - Verify "Custom domain" shows: `dosegraph.io`
   - Check for red error messages

**Solution:**
```bash
# Verify DNS is correct
nslookup dosegraph.io

# Force browser cache clear
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)

# Wait another 10 minutes and try again
```

### Domain Verified but Site Still Shows Default Page

1. GitHub Settings → Pages → **Verify** button (click it)
2. If still failing, remove custom domain and re-add
3. Wait 5 minutes
4. Refresh browser

### HTTPS Not Working

1. GitHub Settings → Pages
2. Check **"Enforce HTTPS"** (may take 10 minutes to activate)
3. Don't access via `http://` (GitHub redirects to `https://`)

---

## Comparison: GitHub Pages vs Cloudflare Pages

| Feature | GitHub Pages | Cloudflare Pages |
|---------|--------------|------------------|
| **Cost** | $0 | $0 |
| **Custom domain** | Yes ($12/yr) | Yes ($0 if Cloudflare DNS) |
| **Deploy time** | ~3 min | ~1 min |
| **Bandwidth** | Unlimited | Unlimited |
| **Analytics** | No | Yes |
| **Cache control** | Limited | Advanced |
| **Setup difficulty** | Easy | Easy |
| **Best for** | Quick setup | Professional apps |

**Recommendation:**
- **Starting out:** Use GitHub Pages ($0 everywhere)
- **Want faster deploys:** Switch to Cloudflare Pages ($0 everywhere)
- Could use either! Both are completely free.

---

## Next Steps

After GitHub Pages is working with dosegraph.io:

1. ✅ Frontend deployed to dosegraph.io
2. 📋 Deploy backend to Google Cloud Run (see [HOSTING_GOOGLE_CLOUD_RUN.md](./HOSTING_GOOGLE_CLOUD_RUN.md))
3. 🔗 Update frontend API URL to point to backend
4. ✨ Test end-to-end
5. 🎯 Add custom API domain if desired

---

## Key Commands

```bash
# Check DNS CNAME
dig dosegraph.io CNAME

# Check DNS A records
dig @8.8.8.8 dosegraph.io A

# Check if domain resolves
nslookup dosegraph.io

# Verify GitHub Pages config
curl -I https://dosegraph.io

# Force new build on GitHub (push any change)
git commit --allow-empty -m "Trigger rebuild"
git push origin main
```

---

## Support

- GitHub Pages docs: https://docs.github.com/en/pages
- GitHub Pages troubleshooting: https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-custom-domains-and-github-pages
- Namecheap DNS guide: https://www.namecheap.com/support/knowledgebase/

