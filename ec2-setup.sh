#!/bin/bash

################################################################################
# EC2 Setup Script for Calling App
# 
# This script automates the initial setup of an Ubuntu EC2 instance
# 
# What it does:
# - Installs Docker & Docker Compose
# - Installs Nginx web server
# - Installs Certbot for SSL certificates
# - Configures UFW firewall
# - Sets up unattended security updates
# - Creates necessary directories
# - Optimizes system settings
#
# Usage: sudo ./ec2-setup.sh
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

echo "================================"
echo "EC2 Setup Script Starting..."
echo "================================"
echo ""

################################################################################
# STEP 1: Update System
################################################################################

echo -e "${GREEN}[1/8] Updating system packages...${NC}"
apt update
apt upgrade -y
echo -e "${GREEN}✓ System updated${NC}"
echo ""

################################################################################
# STEP 2: Install Required Packages
################################################################################

echo -e "${GREEN}[2/8] Installing required packages...${NC}"
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    git \
    htop \
    ufw \
    fail2ban
echo -e "${GREEN}✓ Packages installed${NC}"
echo ""

################################################################################
# STEP 3: Install Docker
################################################################################

echo -e "${GREEN}[3/8] Installing Docker...${NC}"

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

echo -e "${GREEN}✓ Docker installed${NC}"
docker --version
echo ""

################################################################################
# STEP 4: Install Docker Compose (standalone)
################################################################################

echo -e "${GREEN}[4/8] Installing Docker Compose...${NC}"

# Download latest stable release
DOCKER_COMPOSE_VERSION="v2.24.0"
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
chmod +x /usr/local/bin/docker-compose

# Create symlink
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

echo -e "${GREEN}✓ Docker Compose installed${NC}"
docker-compose --version
echo ""

################################################################################
# STEP 5: Install Nginx
################################################################################

echo -e "${GREEN}[5/8] Installing Nginx...${NC}"

apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

echo -e "${GREEN}✓ Nginx installed${NC}"
nginx -v
echo ""

################################################################################
# STEP 6: Install Certbot (for SSL)
################################################################################

echo -e "${GREEN}[6/8] Installing Certbot...${NC}"

apt install -y certbot python3-certbot-nginx

echo -e "${GREEN}✓ Certbot installed${NC}"
certbot --version
echo ""

################################################################################
# STEP 7: Configure Firewall (UFW)
################################################################################

echo -e "${GREEN}[7/8] Configuring firewall...${NC}"

# Reset UFW to default
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (important!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow port 3000 for testing (remove after deployment)
ufw allow 3000/tcp

# Enable UFW
ufw --force enable

echo -e "${GREEN}✓ Firewall configured${NC}"
ufw status
echo ""

################################################################################
# STEP 8: Setup Unattended Upgrades (Security)
################################################################################

echo -e "${GREEN}[8/8] Setting up automatic security updates...${NC}"

apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Configure automatic updates
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

echo -e "${GREEN}✓ Automatic updates configured${NC}"
echo ""

################################################################################
# Additional Optimizations
################################################################################

echo -e "${YELLOW}Applying system optimizations...${NC}"

# Increase file descriptors limit
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
ubuntu soft nofile 65536
ubuntu hard nofile 65536
EOF

# Optimize sysctl for web server
cat > /etc/sysctl.d/99-custom.conf << 'EOF'
# Network optimizations
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# Memory optimizations
vm.swappiness = 10
vm.vfs_cache_pressure = 50
EOF

# Apply sysctl changes
sysctl -p /etc/sysctl.d/99-custom.conf > /dev/null 2>&1

echo -e "${GREEN}✓ System optimized${NC}"
echo ""

################################################################################
# Create Directory Structure
################################################################################

echo -e "${YELLOW}Creating directory structure...${NC}"

# Create app directory
mkdir -p /opt/calling-app
chown -R ubuntu:ubuntu /opt/calling-app

# Create logs directory
mkdir -p /var/log/calling-app
chown -R ubuntu:ubuntu /var/log/calling-app

# Create backup directory
mkdir -p /opt/backups
chown -R ubuntu:ubuntu /opt/backups

echo -e "${GREEN}✓ Directories created${NC}"
echo ""

################################################################################
# Setup Fail2Ban (Brute Force Protection)
################################################################################

echo -e "${YELLOW}Configuring Fail2Ban...${NC}"

# Create local jail configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

# Restart Fail2Ban
systemctl restart fail2ban
systemctl enable fail2ban

echo -e "${GREEN}✓ Fail2Ban configured${NC}"
echo ""

################################################################################
# Create Helpful Aliases
################################################################################

echo -e "${YELLOW}Creating helpful aliases...${NC}"

# Add aliases to ubuntu user's bashrc
cat >> /home/ubuntu/.bashrc << 'EOF'

# Calling App Aliases
alias app-logs='docker-compose -f /home/ubuntu/calling-app/docker-compose.yml logs -f'
alias app-status='docker-compose -f /home/ubuntu/calling-app/docker-compose.yml ps'
alias app-restart='docker-compose -f /home/ubuntu/calling-app/docker-compose.yml restart'
alias app-stop='docker-compose -f /home/ubuntu/calling-app/docker-compose.yml stop'
alias app-start='docker-compose -f /home/ubuntu/calling-app/docker-compose.yml start'
alias app-deploy='cd /home/ubuntu/calling-app && ./deploy.sh'
alias sys-stats='htop'
alias disk-usage='df -h'
alias check-ports='sudo netstat -tulpn'
EOF

chown ubuntu:ubuntu /home/ubuntu/.bashrc

echo -e "${GREEN}✓ Aliases created${NC}"
echo ""

################################################################################
# Final Summary
################################################################################

echo "================================"
echo -e "${GREEN}✓ EC2 Setup Complete!${NC}"
echo "================================"
echo ""
echo "Installed Components:"
echo "  ✓ Docker $(docker --version | cut -d' ' -f3)"
echo "  ✓ Docker Compose $(docker-compose --version | cut -d' ' -f4)"
echo "  ✓ Nginx $(nginx -v 2>&1 | cut -d'/' -f2)"
echo "  ✓ Certbot $(certbot --version 2>&1 | cut -d' ' -f2)"
echo "  ✓ UFW Firewall"
echo "  ✓ Fail2Ban"
echo "  ✓ Unattended Upgrades"
echo ""
echo "System Optimizations:"
echo "  ✓ File descriptor limits increased"
echo "  ✓ Network parameters optimized"
echo "  ✓ Memory settings tuned"
echo ""
echo "Security:"
echo "  ✓ Firewall enabled (ports 22, 80, 443, 3000)"
echo "  ✓ Fail2Ban configured"
echo "  ✓ Automatic security updates enabled"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Logout and login again (to apply Docker group)"
echo "  2. Clone your application repository"
echo "  3. Run the deployment script"
echo ""
echo -e "${YELLOW}Helpful Commands:${NC}"
echo "  app-status    - Check container status"
echo "  app-logs      - View application logs"
echo "  app-restart   - Restart application"
echo "  app-deploy    - Deploy updates"
echo "  sys-stats     - View system resources"
echo ""
echo -e "${GREEN}Setup completed successfully!${NC}"
echo "================================"
