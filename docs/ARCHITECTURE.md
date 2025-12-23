# NoTrack Architecture Documentation

> **Enterprise-grade WebRTC calling platform - Technical Architecture**

This document provides a comprehensive overview of the NoTrack application architecture, design decisions, and technical implementation details.

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Details](#component-details)
4. [Technology Stack](#technology-stack)
5. [Design Patterns](#design-patterns)
6. [Data Flow](#data-flow)
7. [Security Architecture](#security-architecture)
8. [Scalability Architecture](#scalability-architecture)
9. [Infrastructure](#infrastructure)
10. [Design Decisions](#design-decisions)

---

## System Overview

NoTrack is a real-time, peer-to-peer audio calling application built on WebRTC technology. The system consists of three main components:

- **Client Application**: React-based SPA with WebRTC capabilities
- **Signaling Server**: Node.js/Express server with Socket.IO
- **Redis Cache**: Optional persistent storage for horizontal scaling

### Key Characteristics

- **Architecture Style**: Microservices-ready monolith
- **Communication**: REST API + WebSocket (Socket.IO)
- **State Management**: JWT tokens + Redis (optional)
- **Deployment**: Containerized with Docker
- **Scalability**: Horizontal scaling with Redis Pub/Sub

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet / CDN                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
         ┌──────────▼──────────┐ ┌─────────▼──────────┐
         │   Client Domain     │ │  Signaling Domain  │
         │  notrack.co.uk      │ │ signal.notrack.uk  │
         └──────────┬──────────┘ └─────────┬──────────┘
                    │                       │
         ┌──────────▼──────────┐ ┌─────────▼──────────┐
         │   Nginx (Port 80)   │ │  Nginx (Port 80)   │
         │   SSL Termination   │ │  SSL Termination   │
         └──────────┬──────────┘ └─────────┬──────────┘
                    │                       │
         ┌──────────▼──────────┐ ┌─────────▼──────────┐
         │   Static Files      │ │  Express Server    │
         │   React Build       │ │  (Port 3000)       │
         │   (Vite Output)     │ │  + Socket.IO       │
         └─────────────────────┘ └─────────┬──────────┘
                                           │
                                  ┌────────┴────────┐
                                  │                 │
                             ┌────▼─────┐     ┌────▼─────┐
                             │  Redis   │     │ Sentry   │
                             │  (6379)  │     │ APM      │
                             └──────────┘     └──────────┘
                                  │
                         ┌────────┴────────┐
                         │                 │
                    ┌────▼─────┐     ┌────▼─────┐
                    │ Session  │     │ Pub/Sub  │
                    │  Store   │     │ Messages │
                    └──────────┘     └──────────┘
```

### WebRTC Call Flow

```
┌─────────┐                                              ┌─────────┐
│ Caller  │                                              │ Callee  │
└────┬────┘                                              └────┬────┘
     │                                                        │
     │  1. call-user (offer)                                 │
     ├───────────────────────►┌──────────────┐              │
     │                        │   Signaling  │              │
     │                        │    Server    │              │
     │                        └──────┬───────┘              │
     │                               │  2. incoming-call    │
     │                               ├─────────────────────►│
     │                               │                       │
     │  3. ICE candidates            │   4. answer-call     │
     │◄──────────────────────────────┼──────────────────────┤
     │                               │                       │
     │  5. ICE candidates            │   6. ICE candidates  │
     ├───────────────────────────────┼──────────────────────►
     │                               │                       │
     │  7. Direct P2P Audio Stream (WebRTC)                 │
     │◄────────────────────────────────────────────────────►│
     │                               │                       │
     │  8. end-call                  │                       │
     ├───────────────────────►┌──────▼───────┐              │
     │                        │   Signaling  │              │
     │                        │    Server    │              │
     │                        └──────┬───────┘              │
     │                               │  9. call-ended       │
     │                               ├─────────────────────►│
     │                               │                       │
```

---

## Component Details

### 1. Client Application (React/TypeScript)

**Location**: `app/client/`

**Key Components**:

```
app/client/src/
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx      # Route protection with JWT
│   ├── errors/
│   │   ├── NotFound.tsx             # 404 error page
│   │   ├── Unauthorized.tsx         # 401 error page
│   │   ├── Forbidden.tsx            # 403 error page
│   │   └── PrivacyPolicy.tsx        # Legal compliance
│   ├── CallLogTable.tsx             # Call history display
│   ├── DialPad.tsx                  # Extension dialing
│   ├── IncomingCallModal.tsx        # Call notifications
│   ├── SecureTerminal.tsx           # Main UI component
│   ├── Toast.tsx                    # User notifications
│   └── ErrorBoundary.tsx            # Error catching
├── hooks/
│   ├── useWebRTC.ts                 # WebRTC connection management
│   ├── useSignalProtocol.ts         # Socket.IO signaling
│   ├── useCallRecording.ts          # Call metadata tracking
│   ├── useReconnection.ts           # Auto-reconnection logic
│   ├── useWebRTCStats.ts            # Connection quality monitoring
│   └── usePerformanceMonitor.ts     # Performance tracking
├── errors/
│   └── WebRTCErrors.ts              # Custom error classes
└── types/
    └── window.d.ts                  # Global type definitions
```

**Key Responsibilities**:
- User interface rendering
- WebRTC peer connection management
- Socket.IO client communication
- JWT token management
- Call state management
- Error handling and recovery

**Build Output**:
- Static HTML, CSS, JS files
- Served by Nginx
- Optimized with Vite bundler

### 2. Signaling Server (Node.js/Express)

**Location**: `app/server/`

**Key Components**:

```
app/server/src/
├── index.ts                    # Main server entry point
├── instrument.ts               # Sentry initialization
├── swagger.json                # API documentation
├── config/
│   └── env.ts                  # Environment validation
├── middleware/
│   ├── auth.ts                 # JWT authentication
│   └── socketRateLimit.ts      # WebSocket rate limiting
├── routes/
│   └── auth.ts                 # Authentication endpoints
├── services/
│   ├── redis.ts                # Redis connection management
│   └── redisPubSub.ts          # Pub/Sub messaging
├── socket/
│   └── handler.ts              # WebSocket event handlers
└── utils/
    ├── logger.ts               # Winston logging
    ├── sanitize.ts             # Input sanitization
    └── validation.ts           # Input validation
```

**Key Responsibilities**:
- REST API endpoints
- WebSocket signaling
- JWT authentication
- Session management
- Rate limiting
- Input validation
- Error tracking
- Metrics collection

**Server Architecture**:

```
┌──────────────────────────────────────────┐
│          Express Application             │
├──────────────────────────────────────────┤
│  Middleware Stack:                       │
│  1. Request ID Tracking                  │
│  2. CSP Nonce Generation                 │
│  3. Helmet Security Headers              │
│  4. CORS Configuration                   │
│  5. JSON Body Parser                     │
│  6. Compression (Gzip/Brotli)           │
│  7. Rate Limiting                        │
│  8. Prometheus Metrics Collection        │
├──────────────────────────────────────────┤
│  Routes:                                 │
│  - GET  /                (Health)        │
│  - GET  /health/live     (Liveness)      │
│  - GET  /health/ready    (Readiness)     │
│  - GET  /api/health/redis (Redis)        │
│  - GET  /metrics         (Prometheus)    │
│  - GET  /api-docs        (Swagger UI)    │
│  - POST /api/auth/guest  (Guest Auth)    │
│  - POST /api/auth/login  (Login)         │
│  - POST /api/auth/register (Register)    │
├──────────────────────────────────────────┤
│  Socket.IO Server:                       │
│  - Authentication Middleware             │
│  - Event Handlers                        │
│  - Rate Limiting                         │
│  - Connection Cleanup                    │
├──────────────────────────────────────────┤
│  Error Handling:                         │
│  - Sentry Error Handler                  │
│  - Global Error Middleware               │
│  - Unhandled Rejection Handler           │
│  - Uncaught Exception Handler            │
├──────────────────────────────────────────┤
│  Graceful Shutdown:                      │
│  - HTTP Server Close                     │
│  - Socket.IO Disconnect                  │
│  - Redis Connection Close                │
│  - Sentry Flush                          │
└──────────────────────────────────────────┘
```

### 3. Redis Cache (Optional)

**Purpose**: Enables horizontal scaling and persistent storage

**Use Cases**:
- User session storage
- Socket connection mapping
- Call state persistence
- Pub/Sub messaging between servers

**Architecture**:

```
┌─────────────────────────────────────────┐
│         Load Balancer (AWS ALB)         │
└────────┬─────────────┬──────────────────┘
         │             │
    ┌────▼────┐   ┌────▼────┐
    │ Server 1│   │ Server 2│
    └────┬────┘   └────┬────┘
         │             │
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │    Redis    │
         │   Pub/Sub   │
         └─────────────┘
```

**Data Structures**:
- **Keys**: `user:{extension}` - User session data
- **Keys**: `socket:{socketId}` - Socket to user mapping
- **Keys**: `call:{callId}` - Active call state
- **Channels**: `signaling` - Cross-server messaging

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 4.x | Build tool |
| Tailwind CSS | 3.x | Styling framework |
| Socket.IO Client | 4.6.x | WebSocket communication |
| React Router | 7.x | Client-side routing |
| React Helmet | 2.x | SEO meta tags |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | JavaScript runtime |
| Express | 4.x | Web framework |
| TypeScript | 5.x | Type safety |
| Socket.IO | 4.6.x | WebSocket server |
| JWT | 9.x | Authentication |
| bcryptjs | 3.x | Password hashing |
| Redis (ioredis) | 5.x | Caching & Pub/Sub |
| Winston | 3.x | Logging |
| Helmet | 7.x | Security headers |
| Prometheus Client | 15.x | Metrics |
| Sentry | 10.x | Error tracking |

### DevOps Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | Latest | Containerization |
| Docker Compose | Latest | Multi-container orchestration |
| Nginx | Latest | Reverse proxy & SSL |
| Let's Encrypt | Latest | SSL certificates |
| AWS EC2 | t2.micro | Compute instances |
| Playwright | Latest | E2E testing |
| Jest | Latest | Unit testing |
| Vitest | Latest | Frontend testing |

---

## Design Patterns

### 1. **Singleton Pattern**
- **Usage**: Redis connection, Winston logger
- **Purpose**: Single shared instance across application

### 2. **Factory Pattern**
- **Usage**: WebRTC peer connection creation
- **Purpose**: Encapsulate complex object creation logic

### 3. **Observer Pattern**
- **Usage**: Socket.IO event handling, React hooks
- **Purpose**: Event-driven architecture

### 4. **Middleware Pattern**
- **Usage**: Express middleware chain
- **Purpose**: Request processing pipeline

### 5. **Repository Pattern**
- **Usage**: Redis service abstraction
- **Purpose**: Data access layer abstraction

### 6. **Strategy Pattern**
- **Usage**: Authentication strategies (Guest vs JWT)
- **Purpose**: Interchangeable algorithms

### 7. **Proxy Pattern**
- **Usage**: Nginx as reverse proxy
- **Purpose**: Additional layer of control

---

## Data Flow

### Authentication Flow

```
┌────────┐         ┌────────┐         ┌────────┐
│ Client │         │ Server │         │ Redis  │
└───┬────┘         └───┬────┘         └───┬────┘
    │ POST /auth/guest │                  │
    ├──────────────────►                  │
    │                  │ Generate JWT     │
    │                  ├─────────┐        │
    │                  │◄────────┘        │
    │                  │ Store session    │
    │                  ├─────────────────►│
    │   JWT token      │                  │
    │◄─────────────────┤                  │
    │                  │                  │
    │ WS connect + JWT │                  │
    ├──────────────────►                  │
    │                  │ Verify JWT       │
    │                  ├─────────┐        │
    │                  │◄────────┘        │
    │                  │ Get session      │
    │                  ├─────────────────►│
    │  Connection OK   │                  │
    │◄─────────────────┤                  │
```

### Call Initiation Flow

```
┌────────┐         ┌────────┐         ┌────────┐
│ Caller │         │ Server │         │ Callee │
└───┬────┘         └───┬────┘         └───┬────┘
    │ call-user event │                   │
    ├────────────────►│                   │
    │                 │ Validate target   │
    │                 ├──────────┐        │
    │                 │◄─────────┘        │
    │                 │ incoming-call     │
    │                 ├──────────────────►│
    │                 │                   │
    │ ICE candidates  │                   │
    ├────────────────►│ Forward           │
    │                 ├──────────────────►│
    │                 │                   │
    │                 │  answer-call      │
    │                 │◄──────────────────┤
    │ call-answered   │                   │
    │◄────────────────┤                   │
    │                 │                   │
    │  P2P Audio Stream (Direct)         │
    │◄──────────────────────────────────►│
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────┐
│  Layer 1: Network Security              │
│  - AWS Security Groups                  │
│  - Nginx rate limiting                  │
│  - DDoS protection                      │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  Layer 2: Transport Security            │
│  - TLS 1.2+ (Let's Encrypt)            │
│  - HSTS headers                         │
│  - Certificate pinning ready            │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  Layer 3: Application Security          │
│  - JWT authentication                   │
│  - Helmet security headers              │
│  - CORS whitelist                       │
│  - Input validation                     │
│  - XSS prevention                       │
│  - SQL injection prevention (N/A)       │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  Layer 4: Data Security                 │
│  - Password hashing (bcrypt)            │
│  - JWT token encryption                 │
│  - Redis encryption in transit          │
│  - Environment variable validation      │
└─────────────────────────────────────────┘
```

### Security Features

1. **Authentication**
   - JWT tokens with configurable expiration
   - Secure password hashing with bcryptjs (10 rounds)
   - Guest mode with rate limiting

2. **Authorization**
   - Protected routes with middleware
   - Extension-based access control
   - Token verification on every request

3. **Input Validation**
   - Envalid for environment variables
   - Custom validation utilities
   - XSS sanitization with xss library

4. **Network Security**
   - HTTPS only in production
   - Strict CORS policy
   - Rate limiting (5 auth attempts per 15 min)
   - Request size limits

5. **Monitoring**
   - Sentry error tracking
   - Request ID tracking
   - Security event logging

---

## Scalability Architecture

### Horizontal Scaling with Redis

```
               ┌──────────────────┐
               │  Load Balancer   │
               │    (AWS ALB)     │
               └────────┬─────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐     ┌────▼────┐    ┌────▼────┐
   │ Server 1│     │ Server 2│    │ Server 3│
   │ Port:3000│    │ Port:3000│   │ Port:3000│
   └────┬────┘     └────┬────┘    └────┬────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                   ┌────▼────┐
                   │  Redis  │
                   │ Cluster │
                   └─────────┘
```

### Scaling Considerations

1. **Stateless Servers**
   - JWT tokens for authentication
   - Redis for session storage
   - No server-side session state

2. **Connection Management**
   - Socket.IO with Redis adapter
   - Cross-server message routing
   - Connection persistence

3. **Performance**
   - Compression middleware
   - Static asset caching
   - CDN-ready architecture

4. **Monitoring**
   - Prometheus metrics per instance
   - Aggregated logging
   - Distributed tracing ready

---

## Infrastructure

### AWS Architecture

```
┌─────────────────────────────────────────────┐
│              Route 53 (DNS)                 │
│  notrack.co.uk → EC2 Public IP              │
│  signal.notrack.co.uk → EC2 Public IP       │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│          EC2 Instance (t2.micro)            │
│  Ubuntu Server 24.04 LTS                    │
│  ┌─────────────────────────────────────┐   │
│  │  Docker Containers                  │   │
│  │  ┌──────────┐      ┌─────────────┐ │   │
│  │  │  Server  │      │   Redis     │ │   │
│  │  │  :3000   │◄────►│   :6379     │ │   │
│  │  └──────────┘      └─────────────┘ │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  Nginx                              │   │
│  │  - Port 80 → SSL Redirect           │   │
│  │  - Port 443 → Proxy to :3000       │   │
│  │  - Let's Encrypt SSL Certs          │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Resource Requirements

**Development**:
- CPU: 2 cores
- RAM: 4GB
- Storage: 10GB

**Production (t2.micro)**:
- CPU: 1 core (burstable)
- RAM: 1GB + 1GB swap
- Storage: 8GB
- Network: Low to moderate

**Scaling Thresholds**:
- Upgrade at >100 concurrent connections
- Add Redis at >500 concurrent connections
- Add second server at >1000 concurrent connections

---

## Design Decisions

### Why React?
- Component-based architecture
- Large ecosystem
- Excellent TypeScript support
- Strong community
- Performance optimizations

### Why Socket.IO over WebSocket?
- Automatic reconnection
- Room/namespace support
- Fallback to polling
- Built-in heartbeat
- Better error handling

### Why JWT over Sessions?
- Stateless authentication
- Mobile-friendly
- Horizontal scaling
- No server-side storage required
- API-ready

### Why Redis?
- In-memory performance
- Pub/Sub for multi-server
- Persistent storage option
- Atomic operations
- Wide deployment support

### Why Nginx over Express Static?
- Better performance for static files
- SSL termination
- Load balancing capabilities
- Caching headers
- Production-grade stability

### Why Docker?
- Consistent environments
- Easy deployment
- Isolation
- Portability
- DevOps-friendly

### Why Monorepo?
- Shared dependencies
- Unified versioning
- Easier refactoring
- Single CI/CD pipeline
- Better developer experience

---

## Future Architecture Considerations

### Planned Enhancements

1. **Microservices Split**
   - Separate authentication service
   - Independent signaling service
   - Message queue integration

2. **Database Addition**
   - PostgreSQL for user data
   - Call history persistence
   - Analytics storage

3. **CDN Integration**
   - CloudFront for static assets
   - Global edge locations
   - Reduced latency

4. **Kubernetes Migration**
   - Container orchestration
   - Auto-scaling
   - Self-healing
   - Rolling updates

5. **Message Queue**
   - RabbitMQ or SQS
   - Async processing
   - Event sourcing
   - CQRS pattern

---

## Related Documentation

- [API Documentation](API_DOCUMENTATION.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Configuration Guide](CONFIGURATION.md)
- [Security Policy](SECURITY.md)
- [Scaling Guide](SCALING.md)

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-22  
**Contact**: admin@notrack.co.uk
