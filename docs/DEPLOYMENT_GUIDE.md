# NoTrack Deployment Guide

> **Operation Sky-Link: Zero to Live - Complete Production Deployment**

This comprehensive guide walks you through deploying NoTrack to AWS EC2 from scratch, including domain configuration, SSL setup, and production hardening.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Overview](#deployment-overview)
3. [Phase 1: AWS Infrastructure Setup](#phase-1-aws-infrastructure-setup)
4. [Phase 2: DNS Configuration](#phase-2-dns-configuration)
5. [Phase 3: Server Preparation](#phase-3-server-preparation)
6. [Phase 4: Security Configuration](#phase-4-security-configuration)
7. [Phase 5: Application Deployment](#phase-5-application-deployment)
8. [Phase 6: SSL Certificate Setup](#phase-6-ssl-certificate-setup)
9. [Phase 7: Nginx Configuration](#phase-7-nginx-configuration)
10. [Phase 8: Final Verification](#phase-8-final-verification)
11. [Post-Deployment](#post-deployment)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You'll Need

- **Domain Names**: 
  - Primary domain: `notrack.co.uk`
  - Signaling subdomain: `signal.notrack.co.uk`
- **AWS Account**: Free tier eligible
- **TURN Server Credentials**: From [Metered.ca](https://metered.ca) or similar
- **Local Machine**: With terminal access (Windows/Mac/Linux)
- **Code Repository**: Cloned locally

### Required Knowledge

- Basic command line usage
- Understanding of SSH
- Basic DNS concepts
- Git basics

### Time Required

- **First-time deployment**: 1-2 hours
- **Subsequent deployments**: 15-30 minutes

---

## Deployment Overview

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              Internet / Users                        │
└────────────────┬────────────────────────────────────┘
                 │
      ┌──────────┴───────────┐
      │                      │
┌─────▼──────┐      ┌────────▼─────┐
│  notrack   │      │    signal    │
│  .co.uk    │      │ .notrack.uk  │
└─────┬──────┘      └────────┬─────┘
      │                      │
      │    DNS Records       │
      │    (A Records)       │
      │                      │
      └──────────┬───────────┘
                 │
      ┌──────────▼────────────┐
      │  AWS EC2 Instance     │
      │  Ubuntu 24.04 LTS     │
      │  ┌──────────────────┐ │
      │  │   Nginx Proxy    │ │
      │  │   SSL Certs      │ │
      │  └────────┬─────────┘ │
      │           │            │
      │  ┌────────▼─────────┐ │
      │  │   Docker         │ │
      │  │   ┌──────────┐   │ │
      │  │   │  Server  │   │ │
      │  │   │  :3000   │   │ │
      │  │   └────┬─────┘   │ │
      │  │        │          │ │
      │  │   ┌────▼─────┐   │ │
      │  │   │  Redis   │   │ │
      │  │   │  :6379   │   │ │
      │  │   └──────────┘   │ │
      │  └──────────────────┘ │
      └───────────────────────┘
```

---

## Phase 1: AWS Infrastructure Setup

### Step 1: Launch EC2 Instance

1. **Log in to AWS Console**
   - Navigate to: https://console.aws.amazon.com/
   - Search for "EC2" in the services search bar

2. **Start Instance Creation**
   - Click **"Launch Instance"** (orange button)

3. **Configure Instance Details**:

   **Name and Tags**:
   ```
   Name: NoTrack-Server
   ```

   **Application and OS Images**:
   ```
   Operating System: Ubuntu
   Version: Ubuntu Server 24.04 LTS (HVM)
   Architecture: 64-bit (x86)
   ```
   ✅ Look for "Free tier eligible" label

   **Instance Type**:
   ```
   Type: t2.micro
   vCPUs: 1
   Memory: 1 GiB
   ```
   ✅ Free tier eligible for 750 hours/month

4. **Create Key Pair**:
   - Click **"Create new key pair"**
   - Settings:
     ```
     Name: notrack-key
     Type: RSA
     Format: .pem (for Mac/Linux) or .ppk (for PuTTY on Windows)
     ```
   - Click **"Create key pair"**
   - **IMPORTANT**: Save the downloaded file securely
   - Recommended location: `~/.ssh/notrack-key.pem`

5. **Network Settings**:
   
   Configure security group rules:
   
   - ✅ **Allow SSH traffic from**: My IP
     ```
     Type: SSH
     Protocol: TCP
     Port: 22
     Source: My IP (auto-detected)
     ```
   
   - ✅ **Allow HTTPS traffic from the internet**
     ```
     Type: HTTPS
     Protocol: TCP
     Port: 443
     Source: 0.0.0.0/0 (anywhere)
     ```
   
   - ✅ **Allow HTTP traffic from the internet**
     ```
     Type: HTTP
     Protocol: TCP
     Port: 80
     Source: 0.0.0.0/0 (anywhere)
     ```

6. **Configure Storage**:
   ```
   Size: 8 GB (default)
   Volume Type: gp3 (General Purpose SSD)
   ```

7. **Advanced Details** (Optional but Recommended):
   ```
   User data (optional):
   #!/bin/bash
   apt-get update
   apt-get upgrade -y
   ```

8. **Review and Launch**:
   - Review all settings
   - Click **"Launch instance"**

9. **Wait for Instance to Start**:
   - Go to **"Instances"** in the left sidebar
   - Wait until **"Instance State"** shows **"Running"**
   - Wait until **"Status check"** shows **"2/2 checks passed"**

10. **Copy Public IP Address**:
    ```
    Example: 54.123.45.67
    ```
    We'll call this `YOUR_AWS_IP` throughout this guide.

---

## Phase 2: DNS Configuration

### Configure Your Domain Registrar

Go to where you purchased `notrack.co.uk` (GoDaddy, Namecheap, Cloudflare, etc.).

### Step 1: Access DNS Management

1. Log in to your domain registrar
2. Find "DNS Management" or "Manage DNS"
3. Locate the DNS records section

### Step 2: Clean Up Existing Records

**Delete any existing records that conflict**:
- Remove parking page A records
- Remove default CNAME records
- Keep MX records (email) if needed
- Keep TXT records (verification) if needed

### Step 3: Add A Records

**Record 1 - Client Domain (notrack.co.uk)**:
```
Type: A
Name/Host: @
Value/Points to: YOUR_AWS_IP (e.g., 54.123.45.67)
TTL: Automatic (or 3600 seconds)
```

**Record 2 - WWW Subdomain** (Optional but recommended):
```
Type: A
Name/Host: www
Value/Points to: YOUR_AWS_IP
TTL: Automatic (or 3600 seconds)
```

**Record 3 - Signaling Server Subdomain**:
```
Type: A
Name/Host: signal
Value/Points to: YOUR_AWS_IP
TTL: Automatic (or 3600 seconds)
```

### Step 4: Verify DNS Propagation

**Note**: DNS changes can take 10-30 minutes to propagate globally.

**Check propagation**:
```bash
# Check main domain
nslookup notrack.co.uk

# Check signaling subdomain
nslookup signal.notrack.co.uk

# Or use online tools
# https://www.whatsmydns.net/
```

---

## Phase 3: Server Preparation

### Step 1: Set Key Permissions (Mac/Linux Only)

```bash
# Navigate to where you saved the key
cd ~/.ssh/

# Set correct permissions
chmod 400 notrack-key.pem

# Verify
ls -l notrack-key.pem
# Should show: -r--------
```

**Windows Users**: Use PuTTY and convert `.pem` to `.ppk` format using PuTTYgen.

### Step 2: Connect via SSH

```bash
# Replace with your actual key path and IP
ssh -i "~/.ssh/notrack-key.pem" ubuntu@YOUR_AWS_IP

# Example:
ssh -i "~/.ssh/notrack-key.pem" ubuntu@54.123.45.67
```

**First Connection**:
- You'll see a message: "Are you sure you want to continue connecting?"
- Type `yes` and press Enter

**Successful Connection**:
```
Welcome to Ubuntu 24.04 LTS
...
ubuntu@ip-172-31-x-x:~$
```

### Step 3: Update System

```bash
# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# This may take 5-10 minutes
```

### Step 4: Install Required Software

```bash
# Install Docker, Docker Compose, Git, Nginx, and Unzip
sudo apt install docker.io docker-compose git nginx unzip -y

# Enable Docker to start on boot
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group (no sudo needed for docker)
sudo usermod -aG docker ubuntu

# Verify Docker installation
docker --version
```

### Step 5: Create Swap File

**Critical for Free Tier**: Prevents out-of-memory crashes

```bash
# Create 1GB swap file
sudo fallocate -l 1G /swapfile

# Set correct permissions
sudo chmod 600 /swapfile

# Set up swap space
sudo mkswap /swapfile

# Enable swap
sudo swapon /swapfile

# Make swap permanent (survives reboot)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap is active
free -h
# Should show 1GB in Swap row
```

### Step 6: Logout and Login

**Important**: Logout to apply Docker group permissions

```bash
# Logout
exit

# SSH back in
ssh -i "~/.ssh/notrack-key.pem" ubuntu@YOUR_AWS_IP

# Test Docker without sudo
docker ps
# Should work without permission error
```

---

## Phase 4: Security Configuration

### Step 1: Generate New JWT Secret

On your **local machine**:

```bash
# Generate a random 32-character secret
openssl rand -base64 32

# Or use this Node.js method
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Save this secret - you'll need it later
```

### Step 2: Get New TURN Credentials

1. Go to [Metered.ca](https://metered.ca) or your TURN provider
2. Create a free account
3. Get new credentials:
   - Username
   - Credential/Password
4. Save these - you'll need them for client configuration

---

## Phase 5: Application Deployment

### Step 1: Build Client Locally

**Why build locally?** 
- Building React on t2.micro can cause out-of-memory errors
- Local build is faster and more reliable

On your **local machine**:

```bash
# Navigate to your project
cd /path/to/your/project

# Update client environment variables
cd app/client
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

**Client .env Configuration**:
```env
# Server URL (production)
VITE_SERVER_URL=https://signal.notrack.co.uk

# TURN Server Configuration
VITE_TURN_USERNAME=your-new-turn-username
VITE_TURN_CREDENTIAL=your-new-turn-credential
VITE_TURN_URLS=turn:your-turn-server:3478

# Sentry (optional)
VITE_SENTRY_DSN=your-sentry-dsn-if-you-have-one
```

**Build the client**:
```bash
# Install dependencies
npm install

# Build for production
npm run build

# This creates a 'dist' folder with optimized files
```

### Step 2: Upload Client Files to Server

From your **local machine**:

```bash
# Navigate to project root
cd /path/to/your/project

# Upload the dist folder to AWS
scp -i "~/.ssh/notrack-key.pem" -r app/client/dist ubuntu@YOUR_AWS_IP:~/client-build

# This may take a few minutes depending on your connection
```

### Step 3: Setup Server Code on AWS

Back on the **AWS SSH** session:

```bash
# Clone your repository
git clone https://github.com/Erikoliva1/no-call.git notrack

# Navigate to project
cd notrack

# Move uploaded client files
sudo mkdir -p /var/www/notrack/dist
sudo cp -r ~/client-build/* /var/www/notrack/dist/

# Verify files copied
ls -la /var/www/notrack/dist/
```

### Step 4: Create Production Environment File

```bash
# Navigate to server directory
cd ~/notrack/app/server

# Create production .env file
nano .env
```

**Server .env Configuration**:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-generated-jwt-secret-from-step-4.1

# CORS Configuration
ALLOWED_ORIGINS=https://notrack.co.uk,https://www.notrack.co.uk

# Redis Configuration
USE_REDIS=true
REDIS_HOST=redis
REDIS_PORT=6379

# Security
USE_HTTPS=false  # Docker internal HTTP (Nginx handles HTTPS)
ENABLE_GUEST_ACCESS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn

# TURN Server
TURN_USERNAME=your-turn-username
TURN_CREDENTIAL=your-turn-credential

# Heartbeat
HEARTBEAT_INTERVAL_MS=30000
```

**Save and exit**:
- Press `Ctrl+O` to save
- Press `Enter` to confirm
- Press `Ctrl+X` to exit

### Step 5: Start Docker Services

```bash
# Navigate to project root
cd ~/notrack

# Start services in background
sudo docker-compose up -d --build

# This will:
# 1. Build the server container
# 2. Pull Redis image
# 3. Start both services
# Takes 5-10 minutes on first run
```

**Monitor progress**:
```bash
# Watch logs
sudo docker-compose logs -f

# Press Ctrl+C to stop watching (services keep running)
```

**Verify services are running**:
```bash
# Check container status
sudo docker ps

# Should see two containers:
# - notrack-server (Node.js app)
# - redis (Redis cache)
```

**Test server locally**:
```bash
# Test health endpoint
curl http://localhost:3000/

# Should return JSON with server info
```

---

## Phase 6: SSL Certificate Setup

### Step 1: Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Stop Nginx (if running)

```bash
# Stop Nginx to free port 80
sudo systemctl stop nginx
```

### Step 3: Request SSL Certificates

```bash
# Request certificates for all domains
sudo certbot certonly --standalone \
  -d notrack.co.uk \
  -d www.notrack.co.uk \
  -d signal.notrack.co.uk \
  --non-interactive \
  --agree-tos \
  --email admin@notrack.co.uk

# Follow the prompts:
# 1. Enter email: admin@notrack.co.uk
# 2. Agree to terms: Y
# 3. Share email (optional): N or Y
```

**Successful Output**:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/notrack.co.uk/fullchain.pem
Key is saved at: /etc/letsencrypt/live/notrack.co.uk/privkey.pem
```

### Step 4: Set Up Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e

# Add this line (runs twice daily):
0 0,12 * * * certbot renew --quiet
```

---

## Phase 7: Nginx Configuration

### Step 1: Create Nginx Configuration

```bash
# Backup default config
sudo mv /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Create new config
sudo nano /etc/nginx/sites-available/default
```

### Step 2: Add Nginx Configuration

**Copy and paste this entire configuration**:

```nginx
# ============================================================================
# CLIENT DOMAIN (notrack.co.uk)
# ============================================================================

# HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name notrack.co.uk www.notrack.co.uk;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name notrack.co.uk www.notrack.co.uk;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/notrack.co.uk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notrack.co.uk/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Static Files (React Build)
    root /var/www/notrack/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Client-Side Routing (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache Static Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# ============================================================================
# SIGNALING SERVER (signal.notrack.co.uk)
# ============================================================================

# HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name signal.notrack.co.uk;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name signal.notrack.co.uk;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/notrack.co.uk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notrack.co.uk/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy to Node.js Server
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket Support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Save and exit**:
- Press `Ctrl+O`, then `Enter`
- Press `Ctrl+X`

### Step 3: Test and Start Nginx

```bash
# Test configuration
sudo nginx -t

# Should output:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Start Nginx
sudo systemctl start nginx

# Enable Nginx on boot
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## Phase 8: Final Verification

### Step 1: Check Server Status

```bash
# Check Docker containers
sudo docker ps

# Check Nginx status
sudo systemctl status nginx

# Check SSL certificates
sudo certbot certificates
```

### Step 2: Test Endpoints

**From your local machine**:

```bash
# Test main domain (should redirect to HTTPS)
curl -I http://notrack.co.uk

# Test HTTPS
curl -I https://notrack.co.uk

# Test signaling server
curl https://signal.notrack.co.uk/

# Should return JSON with server info
```

### Step 3: Browser Verification

1. **Open Client**: https://notrack.co.uk
   - ✅ Page loads with cyberpunk UI
   - ✅ Green padlock in browser (SSL valid)
   - ✅ No console errors (press F12)

2. **Check Connection Status**:
   - ✅ "Connected" indicator visible
   - ✅ Console shows: "Connected to signaling server"

3. **Test API Docs**: https://signal.notrack.co.uk/api-docs
   - ✅ Swagger UI loads
   - ✅ Can view all endpoints

4. **Test Metrics**: https://signal.notrack.co.uk/metrics
   - ✅ Prometheus metrics display

### Step 4: Test Calling Functionality

1. Open two browser tabs/windows
2. Click "AUTHENTICATE" in both
3. Note the extension numbers (e.g., 123-456, 789-012)
4. In one tab, dial the other extension
5. Accept the call in the second tab
6. Verify audio connection

**Successful Call**:
- ✅ Call connects
- ✅ Audio flows bidirectionally
- ✅ Call logs updated
- ✅ No errors in console

---

## Post-Deployment

### Security Hardening

#### 1. Enable UFW Firewall

```bash
# Enable UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Verify
sudo ufw status
```

#### 2. Configure Fail2Ban

```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
sudo nano /etc/fail2ban/jail.local

# Add under [sshd]:
enabled = true
maxretry = 3
bantime = 3600

# Restart
sudo systemctl restart fail2ban
```

#### 3. Setup Automatic Updates

```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades -y

# Enable
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Select: Yes
```

### Monitoring Setup

#### 1. Setup Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/notrack

# Add:
/var/log/notrack/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
}
```

#### 2. Setup Monitoring Alerts

```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Monitor resources
htop

# Monitor Docker logs
sudo docker-compose -f ~/notrack/docker-compose.yml logs -f
```

### Backup Strategy

#### 1. Backup Scripts

```bash
# Create backup script
nano ~/backup-notrack.sh

# Add:
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup configs
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
  ~/notrack/app/server/.env \
  /etc/nginx/sites-available/default

# Backup Redis data (if using persistence)
docker exec redis redis-cli SAVE
cp /var/lib/docker/volumes/redis-data/_data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

echo "Backup completed: $BACKUP_DIR"

# Make executable
chmod +x ~/backup-notrack.sh

# Test
./backup-notrack.sh
```

#### 2. Schedule Backups

```bash
# Add to crontab
crontab -e

# Add daily backup at 2 AM:
0 2 * * * /home/ubuntu/backup-notrack.sh
```

---

## Troubleshooting

### Common Issues

#### 1. DNS Not Resolving

**Problem**: Domain doesn't point to server

**Solution**:
```bash
# Check DNS propagation
nslookup notrack.co.uk
nslookup signal.notrack.co.uk

# If not resolved:
# - Wait 30 minutes for propagation
# - Verify DNS records in registrar
# - Try different DNS server: nslookup notrack.co.uk 8.8.8.8
```

#### 2. SSL Certificate Fails

**Problem**: Certbot can't verify domain

**Solution**:
```bash
# Ensure port 80 is accessible
sudo ufw allow 80/tcp

# Stop Nginx
sudo systemctl stop nginx

# Try again
sudo certbot certonly --standalone -d notrack.co.uk -d www.notrack.co.uk -d signal.notrack.co.uk

# Check errors in:
sudo cat /var/log/letsencrypt/letsencrypt.log
```

#### 3. Docker Containers Won't Start

**Problem**: Containers fail to start

**Solution**:
```bash
# Check logs
sudo docker-compose -f ~/notrack/docker-compose.yml logs

# Common fixes:
# - Check .env file syntax
# - Verify ports not in use
# - Restart Docker:
sudo systemctl restart docker
sudo docker-compose -f ~/notrack/docker-compose.yml up -d --force-recreate
```

#### 4. WebSocket Connection Fails

**Problem**: Client can't connect to signaling server

**Solution**:
```bash
# Test server directly
curl https://signal.notrack.co.uk/

# Check Nginx proxy
sudo nginx -t
sudo systemctl restart nginx

# Check server logs
sudo docker-compose -f ~/notrack/docker-compose.yml logs server

# Verify environment variables
cat ~/notrack/app/server/.env | grep ALLOWED_ORIGINS
```

#### 5. Out of Memory Errors

**Problem**: Server crashes with memory errors

**Solution**:
```bash
# Check swap
free -h

# If swap not active:
sudo swapon /swapfile

# Add more swap if needed:
sudo fallocate -l 2G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2
```

### Getting Help

If you encounter issues:

1. Check logs:
   ```bash
   # Server logs
   sudo docker-compose -f ~/notrack/docker-compose.yml logs server

   # Nginx logs
   sudo tail -f /var/log/nginx/error.log

   # System logs
   sudo journalctl -xe
   ```

2. Contact support:
   - Email: admin@notrack.co.uk
   - GitHub Issues: https://github.com/Erikoliva1/no-call/issues

---

## Maintenance

### Regular Tasks

#### Daily
- Monitor server health: `sudo docker ps`
- Check disk space: `df -h`

#### Weekly
- Review logs for errors
- Check SSL certificate validity: `sudo certbot certificates`
- Verify backups exist

#### Monthly
- Update system packages: `sudo apt update && sudo apt upgrade -y`
- Review and analyze metrics
- Test disaster recovery procedures

### Updates

#### Application Updates

```bash
# SSH into server
ssh -i "~/.ssh/notrack-key.pem" ubuntu@YOUR_AWS_IP

# Pull latest code
cd ~/notrack
git pull origin main

# Rebuild and restart
sudo docker-compose down
sudo docker-compose up -d --build

# Verify
sudo docker ps
```

#### System Updates

```bash
# Update packages
sudo apt update
sudo apt upgrade -y

# Reboot if kernel updated
sudo reboot
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Stop current containers
sudo docker-compose -f ~/notrack/docker-compose.yml down

# Revert to previous commit
cd ~/notrack
git log --oneline  # Find previous commit
git checkout <commit-hash>

# Rebuild
sudo docker-compose up -d --build
```

### Complete Restore

```bash
# Stop everything
sudo docker-compose -f ~/notrack/docker-compose.yml down

# Restore configs from backup
tar -xzf ~/backups/config_YYYYMMDD_HHMMSS.tar.gz -C /

# Restart
sudo docker-compose -f ~/notrack/docker-compose.yml up -d
```

---

## Congratulations! 🎉

Your NoTrack application is now live and production-ready!

**Live URLs**:
- Client: https://notrack.co.uk
- API: https://signal.notrack.co.uk
- Docs: https://signal.notrack.co.uk/api-docs
- Metrics: https://signal.notrack.co.uk/metrics

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-22  
**Contact**: admin@notrack.co.uk
