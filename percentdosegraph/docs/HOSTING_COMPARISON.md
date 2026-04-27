# Free & Cost-Effective Hosting Options Comparison

## Executive Summary

**Best Stack for PDG (Completely FREE):**
- **Frontend:** Cloudflare Pages → $0
- **Backend:** Google Cloud Run → $0
- **Database:** JSON (Git-backed) → $0
- **Domain:** Namecheap → $12/year
- **Total Cost:** **$1/month** (domain amortized)

---

## Frontend Hosting Comparison

### Cloudflare Pages ⭐ RECOMMENDED

| Metric | Value |
|--------|-------|
| **Cost** | FREE (no paid tier) |
| **Bandwidth** | Unlimited |
| **Builds/month** | 500 free |
| **Build time** | ~1 minute |
| **CDN coverage** | 200+ countries |
| **Auto-deploy** | Yes (GitHub) |
| **Custom domain** | Free |
| **Uptime SLA** | 99.9% |

**Pros:**
- Genuinely free (no hidden costs)
- Fastest deployments (sub-second)
- Global CDN included
- Works with SPA routing (React)
- Infinite bandwidth
- Integrates with GitHub perfectly

**Cons:**
- Cloudflare nameservers required (for free custom domain)
- Limited to static files (frontend only)

**Setup Time:** 15 minutes

**Use Case:** Perfect for PDG frontend

---

### GitHub Pages

| Metric | Value |
|--------|-------|
| **Cost** | FREE |
| **Bandwidth** | Unlimited |
| **Size limit** | 1GB site |
| **Build time** | ~3 minutes |
| **Custom domain** | Yes (free via CNAME) |
| **Auto-deploy** | Yes |
| **Uptime** | 99.9% |

**Pros:**
- Already configured in your repo
- No additional signup needed
- Works perfectly with your project
- **Can upgrade to custom domain (dosegraph.io) for free**

**Cons:**
- Slower builds than Cloudflare (~3min vs ~1min)
- Default URL longer: `rafireadisten.github.io/percentdosegraph`

**Upgrade to Custom Domain:**
```
1. Register dosegraph.io on Namecheap
2. In GitHub → Settings → Pages
3. Enter custom domain: dosegraph.io
4. Create CNAME record in DNS pointing to: rafireadisten.github.io
5. Verify DNS propagation
Result: https://dosegraph.io (FREE!)
```

**Setup Time:** Already done! (Upgrade takes 15 min)

**Use Case:** Primary option if no Cloudflare account; can upgrade to dosegraph.io free

---

### Netlify

| Metric | Value |
|--------|-------|
| **Cost** | FREE tier exists |
| **Paid minimum** | $19/month (if exceeded limits) |
| **Bandwidth** | 100GB/month free |
| **Build time** | 2-3 minutes |
| **Serverless functions** | 125k/month free |

**Pros:**
- User-friendly dashboard
- Good for learning
- Can add serverless functions

**Cons:**
- Bandwidth limits (100GB might be hit)
- Deploy previews eat bandwidth
- Paid tier starts automatically if overages

**Risk:** Surprise bill if traffic spikes

**Use Case:** Not recommended (Cloudflare is better)

---

### Vercel

| Metric | Value |
|--------|-------|
| **Cost** | FREE tier exists |
| **Paid minimum** | $20/month |
| **Bandwidth** | Limited free tier |
| **Serverless functions** | Pro feature |

**Pros:**
- Next.js optimized
- Fast deployments
- Good documentation

**Cons:**
- Free tier limited
- Paid tier starts automatically
- Not ideal for static sites

**Risk:** Requires monitoring for overages

**Use Case:** Better for server-side rendering apps

---

### AWS S3 + CloudFront

| Metric | Value |
|--------|-------|
| **Cost** | $0.6-2/month (typical) |
| **Bandwidth** | $0.085/GB |
| **Setup** | Complex |
| **Build time** | Manual deployment |

**Pros:**
- Scales to millions
- Works for large files
- Pay-as-you-go

**Cons:**
- Complex setup (requires AWS account, IAM roles, etc.)
- Need to learn CloudFront
- S3 versioning adds complexity
- Better for massive traffic (millions/month)

**Setup Time:** 1-2 hours

**Use Case:** When traffic exceeds Cloudflare limits (rarely for PDG)

---

## Backend Hosting Comparison

### Google Cloud Run ⭐ RECOMMENDED

| Metric | Value |
|--------|-------|
| **Cost** | FREE (2M req/mo) |
| **Paid minimum** | $0.00002/request after free tier |
| **Auto-scaling** | 0 to 1000+ instances |
| **Memory options** | 128MB - 8GB |
| **Max request time** | 60 minutes |
| **Startup speed** | ~500ms (acceptable) |

**Pros:**
- Genuine free tier (not trial)
- 2 million requests/month = ~91k/day
- No infrastructure to manage
- Auto-scaling built-in
- Pay only for used memory
- Node.js works perfectly

**Cons:**
- Cold starts possible (500ms)
- Memory charges (not per-request)
- ~$0.00002 per request after free tier

**Typical PDG cost:**
- 0-100 requests/day: $0
- 100-1000 requests/day: $0-5/month
- 1000+ requests/day: $5-50/month

**Setup Time:** 35 minutes

**Use Case:** Perfect for PDG backend

---

### Fly.io

| Metric | Value |
|--------|-------|
| **Cost** | FREE tier (technically) |
| **Free tier** | 3 shared-CPU VMs |
| **Paid minimum** | $6/month dedicated |
| **Scaling** | Manual or auto |
| **Uptime** | Always-on (no sleeping) |
| **Startup** | Very fast (~100ms) |

**Pros:**
- Always-on (never sleeps)
- True free tier (no credit card)
- 3 shared VMs is generous
- Better for sustained traffic
- Simple `flyctl` CLI

**Cons:**
- Shared CPU resources
- Limited to 3 apps free
- Performance varies with other users
- Less predictable costs than Cloud Run

**Setup Time:** 25 minutes

**Use Case:** Alternative to Cloud Run if free tier doesn't work

---

### AWS Lambda

| Metric | Value |
|--------|-------|
| **Cost** | FREE (1M req/mo) |
| **Paid minimum** | $0.20 per 1M requests |
| **Setup** | Complex (API Gateway + Lambda) |
| **Cold starts** | 100-300ms |
| **Scaling** | Automatic |

**Pros:**
- 1 million requests free
- Industry standard
- Very scalable

**Cons:**
- Requires API Gateway setup
- Cold starts noticeable
- Complex pricing model
- Setup requires understanding IAM

**Setup Time:** 1-2 hours

**Use Case:** If you want AWS ecosystem

---

### Render

| Metric | Value |
|--------|-------|
| **Cost** | FREE tier (with limitation) |
| **Free tier** | 750 hours shared CPU |
| **Shared CPU issue** | Sleeps after 15 min inactivity |
| **Paid minimum** | $7/month |
| **Startup** | 30-60 seconds (slow) |

**Pros:**
- Simple deployment
- Good UI
- Supports databases

**Cons:**
- Sleeps after inactivity (bad for PDG)
- Slow startup when waking (30-60s)
- Limited to 750 hrs/month

**Issue for PDG:** Users wait 30-60s for first request after inactivity

**Setup Time:** 20 minutes

**Use Case:** Not recommended for PDG

---

### Railway

| Metric | Value |
|--------|-------|
| **Cost** | $5 credit/month |
| **Paid minimum** | $5/month |
| **Scaling** | Automatic |
| **Database included** | Yes (PostgreSQL) |

**Pros:**
- Includes PostgreSQL
- $5 credit covers many small apps
- Good for multiple services

**Cons:**
- Credit runs out
- Not truly free
- Charges $5 minimum

**Setup Time:** 20 minutes

**Use Case:** If you want managed PostgreSQL included

---

### Self-Hosted VPS

| Metric | Value |
|--------|-------|
| **Cost** | $12-15/month |
| **Setup** | ~2-3 hours |
| **Scaling** | Manual (upgrade VPS) |
| **Uptime** | 99.9% (if managed well) |
| **Control** | Full |

**Pros:**
- Full control
- Predictable costs
- Can host multiple apps
- Your own database server

**Cons:**
- Must manage updates/security
- Manual scaling
- More expensive than Cloud Run for light usage

**Setup Time:** 2-3 hours

**Use Case:** When you want full control or expect heavy traffic

---

## Database Options

### Option 1: JSON Files (CURRENT) ⭐ RECOMMENDED

| Metric | Value |
|--------|-------|
| **Cost** | $0 |
| **Storage** | Git repository |
| **Backup** | Automatic (GitHub) |
| **Scaling** | ~1000 patients |
| **Query speed** | Fast (in-memory) |

**Pros:**
- Free forever
- No database setup needed
- Automatic Git backups
- Works perfect for PDG scale
- Portable (just JSON files)

**Cons:**
- Not suitable for 100k+ patients
- No built-in querying
- Full file read on each request

**Data persistence:**
```
accounts.json ← Logged-in users
profiles.json ← Patient profiles
data/doses.json ← All dose entries
data/drugs.json ← Drug library
```

**Use Case:** Perfect for PDG now and foreseeable future

---

### Option 2: Neon (PostgreSQL) - FREE

| Metric | Value |
|--------|-------|
| **Cost** | FREE tier |
| **Storage** | 10GB free |
| **Compute** | 0.5GB free |
| **Auto-suspend** | After 5 min inactivity |

**Pros:**
- Real PostgreSQL
- SQL queries
- Scales to millions
- Free tier is real

**Cons:**
- Auto-suspends (slower first request)
- Limited compute
- Need to rewrite data layer

**Setup Time:** 30 minutes

**Use Case:** When PDG outgrows JSON (scale to 10k+ patients)

---

### Option 3: Supabase (Firebase-like)

| Metric | Value |
|--------|-------|
| **Cost** | FREE tier |
| **Storage** | 500MB free |
| **Features** | Built-in auth |

**Pros:**
- PostgreSQL under hood
- Built-in auth (sign-up/login)
- Real-time updates
- OAuth built-in

**Cons:**
- Limited storage (500MB)
- Need to migrate from JSON

**Use Case:** If you need advanced features

---

## Total Cost Scenarios

### Scenario 1: Hobbyist (Testing PDG)

```
Cloudflare Pages (frontend)  → $0
Google Cloud Run (backend)   → $0
JSON database               → $0
Domain                      → Skip (use .pages.dev)
─────────────────────────────────
TOTAL: $0/month
```

### Scenario 2: Small Clinic (10-100 patients)

```
Cloudflare Pages            → $0
Google Cloud Run            → $0-5/month
JSON database               → $0
Namecheap domain            → $1/month
─────────────────────────────────
TOTAL: $1-6/month
```

### Scenario 3: Medium Clinic (100-1000 patents)

```
Cloudflare Pages            → $0
Google Cloud Run            → $5-20/month
Neon PostgreSQL             → $0-20/month
Domain + email              → $2-5/month
─────────────────────────────────
TOTAL: $7-45/month
```

### Scenario 4: Production Hospital (1000+ patients)

```
Cloudflare Pages            → $0
Cloud Run (scaled)          → $50-100/month
Managed PostgreSQL          → $30-100/month
Domain + SSL                → $2-5/month
Monitoring & backups        → $20-50/month
─────────────────────────────────
TOTAL: $100-250/month
```

---

## Recommendation Score Matrix

| Provider | Frontend | Backend | Database | Overall | Recommendation |
|----------|----------|---------|----------|---------|-----------------|
| Cloudflare + Cloud Run + JSON | 10/10 | 10/10 | 10/10 | **10/10** | ⭐⭐⭐⭐⭐ |
| GitHub Pages (dosegraph.io) + Cloud Run + JSON | 9/10 | 10/10 | 10/10 | **9.7/10** | ⭐⭐⭐⭐⭐ |
| GitHub Pages + Fly.io + JSON | 9/10 | 8/10 | 10/10 | **9.0/10** | ⭐⭐⭐⭐ |
| Netlify + Railway + Neon | 7/10 | 8/10 | 8/10 | 7.7/10 | ⭐⭐⭐ |
| Vercel + Lambda + RDS | 8/10 | 7/10 | 8/10 | 7.7/10 | ⭐⭐⭐ |
| Traditional VPS (full stack) | 6/10 | 9/10 | 10/10 | 8.3/10 | ⭐⭐⭐⭐ |

---

## Migration Path

### Phase 1 (Today - Complete FREE)
```
✅ Cloudflare Pages + Google Cloud Run + JSON
Cost: $0/month
Supports: 1000+ patients
```

### Phase 2 (When traffic grows)
```
→ Add Neon PostgreSQL ($0-20/month)
Cost: $0-20/month
Supports: 100k+ patients
```

### Phase 3 (Production at scale)
```
→ Upgrade PostgreSQL to managed service
→ Add dedicated backend servers
→ Add CDN/caching layer
Cost: $100+/month
Supports: Millions of patients
```

---

## Decision Tree

```
Choose Frontend:
├─ Want fastest deployments + global CDN → Cloudflare Pages
├─ Already have GitHub → GitHub Pages (+ dosegraph.io domain)
└─ Neither → Netlify/Vercel (simpler UI)

Choose Backend:
├─ Want simplest deployment → Google Cloud Run
├─ Want always-on + Generous free tier → Fly.io
└─ Want AWS ecosystem → Lambda

Database:
├─ <1000 patients → Use JSON (free forever)
├─ 1000-100k patients → Add Neon PostgreSQL
└─ >100k patients → Managed PostgreSQL service

Data > 1MB?
├─ Yes → Stick with JSON
└─ No → Consider PostgreSQL

Traffic > 1000 req/day?
├─ Yes → Cloud Run/Fly.io auto-scales (still free!)
└─ No → Any option works

Security critical (healthcare)?
├─ Yes → Use Cloud Run + encryption + backups
└─ No → Simpler options OK
```

---

## Implementation Checklist

- [ ] Decide on frontend (recommend: Cloudflare Pages)
- [ ] Decide on backend (recommend: Google Cloud Run)
- [ ] Decide on database (recommend: Keep JSON for now)
- [ ] Register domain (Namecheap $12/year)
- [ ] Follow [HOSTING_CLOUDFLARE_PAGES.md](./HOSTING_CLOUDFLARE_PAGES.md)
- [ ] Follow [HOSTING_GOOGLE_CLOUD_RUN.md](./HOSTING_GOOGLE_CLOUD_RUN.md)
- [ ] Update frontend API URL
- [ ] Test end-to-end
- [ ] Set up monitoring
- [ ] Monitor costs for first month

---

## Support & Resources

- Cloudflare: https://developers.cloudflare.com/pages/
- Google Cloud Run: https://cloud.google.com/run/docs
- Fly.io: https://fly.io/docs/
- Pricing calculators: https://cloud.google.com/products/calculator

