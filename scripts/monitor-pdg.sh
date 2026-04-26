#!/bin/bash
# PDG Deployment Health Check Script
# Usage: bash monitor-pdg.sh
# Or: bash monitor-pdg.sh https://dosegraph.com

DOMAIN="${1:-https://dosegraph.com}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "PDG Health Check - $TIMESTAMP"
echo "========================================"
echo ""

# Helper functions
check_pass() {
    echo -e "${GREEN}✓ PASS${NC} - $1"
}

check_fail() {
    echo -e "${RED}✗ FAIL${NC} - $1"
}

check_warn() {
    echo -e "${YELLOW}⚠ WARN${NC} - $1"
}

# 1. Domain DNS Check
echo "1. DNS & Domain Tests"
echo "-------------------"
DOMAIN_URL=$(echo $DOMAIN | sed 's|https://||g' | sed 's|http://||g')
if dig +short $DOMAIN_URL @8.8.8.8 | grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" > /dev/null; then
    check_pass "DNS resolves: $DOMAIN_URL"
else
    check_fail "DNS resolution: $DOMAIN_URL"
fi

# 2. Frontend HTTP Tests
echo ""
echo "2. Frontend Availability"
echo "------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    check_pass "Frontend responds (HTTP $HTTP_CODE)"
else
    check_fail "Frontend HTTP response: $HTTP_CODE"
fi

# 3. HTTPS Certificate Check
echo ""
echo "3. SSL/TLS Certificate"
echo "----------------------"
CERT_EXPIRY=$(echo | openssl s_client -servername $(echo $DOMAIN_URL | cut -d: -f1) -connect $(echo $DOMAIN_URL | cut -d: -f1):443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ ! -z "$CERT_EXPIRY" ]; then
    check_pass "SSL certificate expires: $CERT_EXPIRY"
else
    check_fail "SSL certificate not found or expired"
fi

# 4. API Health Check
echo ""
echo "4. API Health"
echo "-------------"
API_HEALTH=$(curl -s -X GET "$DOMAIN/api/health" 2>/dev/null | grep -E '"status"|"healthy"')
if [ ! -z "$API_HEALTH" ]; then
    check_pass "API health endpoint: $API_HEALTH"
else
    check_fail "API health endpoint response"
fi

# 5. Security Headers Check
echo ""
echo "5. Security Headers"
echo "-------------------"
HEADERS=$(curl -s -I "$DOMAIN" 2>/dev/null)

# Check HSTS
if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
    check_pass "HSTS header present"
else
    check_warn "HSTS header missing"
fi

# Check X-Frame-Options
if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
    check_pass "X-Frame-Options header present"
else
    check_warn "X-Frame-Options header missing"
fi

# Check X-Content-Type-Options
if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
    check_pass "X-Content-Type-Options header present"
else
    check_warn "X-Content-Type-Options header missing"
fi

# 6. Page Load Performance
echo ""
echo "6. Performance"
echo "-------------"
START_TIME=$(date +%s%N)
HTTP_CODE=$(curl -s -o /dev/null -w "%{time_total}" "$DOMAIN" 2>/dev/null)
END_TIME=$(date +%s%N)
LOAD_TIME=$(echo "$HTTP_CODE * 1000" | bc)

if (( $(echo "$LOAD_TIME < 3000" | bc -l) )); then
    check_pass "Page load time: ${LOAD_TIME}ms (target: <3s)"
else
    check_warn "Page load time: ${LOAD_TIME}ms (target: <3s)"
fi

# 7. Docker Status (if SSH available)
echo ""
echo "7. Docker & Services"
echo "-------------------"
if command -v docker &> /dev/null; then
    RUNNING=$(docker ps | wc -l)
    if [ $RUNNING -gt 1 ]; then
        check_pass "Docker daemon running ($(($RUNNING - 1)) containers)"
    else
        check_fail "No Docker containers running"
    fi
    
    if docker ps | grep -q pdg-api; then
        check_pass "PDG API container running"
    else
        check_warn "PDG API container not found"
    fi
else
    check_warn "Docker not available (local check only)"
fi

# 8. Disk Space Check
echo ""
echo "8. System Resources"
echo "-------------------"
if command -v df &> /dev/null; then
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//g')
    if [ "$DISK_USAGE" -lt 80 ]; then
        check_pass "Disk usage: ${DISK_USAGE}%"
    elif [ "$DISK_USAGE" -lt 90 ]; then
        check_warn "Disk usage: ${DISK_USAGE}% (over 80%)"
    else
        check_fail "Disk usage: ${DISK_USAGE}% (critical - over 90%)"
    fi
fi

if command -v free &> /dev/null; then
    MEM_USAGE=$(free | awk 'NR==2 {printf("%.0f", $3/$2 * 100)}')
    if [ "$MEM_USAGE" -lt 80 ]; then
        check_pass "Memory usage: ${MEM_USAGE}%"
    elif [ "$MEM_USAGE" -lt 90 ]; then
        check_warn "Memory usage: ${MEM_USAGE}% (over 80%)"
    else
        check_fail "Memory usage: ${MEM_USAGE}% (critical - over 90%)"
    fi
fi

# 9. Nginx Status Check
echo ""
echo "9. Nginx Server"
echo "---------------"
if command -v nginx &> /dev/null; then
    if sudo systemctl is-active --quiet nginx; then
        check_pass "Nginx service running"
    else
        check_fail "Nginx service not running"
    fi
    
    SYNTAX=$(sudo nginx -t 2>&1)
    if echo "$SYNTAX" | grep -q "successful"; then
        check_pass "Nginx config syntax valid"
    else
        check_warn "Nginx config syntax check"
    fi
else
    check_warn "Nginx not found (local check only)"
fi

# 10. Certbot Status
echo ""
echo "10. SSL Certificate Auto-Renewal"
echo "--------------------------------"
if command -v certbot &> /dev/null; then
    CERT_RENEW=$(sudo certbot renew --dry-run 2>&1 | grep -E "congratulations|no action")
    check_pass "Certbot auto-renewal ready"
else
    check_warn "Certbot not found"
fi

# Summary
echo ""
echo "========================================"
echo "Summary"
echo "========================================"
echo "Domain: $DOMAIN"
echo "Timestamp: $TIMESTAMP"
echo ""
echo "Next actions if issues found:"
echo "1. Check logs: docker logs pdg-api"
echo "2. Check Nginx: sudo systemctl status nginx"
echo "3. Check DNS: dig $DOMAIN_URL"
echo "4. Restart services: docker-compose restart"
echo "========================================"
