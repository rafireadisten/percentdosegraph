#!/bin/bash
# VPS Deployment Setup Script
# Usage: bash setup-vps.sh <domain_name> <app_user>
# Example: bash setup-vps.sh dosegraph.com appuser

set -e  # Exit on error

DOMAIN=${1:-dosegraph.com}
APP_USER=${2:-appuser}
VPS_IP=$(hostname -I | awk '{print $1}')

echo "========================================="
echo "PDG VPS Deployment Setup"
echo "========================================="
echo "Domain: $DOMAIN"
echo "App User: $APP_USER"
echo "VPS IP: $VPS_IP"
echo "========================================="

# 1. System Updates
echo "[1/8] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
echo "[2/8] Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $APP_USER
rm get-docker.sh

# 3. Install Docker Compose
echo "[3/8] Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Install Nginx & Certbot
echo "[4/8] Installing Nginx and Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx

# 5. Start Nginx
echo "[5/8] Starting Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# 6. Configure Firewall (UFW)
echo "[6/8] Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

# 7. Create app directory
echo "[7/8] Creating application directory..."
APP_DIR="/home/$APP_USER/percentdosegraph"
if [ ! -d "$APP_DIR" ]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

# 8. Create systemd service for Docker Compose
echo "[8/8] Creating systemd service..."
sudo tee /etc/systemd/system/pdg-app.service > /dev/null <<EOF
[Unit]
Description=PDG Application Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable pdg-app.service

echo ""
echo "========================================="
echo "✓ VPS Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Clone repository:"
echo "   git clone https://github.com/rafireadisten/percentdosegraph.git $APP_DIR"
echo ""
echo "2. Create .env.production in $APP_DIR:"
echo "   cp .env.example .env.production"
echo "   nano .env.production  # Edit with secure secrets"
echo ""
echo "3. Generate JWT_SECRET:"
echo "   openssl rand -base64 32"
echo ""
echo "4. Configure Nginx:"
echo "   sudo nano /etc/nginx/sites-available/dosegraph"
echo "   sudo ln -s /etc/nginx/sites-available/dosegraph /etc/nginx/sites-enabled/"
echo ""
echo "5. Generate SSL certificate:"
echo "   sudo certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "6. Build and deploy:"
echo "   cd $APP_DIR"
echo "   npm install"
echo "   npm run build:all"
echo "   docker-compose up -d"
echo ""
echo "7. Check status:"
echo "   docker ps"
echo "   sudo systemctl status pdg-app"
echo "   curl https://localhost/api/health"
echo ""
echo "========================================="
