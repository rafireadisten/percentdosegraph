# Public Domain Deployment - Troubleshooting Guide

## Common Issues & Solutions

### 1. DNS Not Resolving

**Symptoms:**
- `nslookup dosegraph.com` returns "can't find dosegraph.com"
- Browser shows "ERR_NAME_NOT_RESOLVED"
- Domain appears registered but unreachable

**Solutions:**

Check DNS propagation status:
```bash
# Windows/Unix
nslookup dosegraph.com
dig dosegraph.com

# Online checker (fastest)
https://www.whatsmydns.net/  # Enter your domain
```

Verify nameservers are set correctly:
```bash
# Check what nameservers domain is using
whois dosegraph.com | grep "Name Server"

# Should match your DNS provider (e.g., Cloudflare, Route 53)
```

Force DNS cache clear (local machine):
```bash
# macOS
dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Linux
sudo systemctl restart systemd-resolved

# Windows PowerShell (Admin)
Clear-DnsClientCache
```

Wait for propagation:
- DNS changes can take **24-48 hours** to fully propagate
- Use online checker to verify when live
- Some ISPs cache DNS; try alternate DNS (8.8.8.8, 1.1.1.1)

---

### 2. SSL Certificate Issues

**Symptoms:**
- Browser shows "Invalid Certificate" or "SSL_ERROR"
- `ERR_CERT_DOMAIN_MISMATCH`
- Certbot renewal failed

**Certificate Validity Check:**
```bash
# Check certificate expiry
echo | openssl s_client -servername dosegraph.com -connect dosegraph.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Expected output shows valid dates (not_before...not_after)
```

**Certificate Renewal:**
```bash
# Test renewal (dry run - doesn't make changes)
sudo certbot renew --dry-run

# Force immediate renewal
sudo certbot renew --force-renewal

# Specific domain renewal
sudo certbot certonly --force-renewal -d dosegraph.com -d www.dosegraph.com

# Manual renewal if automated fails
sudo certbot renew --manual
```

**Verify Certificate in Nginx:**
```bash
# Check nginx config points to correct cert path
sudo cat /etc/nginx/sites-enabled/dosegraph | grep ssl_certificate

# Should show: /etc/letsencrypt/live/dosegraph.com/fullchain.pem
```

**Troubleshoot Certbot:**
```bash
# Check certbot logs
sudo tail -50 /var/log/letsencrypt/letsencrypt.log

# List all certificates managed by certbot
sudo certbot certificates

# Delete problematic certificate (use with caution)
sudo certbot delete --cert-name dosegraph.com
```

---

### 3. Docker Container Won't Start

**Symptoms:**
- `docker-compose up -d` fails
- `docker ps` shows container as exited
- Error logs show application crash

**Troubleshooting:**

Check container status:
```bash
# List containers (including stopped)
docker ps -a

# Check container exit reason
docker logs pdg-api | tail -50

# Inspect container
docker inspect pdg-api | grep -A5 "State"
```

Check logs for specific errors:
```bash
# Stream logs in real-time
docker logs -f pdg-api

# Last 100 lines
docker logs --tail 100 pdg-api

# Search for errors
docker logs pdg-api 2>&1 | grep -i error
```

Common error causes:

**Port already in use:**
```bash
# Check if port 3001 is in use
sudo lsof -i :3001
sudo netstat -tlnp | grep 3001

# Kill process using port
sudo kill -9 <PID>
```

**Environment variable missing:**
```bash
# Verify .env.production exists and has content
cat /home/appuser/percentdosegraph/.env.production

# Required: JWT_SECRET, AUTH_SECRET must be set
grep "JWT_SECRET" .env.production
```

**Database permission issue:**
```bash
# Check file permissions
ls -la /home/appuser/percentdosegraph/accounts.json
ls -la /home/appuser/percentdosegraph/data/

# Fix permissions
sudo chown -R appuser:appuser /home/appuser/percentdosegraph
sudo chmod 755 /home/appuser/percentdosegraph
sudo chmod 644 /home/appuser/percentdosegraph/*.json
```

Restart container:
```bash
# Stop all containers
docker-compose down

# Remove old container
docker rm pdg-api

# Rebuild image
docker build -t pdg-api:latest .

# Start fresh
docker-compose up -d
```

---

### 4. API Not Responding (Timeout)

**Symptoms:**
- `curl https://dosegraph.com/api/health` times out
- React app shows "Cannot reach API" error
- Other pages load but API calls hang

**Troubleshooting:**

Check if container is running:
```bash
docker ps | grep pdg-api

# If not running, start it
docker-compose up -d pdg-api
```

Check if port 3001 is listening:
```bash
netstat -tlnp | grep 3001

# Or using Docker network
docker exec pdg-api netstat -tlnp
```

Check Nginx proxy settings:
```bash
# Verify proxy config
sudo cat /etc/nginx/sites-enabled/dosegraph | grep -A10 "location /api"

# Ensure proxy_pass is set to http://localhost:3001
```

Test direct connection to API:
```bash
# From VPS, test internal connection
curl http://localhost:3001/api/health

# If works internally but not externally, it's a Nginx routing issue
```

Check Nginx is passing requests:
```bash
# View Nginx access logs
sudo tail -20 /var/log/nginx/dosegraph_access.log

# View error logs
sudo tail -20 /var/log/nginx/dosegraph_error.log

# Reload Nginx config
sudo systemctl reload nginx
```

---

### 5. Frontend Shows Blank Page

**Symptoms:**
- Page loads but nothing renders
- Console shows JavaScript errors
- No visible content

**Troubleshooting:**

Check browser console (F12):
```
Look for error messages in Console tab
Common issues:
- CORS policy errors
- Failed to load resources (404)
- Parse errors in JS bundle
```

Check if HTML is served:
```bash
curl https://dosegraph.com -I

# Should return 200 OK and Content-Type: text/html
```

Check if bundle files exist:
```bash
# On VPS
ls -la /home/appuser/percentdosegraph/deploy/

# Should have: app.bundle.js, index.html, styles.css, 404.html
```

Verify SPA routing config:
```bash
# Check Nginx tries files correctly
sudo cat /etc/nginx/sites-enabled/dosegraph | grep -A5 "location /"

# Should include: try_files $uri $uri/ /index.html;
```

Check file permissions:
```bash
sudo ls -la /home/appuser/percentdosegraph/deploy/

# Files should be readable by Nginx (644 or 755)
sudo chmod -R 755 /home/appuser/percentdosegraph/deploy/
```

Clear browser cache:
```bash
# Hard refresh in browser (Cmd+Shift+R or Ctrl+Shift+R)
# Or manually clear browser cache/cookies
```

---

### 6. High Memory Usage or Crashes

**Symptoms:**
- Server becomes slow or unresponsive
- Application crashes intermittently
- Docker container keeps restarting

**Check Resource Usage:**
```bash
# Memory usage
free -h
df -h

# Running processes
top

# Docker resource stats
docker stats pdg-api
```

**Reduce Memory Footprint:**
```bash
# Check current Node memory limit in Docker
docker inspect pdg-api | grep -E "MemoryLimit|MemorySwap"

# Set memory limit in docker-compose.yml
# Add to pdg-api service:
# mem_limit: '512m'
# memswap_limit: '1g'
```

**Check for Memory Leaks:**
```bash
# Monitor over time
watch -n 5 'docker stats --no-stream pdg-api'

# If consistently growing, potential memory leak
# Check application logs
docker logs pdg-api | tail -100
```

**Scale Up if Needed:**
```bash
# Stop and upgrade VPS if consistently over 80% memory
docker-compose down

# Upgrade VPS (2GB → 4GB RAM)
# Then restart
docker-compose up -d
```

---

### 7. Nginx 502 Bad Gateway

**Symptoms:**
- Page shows "502 Bad Gateway"
- API calls fail
- Nginx error log shows: `connect() failed (111: Connection refused)`

**Troubleshooting:**

Check if backend is running:
```bash
docker ps | grep pdg-api

# Specific check
docker exec pdg-api curl -I http://localhost:3001/api/health
```

Check Nginx can reach backend:
```bash
sudo nginx -T 2>&1 | grep -A5 "proxy_pass"

# Should show: proxy_pass http://localhost:3001;
```

Check firewall isn't blocking:
```bash
# Test if Docker network works
docker ps  # Get container ID

# Check if container can respond
docker exec <container_id> wget -O- http://localhost:3001/api/health
```

Bounce services:
```bash
# Restart Nginx
sudo systemctl restart nginx

# Restart Docker
docker-compose restart

# Full restart
docker-compose down
docker-compose up -d
sudo systemctl restart nginx
```

---

### 8. CORS Errors in Browser

**Symptoms:**
- Console shows: "Access to XMLHttpRequest has been blocked by CORS policy"
- API calls fail with `No 'Access-Control-Allow-Origin' header`

**Troubleshooting:**

Verify CORS headers in Nginx:
```bash
curl -I -H "Origin: https://dosegraph.com" https://api.dosegraph.com/api/health

# Should show: Access-Control-Allow-Origin: *  (or your domain)
```

Check API CORS config:
```bash
# Verify backend is configured for CORS
grep -n "Access-Control" /etc/nginx/sites-enabled/dosegraph

# Or check app code for CORS middleware
grep -r "CORS\|cors" /home/appuser/percentdosegraph/artifacts/api-server/src/ | head -5
```

Fix CORS in Nginx:
```bash
# Add to API location block in Nginx config
sudo nano /etc/nginx/sites-enabled/dosegraph

# Add before proxy_pass:
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type' always;

sudo systemctl reload nginx
```

---

### 9. SSL Certificate Won't Renew

**Symptoms:**
- Certbot renewal fails silently
- Certificate expires and site becomes inaccessible
- Error in logs: "Broken symbolic link"

**Troubleshooting:**

Check renewal logs:
```bash
sudo tail -100 /var/log/letsencrypt/letsencrypt.log

grep -i error /var/log/letsencrypt/letsencrypt.log
```

Verify certificate path:
```bash
# Check if symlinks are correct
sudo ls -la /etc/letsencrypt/live/dosegraph.com/

# If broken, check archive
sudo ls -la /etc/letsencrypt/archive/
```

Manual renewal:
```bash
# Stop nginx to allow standalone authentication
sudo systemctl stop nginx

# Renew with standalone
sudo certbot renew --standalone

# Restart nginx
sudo systemctl start nginx
```

Force renewal:
```bash
sudo certbot delete --cert-name dosegraph.com
sudo certbot certonly --nginx -d dosegraph.com -d www.dosegraph.com -d api.dosegraph.com
```

---

### 10. Deployment Rolling Back After Push

**Symptoms:**
- Made changes, pushed to GitHub
- CI/CD broke the deployment
- Need to rollback to previous version

**Troubleshooting:**

Check git history:
```bash
git log --oneline -10

# See what changed recently
git diff HEAD~1 HEAD
```

Revert to previous commit:
```bash
# Option 1: Soft revert (keeps changes staged)
git revert HEAD

# Option 2: Hard revert (discards changes)
git reset --hard HEAD~1

# Force push (be careful!)
git push origin main --force-with-lease
```

Manual rollback on VPS:
```bash
cd /home/appuser/percentdosegraph

# Check current commit
git log -1

# Go back to previous version
git checkout <previous_commit_hash>

# Rebuild
npm run build:all

# Restart
docker-compose restart
```

---

## Getting Help

**When seeking help, provide:**
1. Error message (exact text)
2. Steps to reproduce
3. Recent changes made
4. Output of: `docker logs pdg-api | tail -50`
5. Browser console errors (F12)
6. Nginx logs: `sudo tail -50 /var/log/nginx/dosegraph_error.log`

**Emergency Restart:**
```bash
# Nuclear option - stop everything and restart
docker-compose down
sudo systemctl restart nginx
docker-compose up -d
sudo systemctl restart pdg-app.service
```

---

## Quick Reference Commands

```bash
# Status checks
docker ps
docker ps -a
docker logs -f pdg-api
sudo systemctl status nginx
curl https://dosegraph.com/api/health

# Restarts
docker-compose restart pdg-api
sudo systemctl restart nginx
docker-compose down && docker-compose up -d

# Visual inspection
curl -I https://dosegraph.com
digdosegraph.com
sudo tail -50 /var/log/nginx/dosegraph_error.log

# Backups
tar -czf backup.tar.gz /home/appuser/percentdosegraph/{accounts.json,profiles.json,data/}

# Cleanup
docker system prune -a          # Remove unused images/containers
docker volume prune             # Remove unused volumes
docker logs --tail 1000 pdg-api # View more logs
```

