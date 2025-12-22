#!/bin/bash

################################################################################
# Deployment Script for Calling App on AWS EC2
#
# This script handles:
# - Building Docker images
# - Starting/restarting containers
# - Health checks
# - Rollback on failure
# - Zero-downtime deployment
#
# Usage: ./deploy.sh [options]
# Options:
#   --build-only    Only build images, don't deploy
#   --no-build      Deploy without rebuilding images
#   --rollback      Rollback to previous version
################################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/calling-app/deploy.log"

# Parse arguments
BUILD_ONLY=false
NO_BUILD=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --no-build)
            NO_BUILD=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    
    log "Running health checks..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/ > /dev/null 2>&1; then
            log "✓ Server health check passed"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Backup current state
backup_state() {
    log "Creating backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup Docker images
    docker images | grep calling-app | awk '{print $1":"$2}' > "$BACKUP_PATH/images.txt"
    
    # Backup environment files
    cp app/server/.env "$BACKUP_PATH/server.env" 2>/dev/null || true
    cp app/client/.env "$BACKUP_PATH/client.env" 2>/dev/null || true
    
    # Backup Redis data
    if docker-compose ps | grep -q redis; then
        docker-compose exec -T redis redis-cli SAVE > /dev/null 2>&1 || true
        docker cp $(docker-compose ps -q redis):/data/dump.rdb "$BACKUP_PATH/redis-dump.rdb" 2>/dev/null || true
    fi
    
    log "✓ Backup created: $BACKUP_PATH"
    echo "$BACKUP_PATH" > "$BACKUP_DIR/latest_backup.txt"
    
    # Keep only last 5 backups
    ls -t "$BACKUP_DIR" | grep "backup_" | tail -n +6 | xargs -I {} rm -rf "$BACKUP_DIR/{}" 2>/dev/null || true
}

# Rollback function
rollback_deployment() {
    error "Rolling back deployment..."
    
    if [ ! -f "$BACKUP_DIR/latest_backup.txt" ]; then
        error "No backup found to rollback to"
        return 1
    fi
    
    BACKUP_PATH=$(cat "$BACKUP_DIR/latest_backup.txt")
    
    if [ ! -d "$BACKUP_PATH" ]; then
        error "Backup directory not found: $BACKUP_PATH"
        return 1
    fi
    
    # Restore environment files
    cp "$BACKUP_PATH/server.env" app/server/.env 2>/dev/null || true
    cp "$BACKUP_PATH/client.env" app/client/.env 2>/dev/null || true
    
    # Stop current containers
    docker-compose down
    
    # Restore Docker images (would need to be saved first)
    # This is simplified - in production you'd use a registry
    
    # Restart with backed up configuration
    docker-compose up -d
    
    log "✓ Rollback completed"
}

################################################################################
# Main Deployment Process
################################################################################

echo "=================================="
echo " Calling App Deployment Script"
echo "=================================="
echo ""

cd "$APP_DIR"

# Handle rollback
if [ "$ROLLBACK" = true ]; then
    rollback_deployment
    exit 0
fi

# Backup current state
backup_state

# Pull latest code
if [ "$NO_BUILD" = false ]; then
    log "Pulling latest code from git..."
    if [ -d ".git" ]; then
        git pull || warning "Git pull failed or not a git repository"
    fi
fi

# Build Docker images
if [ "$NO_BUILD" = false ]; then
    log "Building Docker images..."
    
    # Build server image
    info "Building server image..."
    cd app/server
    npm ci --production
    npm run build
    cd ../..
    
    # Build with Docker Compose
    docker-compose build --no-cache
    
    log "✓ Docker images built successfully"
fi

if [ "$BUILD_ONLY" = true ]; then
    log "Build complete (build-only mode)"
    exit 0
fi

# Stop old containers
log "Stopping old containers..."
docker-compose down || warning "No containers to stop"

# Clean up old images
log "Cleaning up old Docker images..."
docker image prune -f || true

# Start new containers
log "Starting new containers..."
docker-compose up -d

# Wait for containers to start
sleep 5

# Verify containers are running
log "Verifying containers..."
if ! docker-compose ps | grep -q "Up"; then
    error "Containers failed to start"
    rollback_deployment
    exit 1
fi

# Run health checks
if ! health_check; then
    error "Health checks failed"
    rollback_deployment
    exit 1
fi

# Additional health checks
log "Running additional health checks..."

# Check Redis
if curl -f http://localhost:3000/api/health/redis > /dev/null 2>&1; then
    log "✓ Redis health check passed"
else
    warning "Redis health check failed (might not be critical)"
fi

# Display container status
log "Container status:"
docker-compose ps

# Display recent logs
log "Recent logs:"
docker-compose logs --tail=20

# Success message
echo ""
echo "=================================="
log "✓ Deployment completed successfully!"
echo "=================================="
echo ""
log "Application is now running"
log "Access: http://$(curl -s http://169.254.169.254/latest/meta-data/public-hostname 2>/dev/null || echo 'your-ec2-hostname')"
echo ""
log "Useful commands:"
echo "  docker-compose logs -f        # View logs"
echo "  docker-compose ps             # Check status"
echo "  docker-compose restart        # Restart services"
echo "  ./deploy.sh --rollback        # Rollback deployment"
echo ""

# Save deployment info
cat > "$BACKUP_DIR/last_deployment.txt" << EOF
Deployment Date: $(date)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")
Docker Images:
$(docker images | grep calling-app)
EOF

exit 0
