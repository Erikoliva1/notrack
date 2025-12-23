# ==============================================================================
# PRODUCTION DOCKERFILE - MULTI-STAGE BUILD
# ==============================================================================
# 
# This Dockerfile creates a production-optimized image that:
# - Builds the React client (Vite)
# - Compiles the TypeScript server
# - Serves static client files through Express server
# - Uses lightweight Alpine Node image
# - Single container deployment (no separate web server needed)
#
# Build: docker build -t calling-app:latest .
# Run:   docker run -p 3000:3000 --env-file app/server/.env calling-app:latest
#
# ==============================================================================

# ==============================================================================
# STAGE 1: BUILD CLIENT (React + Vite)
# ==============================================================================
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY app/client/package*.json ./

# Install dependencies (production + dev for build)
RUN npm ci

# Copy client source
COPY app/client/ ./

# Build client for production
# Output: /app/client/dist
RUN npm run build

# ==============================================================================
# STAGE 2: BUILD SERVER (TypeScript Compilation)
# ==============================================================================
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY app/server/package*.json ./
COPY app/server/tsconfig.json ./

# Install dependencies (production + dev for build)
RUN npm ci

# Copy server source
COPY app/server/src ./src

# Compile TypeScript to JavaScript
# Output: /app/server/dist
RUN npm run build

# ==============================================================================
# STAGE 3: PRODUCTION RUNTIME
# ==============================================================================
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install production dependencies only (no devDependencies)
COPY app/server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled server from builder
COPY --from=server-builder /app/server/dist ./dist

# Copy built client from builder
COPY --from=client-builder /app/client/dist ./public

# Copy server configuration files (if needed)
COPY app/server/.env.example ./.env.example
COPY app/server/cert ./cert

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (configurable via PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set environment to production
ENV NODE_ENV=production

# Start server
# Server will serve static client files from ./public
CMD ["node", "dist/index.js"]

# ==============================================================================
# DOCKER BUILD OPTIMIZATION NOTES
# ==============================================================================
#
# Multi-stage build benefits:
# - Smaller final image (no build tools, no source code)
# - Faster builds (cached layers)
# - More secure (only runtime dependencies)
#
# Final image size: ~150MB (Alpine Node + compiled code)
# Without multi-stage: ~800MB+ (includes build tools, source, devDeps)
#
# ==============================================================================
# SERVING STRATEGY
# ==============================================================================
#
# The Express server serves both:
# 1. API routes (http://localhost:3000/api/*)
# 2. Static client files (http://localhost:3000/*)
#
# Add to app/server/src/index.ts (after routes, before error handler):
#
# ```typescript
# // Serve static client files in production
# if (env.NODE_ENV === 'production') {
#   app.use(express.static(path.join(__dirname, '../public')));
#   
#   // Serve index.html for all other routes (SPA)
#   app.get('*', (req, res) => {
#     res.sendFile(path.join(__dirname, '../public/index.html'));
#   });
# }
# ```
#
# ==============================================================================
# ENVIRONMENT VARIABLES
# ==============================================================================
#
# Required at runtime:
# - PORT (default: 3000)
# - NODE_ENV (should be: production)
# - JWT_SECRET (required)
# - ALLOWED_ORIGINS (your domain)
# - USE_HTTPS (true for production)
# - All other app/server/.env variables
#
# Pass via:
# 1. --env-file: docker run --env-file app/server/.env
# 2. -e flag: docker run -e JWT_SECRET=xyz -e NODE_ENV=production
# 3. docker-compose environment section
#
# ==============================================================================
