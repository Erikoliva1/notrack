# NoTrack Configuration Guide

> **Complete Guide to Environment Variables and Configuration Options**

This document provides comprehensive documentation for all configuration options, environment variables, and settings in the NoTrack application.

## Table of Contents

1. [Configuration Overview](#configuration-overview)
2. [Server Configuration](#server-configuration)
3. [Client Configuration](#client-configuration)
4. [Redis Configuration](#redis-configuration)
5. [Security Configuration](#security-configuration)
6. [Monitoring Configuration](#monitoring-configuration)
7. [Docker Configuration](#docker-configuration)
8. [Nginx Configuration](#nginx-configuration)
9. [Environment-Specific Configs](#environment-specific-configs)
10. [Configuration Validation](#configuration-validation)

---

## Configuration Overview

### Configuration Files

```
calling-app/
├── app/
│   ├── client/
│   │   ├── .env                    # Client environment variables
│   │   ├── .env.example            # Client template
│   │   └── vite.config.ts          # Vite build configuration
│   │
│   └── server/
│       ├── .env                    # Server environment variables
│       ├── .env.example            # Server template
│       └── src/config/env.ts       # Environment validation
│
├── docker-compose.yml              # Docker development config
├── docker-compose.production.yml   # Docker production config
└── nginx.conf                      # Nginx configuration
```

### Configuration Hierarchy

1. **Environment Variables** (.env files)
2. **Configuration Files** (vite.config.ts, nginx.conf)
3. **Docker Compose** (docker-compose.yml)
4. **Code Defaults** (fallback values in code)

---

## Server Configuration

### Location

`app/server/.env`

### Core Settings

#### PORT
```env
PORT=3000
```
- **Type**: Number
- **Default**: 3000
- **Required**: Yes
- **Description**: Port number for the Express server
- **Production**: Usually 3000 (behind Nginx)
- **Development**: 3000
- **Validation**: Must be between 1024 and 65535

#### NODE_ENV
```env
NODE_ENV=production
```
- **Type**: String
- **Options**: `development`, `production`, `test`
- **Default**: `development`
- **Required**: Yes
- **Description**: Application environment
- **Effects**:
  - `development`: Detailed logs, stack traces, hot reload
  - `production`: Minimal logs, no stack traces, optimized
  - `test`: Testing mode with mocked services

---

### Authentication Configuration

#### JWT_SECRET
```env
JWT_SECRET=your-long-random-secret-key-min-32-chars
```
- **Type**: String
- **Default**: None
- **Required**: Yes (production)
- **Description**: Secret key for JWT token signing
- **Security**: 
  - Minimum 32 characters
  - Use cryptographically secure random string
  - Never commit to git
  - Rotate periodically
- **Generation**:
  ```bash
  # OpenSSL method
  openssl rand -base64 32
  
  # Node.js method
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

#### ENABLE_GUEST_ACCESS
```env
ENABLE_GUEST_ACCESS=true
```
- **Type**: Boolean
- **Options**: `true`, `false`
- **Default**: `false`
- **Required**: No
- **Description**: Allow guest authentication without registration
- **Production**: Set to `false` for security
- **Development**: Set to `true` for testing

---

### CORS Configuration

#### ALLOWED_ORIGINS
```env
ALLOWED_ORIGINS=https://notrack.co.uk,https://www.notrack.co.uk
```
- **Type**: String (comma-separated)
- **Default**: `http://localhost:5173`
- **Required**: Yes
- **Description**: Whitelist of allowed origins for CORS
- **Format**: Comma-separated URLs without trailing slashes
- **Examples**:
  ```env
  # Production
  ALLOWED_ORIGINS=https://notrack.co.uk,https://www.notrack.co.uk
  
  # Development
  ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
  
  # Multiple environments
  ALLOWED_ORIGINS=https://notrack.co.uk,https://staging.notrack.co.uk,http://localhost:5173
  ```
- **Security**: Never use `*` wildcard in production

---

### Redis Configuration

#### USE_REDIS
```env
USE_REDIS=true
```
- **Type**: Boolean
- **Options**: `true`, `false`
- **Default**: `false`
- **Required**: No
- **Description**: Enable Redis for session storage and scaling
- **When to enable**:
  - Production deployments
  - Horizontal scaling (multiple servers)
  - Session persistence required

#### REDIS_HOST
```env
REDIS_HOST=redis
```
- **Type**: String
- **Default**: `localhost`
- **Required**: If `USE_REDIS=true`
- **Description**: Redis server hostname
- **Examples**:
  ```env
  # Docker Compose (use service name)
  REDIS_HOST=redis
  
  # Local Redis
  REDIS_HOST=localhost
  
  # Remote Redis
  REDIS_HOST=redis.example.com
  
  # AWS ElastiCache
  REDIS_HOST=your-cluster.cache.amazonaws.com
  ```

#### REDIS_PORT
```env
REDIS_PORT=6379
```
- **Type**: Number
- **Default**: 6379
- **Required**: No
- **Description**: Redis server port

#### REDIS_PASSWORD
```env
REDIS_PASSWORD=your-redis-password
```
- **Type**: String
- **Default**: None (no authentication)
- **Required**: No (but recommended for production)
- **Description**: Redis authentication password
- **Security**: Always set in production

#### REDIS_DB
```env
REDIS_DB=0
```
- **Type**: Number
- **Default**: 0
- **Required**: No
- **Description**: Redis database number (0-15)

---

### Rate Limiting Configuration

#### RATE_LIMIT_WINDOW_MS
```env
RATE_LIMIT_WINDOW_MS=900000
```
- **Type**: Number (milliseconds)
- **Default**: 900000 (15 minutes)
- **Required**: No
- **Description**: Time window for rate limiting
- **Examples**:
  ```env
  # 5 minutes
  RATE_LIMIT_WINDOW_MS=300000
  
  # 15 minutes (default)
  RATE_LIMIT_WINDOW_MS=900000
  
  # 1 hour
  RATE_LIMIT_WINDOW_MS=3600000
  ```

#### RATE_LIMIT_MAX_REQUESTS
```env
RATE_LIMIT_MAX_REQUESTS=100
```
- **Type**: Number
- **Default**: 100
- **Required**: No
- **Description**: Maximum requests per window per IP
- **Recommended**:
  - Development: 1000
  - Production: 100
  - High-traffic: Adjust based on needs

---

### SSL/HTTPS Configuration

#### USE_HTTPS
```env
USE_HTTPS=false
```
- **Type**: Boolean
- **Options**: `true`, `false`
- **Default**: `false`
- **Required**: No
- **Description**: Enable HTTPS in Express server
- **Note**: In production with Nginx, set to `false` (Nginx handles SSL)

#### SSL_KEY_PATH
```env
SSL_KEY_PATH=/path/to/private-key.pem
```
- **Type**: String
- **Default**: None
- **Required**: If `USE_HTTPS=true`
- **Description**: Path to SSL private key file

#### SSL_CERT_PATH
```env
SSL_CERT_PATH=/path/to/certificate.pem
```
- **Type**: String
- **Default**: None
- **Required**: If `USE_HTTPS=true`
- **Description**: Path to SSL certificate file

---

### Monitoring Configuration

#### SENTRY_DSN
```env
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```
- **Type**: String (URL)
- **Default**: None
- **Required**: No (but recommended for production)
- **Description**: Sentry DSN for error tracking
- **Get from**: https://sentry.io

#### ENABLE_API_DOCS
```env
ENABLE_API_DOCS=true
```
- **Type**: Boolean
- **Options**: `true`, `false`
- **Default**: `true` in development, `false` in production
- **Required**: No
- **Description**: Enable Swagger UI at `/api-docs`
- **Production**: Set to `false` for security

---

### Connection Management

#### HEARTBEAT_INTERVAL_MS
```env
HEARTBEAT_INTERVAL_MS=30000
```
- **Type**: Number (milliseconds)
- **Default**: 30000 (30 seconds)
- **Required**: No
- **Description**: Interval for cleaning stale WebSocket connections
- **Recommended**: 30000-60000 ms

---

### Complete Server .env Example

**Development**:
```env
# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=dev-secret-key-not-for-production-use-only
ENABLE_GUEST_ACCESS=true

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Redis (optional)
USE_REDIS=false
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
USE_HTTPS=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Monitoring
ENABLE_API_DOCS=true
SENTRY_DSN=

# Connection
HEARTBEAT_INTERVAL_MS=30000
```

**Production**:
```env
# Server
PORT=3000
NODE_ENV=production

# Authentication
JWT_SECRET=k7F9pL2mN8qR5sT1vX3wY6zA4bC0dE9fG2hJ5kM8nP1qS4tU7vW0xY3z
ENABLE_GUEST_ACCESS=false

# CORS
ALLOWED_ORIGINS=https://notrack.co.uk,https://www.notrack.co.uk

# Redis
USE_REDIS=true
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password
REDIS_DB=0

# Security
USE_HTTPS=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_API_DOCS=false
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Connection
HEARTBEAT_INTERVAL_MS=30000
```

---

## Client Configuration

### Location

`app/client/.env`

### Application Settings

#### VITE_SERVER_URL
```env
VITE_SERVER_URL=https://signal.notrack.co.uk
```
- **Type**: String (URL)
- **Default**: `http://localhost:3000`
- **Required**: Yes
- **Description**: URL of the signaling server
- **Format**: Full URL with protocol, no trailing slash
- **Examples**:
  ```env
  # Production
  VITE_SERVER_URL=https://signal.notrack.co.uk
  
  # Development
  VITE_SERVER_URL=http://localhost:3000
  
  # Staging
  VITE_SERVER_URL=https://staging-signal.notrack.co.uk
  ```

---

### TURN Server Configuration

#### VITE_TURN_USERNAME
```env
VITE_TURN_USERNAME=your-turn-username
```
- **Type**: String
- **Default**: None
- **Required**: Yes (for WebRTC NAT traversal)
- **Description**: TURN server username
- **Get from**: TURN server provider (e.g., Metered.ca)

#### VITE_TURN_CREDENTIAL
```env
VITE_TURN_CREDENTIAL=your-turn-credential
```
- **Type**: String
- **Default**: None
- **Required**: Yes
- **Description**: TURN server password/credential
- **Security**: Keep confidential, rotate regularly

#### VITE_TURN_URLS
```env
VITE_TURN_URLS=turn:turn.example.com:3478
```
- **Type**: String (comma-separated)
- **Default**: None
- **Required**: Yes
- **Description**: TURN server URLs
- **Format**: `turn:hostname:port` or `turns:hostname:port` (TLS)
- **Examples**:
  ```env
  # Single TURN server
  VITE_TURN_URLS=turn:turn.example.com:3478
  
  # Multiple TURN servers
  VITE_TURN_URLS=turn:turn1.example.com:3478,turn:turn2.example.com:3478
  
  # TURN with TLS
  VITE_TURN_URLS=turns:turn.example.com:5349
  ```

---

### Monitoring Configuration

#### VITE_SENTRY_DSN
```env
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```
- **Type**: String (URL)
- **Default**: None
- **Required**: No (but recommended for production)
- **Description**: Sentry DSN for client-side error tracking
- **Get from**: https://sentry.io

---

### Complete Client .env Example

**Development**:
```env
# Server URL
VITE_SERVER_URL=http://localhost:3000

# TURN Server
VITE_TURN_USERNAME=dev-turn-user
VITE_TURN_CREDENTIAL=dev-turn-pass
VITE_TURN_URLS=turn:localhost:3478

# Monitoring
VITE_SENTRY_DSN=
```

**Production**:
```env
# Server URL
VITE_SERVER_URL=https://signal.notrack.co.uk

# TURN Server
VITE_TURN_USERNAME=your-production-turn-username
VITE_TURN_CREDENTIAL=your-production-turn-credential
VITE_TURN_URLS=turn:turn.metered.ca:80,turn:turn.metered.ca:3478

# Monitoring
VITE_SENTRY_DSN=https://your-client-sentry-dsn@sentry.io/project-id
```

---

## Docker Configuration

### docker-compose.yml (Development)

```yaml
version: '3.8'

services:
  server:
    build:
      context: ./app/server
      dockerfile: ../../Dockerfile.server
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=development
      - USE_REDIS=true
      - REDIS_HOST=redis
    volumes:
      - ./app/server:/app
      - /app/node_modules
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis-data:
```

### docker-compose.production.yml

```yaml
version: '3.8'

services:
  server:
    build:
      context: ./app/server
      dockerfile: ../../Dockerfile.server
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - USE_REDIS=true
      - REDIS_HOST=redis
    env_file:
      - ./app/server/.env
    depends_on:
      - redis
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  redis-data:
```

---

## Nginx Configuration

### Production Configuration

**Location**: `/etc/nginx/sites-available/default`

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# Client domain
server {
    listen 443 ssl http2;
    server_name notrack.co.uk www.notrack.co.uk;

    # SSL
    ssl_certificate /etc/letsencrypt/live/notrack.co.uk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notrack.co.uk/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    root /var/www/notrack/dist;
    index index.html;

    # Static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Signaling server
server {
    listen 443 ssl http2;
    server_name signal.notrack.co.uk;

    # SSL
    ssl_certificate /etc/letsencrypt/live/notrack.co.uk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notrack.co.uk/privkey.pem;

    # Rate limiting
    location /api/auth {
        limit_req zone=auth_limit burst=3 nodelay;
        proxy_pass http://localhost:3000;
    }

    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }

    # WebSocket proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Environment-Specific Configs

### Development Environment

**Characteristics**:
- Detailed logging
- Hot reload enabled
- Guest access allowed
- API docs enabled
- Relaxed rate limits
- Local services

**Server .env**:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret
ENABLE_GUEST_ACCESS=true
ALLOWED_ORIGINS=http://localhost:5173
USE_REDIS=false
ENABLE_API_DOCS=true
RATE_LIMIT_MAX_REQUESTS=1000
```

**Client .env**:
```env
VITE_SERVER_URL=http://localhost:3000
VITE_TURN_USERNAME=dev-user
VITE_TURN_CREDENTIAL=dev-pass
```

---

### Staging Environment

**Characteristics**:
- Production-like setup
- Testing with real infrastructure
- Moderate security
- Monitoring enabled

**Server .env**:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=staging-secret-32-chars-minimum
ENABLE_GUEST_ACCESS=true
ALLOWED_ORIGINS=https://staging.notrack.co.uk
USE_REDIS=true
REDIS_HOST=staging-redis
ENABLE_API_DOCS=true
RATE_LIMIT_MAX_REQUESTS=500
SENTRY_DSN=https://staging-dsn@sentry.io/project
```

---

### Production Environment

**Characteristics**:
- Maximum security
- Optimized performance
- Full monitoring
- Strict rate limits
- No guest access (optional)

**Server .env**:
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=production-secret-use-32-plus-chars
ENABLE_GUEST_ACCESS=false
ALLOWED_ORIGINS=https://notrack.co.uk,https://www.notrack.co.uk
USE_REDIS=true
REDIS_HOST=redis
REDIS_PASSWORD=secure-redis-password
ENABLE_API_DOCS=false
RATE_LIMIT_MAX_REQUESTS=100
SENTRY_DSN=https://production-dsn@sentry.io/project
```

---

## Configuration Validation

### Server-Side Validation

**Location**: `app/server/src/config/env.ts`

```typescript
import { cleanEnv, str, num, bool, url } from 'envalid';

export const env = cleanEnv(process.env, {
  // Server
  PORT: num({ default: 3000 }),
  NODE_ENV: str({ choices: ['development', 'production', 'test'] }),

  // Authentication
  JWT_SECRET: str({ default: 'dev-secret-not-for-production' }),
  ENABLE_GUEST_ACCESS: bool({ default: false }),

  // CORS
  ALLOWED_ORIGINS: str({ default: 'http://localhost:5173' }),

  // Redis
  USE_REDIS: bool({ default: false }),
  REDIS_HOST: str({ default: 'localhost' }),
  REDIS_PORT: num({ default: 6379 }),
  REDIS_PASSWORD: str({ default: '' }),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: num({ default: 900000 }),
  RATE_LIMIT_MAX_REQUESTS: num({ default: 100 }),

  // SSL
  USE_HTTPS: bool({ default: false }),
  SSL_KEY_PATH: str({ default: '' }),
  SSL_CERT_PATH: str({ default: '' }),

  // Monitoring
  SENTRY_DSN: url({ default: '' }),
  ENABLE_API_DOCS: bool({ default: false }),

  // Connection
  HEARTBEAT_INTERVAL_MS: num({ default: 30000 }),
});
```

### Validation Rules

1. **Required Fields**: Must be present in production
2. **Type Checking**: Ensures correct data types
3. **Format Validation**: URLs, emails, etc.
4. **Range Validation**: Numbers within acceptable ranges
5. **Enum Validation**: Values from allowed set

### Testing Configuration

```bash
# Validate server configuration
cd app/server
npm run type-check

# Test with different environments
NODE_ENV=development npm run dev
NODE_ENV=production npm run start
```

---

## Configuration Best Practices

### Security

1. **Never commit .env files**
   ```gitignore
   # .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use strong secrets**
   ```bash
   # Generate secure secrets
   openssl rand -base64 32
   ```

3. **Rotate credentials regularly**
   - JWT secrets: Every 3-6 months
   - Database passwords: Every 6-12 months
   - API keys: When compromised

4. **Use environment-specific configs**
   - Never use production secrets in development
   - Keep staging and production separate

### Performance

1. **Enable Redis in production**
   ```env
   USE_REDIS=true
   ```

2. **Optimize rate limits**
   - Balance security and usability
   - Monitor and adjust based on metrics

3. **Use CDN for static assets**
   - Configure in Vite build
   - Update Nginx cache headers

### Monitoring

1. **Enable error tracking**
   ```env
   SENTRY_DSN=your-dsn
   ```

2. **Configure log levels**
   ```env
   NODE_ENV=production  # Minimal logs
   NODE_ENV=development # Detailed logs
   ```

3. **Set up alerts**
   - Memory usage
   - Error rates
   - Response times

---

## Troubleshooting Configuration

### Common Issues

#### 1. "Environment variable not found"
```bash
# Check .env file exists
ls -la app/server/.env

# Verify variable name
cat app/server/.env | grep VARIABLE_NAME

# Check for typos in variable names
```

#### 2. "CORS error in browser"
```env
# Ensure client URL is in ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://notrack.co.uk,http://localhost:5173
```

#### 3. "Redis connection failed"
```bash
# Check Redis is running
docker ps | grep redis

# Test Redis connection
redis-cli -h localhost -p 6379 ping

# Check Redis host in .env
cat app/server/.env | grep REDIS_HOST
```

#### 4. "JWT token invalid"
```bash
# Ensure JWT_SECRET matches between deployments
# Check secret length (minimum 32 chars)
# Verify no whitespace or special characters
```

---

## Related Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment
- [Security Policy](SECURITY.md) - Security best practices
- [Development Guide](DEVELOPMENT.md) - Development setup
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues

---

## Quick Reference

### Essential Variables

**Server (Minimum)**:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your-32-char-secret
ALLOWED_ORIGINS=https://notrack.co.uk
```

**Client (Minimum)**:
```env
VITE_SERVER_URL=https://signal.notrack.co.uk
VITE_TURN_USERNAME=turn-user
VITE_TURN_CREDENTIAL=turn-pass
VITE_TURN_URLS=turn:server:3478
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-22  
**Contact**: admin@notrack.co.uk
