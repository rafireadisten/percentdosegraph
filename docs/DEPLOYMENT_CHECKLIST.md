# Public Domain Deployment Checklist

## Phase 1: Pre-Deployment Planning

### Domain & DNS
- [ ] Domain name selected and registered (Namecheap, GoDaddy, Route 53, etc.)
- [ ] Domain registrar account secured (2FA enabled)
- [ ] DNS provider chosen (can use registrar's, Cloudflare, Route 53, etc.)
- [ ] DNS records planned:
  - [ ] A record: `@` → VPS IP
  - [ ] A record: `www` → VPS IP
  - [ ] CNAME record (optional): `api` → `@`
- [ ] DNS propagation timeline understood (24-48 hours)

### VPS & Infrastructure
- [ ] VPS provider chosen (DigitalOcean, Linode, AWS EC2, Vultr, etc.)
- [ ] VPS specs confirmed (minimum: 2GB RAM, 1 vCPU, Ubuntu 22.04)
- [ ] Backup/recovery strategy planned
- [ ] Geographic region selected (close to target users)
- [ ] Pricing reviewed and approved

### Security Planning
- [ ] SSL certificate provider confirmed (Let's Encrypt - free)
- [ ] Security audit items reviewed:
  - [ ] SSH key authentication strategy
  - [ ] Firewall rules planned
  - [ ] CORS configuration planned
  - [ ] Rate limiting requirements
- [ ] Monitoring/alerting tools selected (UptimeRobot, New Relic, DataDog, etc.)

---

## Phase 2: Domain & DNS Setup

### Domain Registration
- [ ] Domain registered successfully
- [ ] Registrar contact info verified
- [ ] Domain lock enabled
- [ ] WHOIS privacy considered (privacy-protected or public)
- [ ] Auto-renewal enabled

### DNS Configuration
- [ ] DNS provider account created
- [ ] Domain nameservers updated (if using external DNS):
  - [ ] Nameserver 1: ..............................
  - [ ] Nameserver 2: ..............................
- [ ] A records created:
  - [ ] `dosegraph.com` (or your domain) → `123.45.67.89` (VPS IP)
  - [ ] `www.dosegraph.com` → `123.45.67.89`
- [ ] CNAME records created:
  - [ ] `api.dosegraph.com` → `dosegraph.com`
- [ ] DNS propagation verified (nslookup, dig, online checker)
- [ ] DNS failure scenarios planned

---

## Phase 3: VPS & Infrastructure Setup

### VPS Creation
- [ ] VPS instance created with Ubuntu 22.04 LTS
- [ ] SSH key pair generated and stored securely
- [ ] SSH access tested from local machine:
  ```bash
  ssh root@YOUR_VPS_IP
  ```
- [ ] Root account secured:
  - [ ] Password login disabled
  - [ ] SSH key authentication only
- [ ] Non-root user created (`appuser` or similar)
- [ ] Non-root user added to Docker group

### System Configuration
- [ ] System packages updated and upgraded
- [ ] Docker installed and verified:
  ```bash
  docker --version
  ```
- [ ] Docker Compose installed and verified:
  ```bash
  docker-compose --version
  ```
- [ ] Nginx installed and enabled:
  ```bash
  sudo systemctl status nginx
  ```
- [ ] Firewall configured (UFW):
  - [ ] Port 22 (SSH) allowed
  - [ ] Port 80 (HTTP) allowed
  - [ ] Port 443 (HTTPS) allowed
  - [ ] All other ports blocked
  ```bash
  sudo ufw status
  ```

---

## Phase 4: Application Deployment

### Repository Setup
- [ ] Repository cloned to VPS:
  ```bash
  git clone https://github.com/rafireadisten/percentdosegraph.git
  ```
- [ ] Working directory permissions set correctly
- [ ] `.env.production` created with secure values:
  - [ ] JWT_SECRET generated: `openssl rand -base64 32`
  - [ ] AUTH_SECRET generated
  - [ ] All required secrets filled in
- [ ] `.env.production` is NOT committed to Git
- [ ] `.gitignore` includes `.env.production`

### Build & Deployment
- [ ] Node.js dependencies installed:
  ```bash
  npm ci --workspaces --include-workspace-root
  ```
- [ ] Frontend built:
  ```bash
  npm run build:deploy
  ```
- [ ] API built:
  ```bash
  npm run build:api
  ```
- [ ] Docker image built:
  ```bash
  docker build -t pdg-api:latest .
  ```
- [ ] Docker image tested locally:
  ```bash
  docker run -it pdg-api:latest /bin/sh
  ```
- [ ] Docker container started:
  ```bash
  docker-compose up -d
  ```
- [ ] Container health verified:
  ```bash
  docker ps
  docker logs pdg-api
  ```

---

## Phase 5: Reverse Proxy & SSL Setup

### Nginx Configuration
- [ ] Nginx config file created:
  ```bash
  sudo cp config/nginx.dosegraph.conf /etc/nginx/sites-available/dosegraph
  ```
- [ ] Domain names updated in config file (replace `dosegraph.com`)
- [ ] Nginx config syntax validated:
  ```bash
  sudo nginx -t
  ```
- [ ] Nginx site enabled:
  ```bash
  sudo ln -s /etc/nginx/sites-available/dosegraph /etc/nginx/sites-enabled/
  ```
- [ ] Default site disabled (optional):
  ```bash
  sudo rm /etc/nginx/sites-enabled/default
  ```
- [ ] Nginx restarted:
  ```bash
  sudo systemctl restart nginx
  ```

### SSL Certificate
- [ ] Certbot installed and verified:
  ```bash
  certbot --version
  ```
- [ ] SSL certificate generated:
  ```bash
  sudo certbot certonly --standalone -d dosegraph.com -d www.dosegraph.com -d api.dosegraph.com
  ```
- [ ] Certificate placement verified:
  ```bash
  sudo ls -la /etc/letsencrypt/live/dosegraph.com/
  ```
- [ ] SSL Labs test passed (A or A+ rating):
  ```
  https://www.ssllabs.com/ssltest/
  ```
- [ ] Auto-renewal configured:
  ```bash
  sudo systemctl enable certbot.timer
  sudo systemctl start certbot.timer
  ```
- [ ] Auto-renewal tested:
  ```bash
  sudo certbot renew --dry-run
  ```

---

## Phase 6: Testing & Verification

### Connectivity Tests
- [ ] Frontend accessible at https://dosegraph.com
- [ ] WWW redirect working: https://www.dosegraph.com
- [ ] API accessible at https://api.dosegraph.com/api/health
- [ ] Health endpoint returns 200 OK:
  ```bash
  curl -I https://dosegraph.com/api/health
  ```
- [ ] HTTPS redirect working (http → https)

### Functionality Tests
- [ ] React app loads without errors
- [ ] Console JavaScript errors checked (none critical)
- [ ] Patient loading/creation works
- [ ] Medication selection works
- [ ] Dose entry/graphing functional
- [ ] CSV export works
- [ ] Navigation between views works

### Security Tests
- [ ] SSL/TLS certificate valid:
  ```bash
  echo | openssl s_client -connect dosegraph.com:443
  ```
- [ ] Security headers present:
  ```bash
  curl -I https://dosegraph.com | grep -E "Strict-Transport|X-Frame-Options"
  ```
- [ ] No mixed HTTP/HTTPS content (F12 console)
- [ ] CORS working appropriately
- [ ] Authentication endpoints (if applicable) tested

### Performance Tests
- [ ] Page load speed measured (< 3s target)
- [ ] Lighthouse audit run (target: 80+)
  ```bash
  npm run lighthouse
  ```
- [ ] Static assets cached properly (F12 Network tab)
- [ ] API response times acceptable (< 500ms)

---

## Phase 7: Monitoring & Maintenance Setup

### Logging Configuration
- [ ] Application logs accessible:
  ```bash
  docker logs -f pdg-api
  sudo tail -f /var/log/nginx/dosegraph_access.log
  ```
- [ ] Log rotation configured (logrotate)
- [ ] Error logs monitored for anomalies

### Monitoring & Alerts
- [ ] UptimeRobot configured (or alternative):
  - [ ] Monitors https://dosegraph.com
  - [ ] Monitors https://api.dosegraph.com/api/health
  - [ ] Alerts configured for downtime
- [ ] Server metrics monitoring set up (optional):
  - [ ] CPU usage
  - [ ] Memory usage
  - [ ] Disk usage
  - [ ] Network bandwidth
- [ ] Alert thresholds configured

### Backups
- [ ] Backup script created and tested:
  ```bash
  sudo tar -czf /backups/pdg-backup-$(date +\%Y\%m\%d).tar.gz \
    /home/appuser/percentdosegraph/{accounts.json,profiles.json,data/}
  ```
- [ ] Backup automation configured (cron):
  ```bash
  0 2 * * * /home/appuser/backup.sh  # Daily at 2 AM
  ```
- [ ] Backup retention policy set (30 days minimum)
- [ ] Backup recovery tested

---

## Phase 8: CI/CD & Auto-Deployment (Optional)

### GitHub Actions Workflow
- [ ] GitHub Actions enabled in repository settings
- [ ] Deployment workflow created (`.github/workflows/deploy.yml`)
- [ ] SSH key added to GitHub Secrets:
  - [ ] `VPS_SSH_KEY` (private key)
  - [ ] `VPS_HOST` (IP or domain)
  - [ ] `VPS_USER` (appuser)
- [ ] Workflow tested on push to main branch
- [ ] Workflow logs reviewed for errors

---

## Phase 9: Production Hardening

### SSH Hardening
- [ ] Root login disabled in `/etc/ssh/sshd_config`
- [ ] SSH key authentication only (no passwords)
- [ ] SSH port changed (optional non-standard port)
- [ ] Fail2ban configured (optional) to block brute force
- [ ] SSH limits configured

### Application Security
- [ ] Secrets NOT in version control (`.gitignore` verified)
- [ ] CORS configured restrictively
- [ ] Rate limiting enabled
- [ ] Session timeouts configured
- [ ] Input validation on API endpoints
- [ ] SQL injection protections in place (if using DB)

### System Security
- [ ] SELinux or AppArmor considered
- [ ] Sudo access restricted
- [ ] Regular security updates automated
- [ ] Intrusion detection considered (fail2ban, aide)
- [ ] Log aggregation considered (ELK, Datadog)

---

## Phase 10: Documentation & Handoff

### Documentation Created
- [ ] Deployment guide reviewed and updated
- [ ] Emergency procedures documented:
  - [ ] How to restart application
  - [ ] How to rollback deployment
  - [ ] How to access logs
  - [ ] Contact list for critical issues
- [ ] SSH key backup secured (password manager)
- [ ] API documentation updated
- [ ] Architecture diagram updated
- [ ] Runbook created for common tasks

### Handoff Checklist
- [ ] Team trained on deployment process
- [ ] Access credentials shared securely
- [ ] Monitoring dashboards accessible to team
- [ ] On-call rotation established
- [ ] Support contact numbers updated

---

## Go-Live Checklist

- [ ] All previous items marked complete
- [ ] Final health check passed
- [ ] Team standing by for issues
- [ ] Monitoring active
- [ ] Backups verified
- [ ] Rollback plan tested

---

## Post-Deployment (Day 1-7)

- [ ] Monitor error rates and logs
- [ ] User feedback collected
- [ ] Performance metrics reviewed
- [ ] Security logs reviewed for anomalies
- [ ] Backup tested with actual restore
- [ ] Documentation updated based on issues found
- [ ] Team debriefing completed

---

## Post-Deployment (Week 1-4)

- [ ] Weekly security audit
- [ ] Performance optimization review
- [ ] Cost analysis (should be ~$20-32/month)
- [ ] Scaling strategy finalized if needed
- [ ] Feature request backlog prioritized

