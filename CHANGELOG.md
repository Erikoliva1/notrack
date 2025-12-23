# Changelog

All notable changes to the NoTrack project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive enterprise-level documentation
- Architecture diagrams and technical documentation
- Deployment guides and troubleshooting documentation

## [2.2.4] - 2024-12-22

### Added
- OpenAPI 3.0 specification with Swagger UI documentation
- Complete API documentation at `/api-docs` endpoint
- WebSocket event documentation in Swagger
- Enhanced health check endpoints with detailed status

### Changed
- Updated API version to 2.2.4
- Improved error response schemas
- Enhanced authentication flow documentation

## [2.2.0] - 2024-12-18

### Added
- Prometheus metrics endpoint (`/metrics`)
- Custom metrics for HTTP requests, WebSocket connections, and calls
- Kubernetes-ready health check probes (`/health/live`, `/health/ready`)
- Request ID tracking middleware
- CSP nonce generation for secure inline scripts
- Graceful shutdown handling with SIGTERM/SIGINT
- Redis health check endpoint (`/api/health/redis`)
- Winston structured logging with request correlation
- Sentry error tracking integration
- Comprehensive monitoring and observability

### Enhanced
- Security headers with Helmet (CSP, HSTS, XSS protection)
- Stricter CORS policy with origin whitelist
- Rate limiting on authentication endpoints (5 attempts per 15 minutes)
- Rate limiting on API endpoints with custom headers
- Compression middleware for bandwidth optimization
- Environment variable validation with Envalid

### Changed
- Upgraded to Socket.IO 4.6
- Refactored server initialization for better reliability
- Improved error handling and logging
- Enhanced connection cleanup process

### Fixed
- Memory leak in WebSocket connection handling
- Race conditions in call state management
- Redis connection pooling issues

## [2.1.0] - 2024-11-15

### Added
- Redis support for horizontal scaling
- Pub/Sub messaging for multi-server deployments
- Connection persistence across server restarts
- Load balancing support

### Changed
- Refactored socket handlers for Redis compatibility
- Improved session management
- Enhanced reconnection logic

## [2.0.0] - 2024-10-30

### Added
- JWT-based authentication system
- Guest access mode (configurable)
- User registration and login endpoints
- Password hashing with bcryptjs
- Token expiration and refresh logic
- Protected route middleware

### Changed
- **BREAKING**: Authentication now required by default
- Migrated from session-based to token-based auth
- Updated client to handle JWT tokens
- Refactored API routes structure

### Security
- Implemented bcrypt password hashing
- Added JWT secret validation
- Enhanced input sanitization
- Strict CORS enforcement

## [1.5.0] - 2024-09-20

### Added
- Cyberpunk-themed UI with neon aesthetics
- Custom scrollbar styling
- Glitch text effects
- Blurred background effects
- Responsive design for mobile and tablet

### Changed
- Updated color scheme to neon green (#39FF14)
- Improved accessibility and contrast
- Enhanced visual feedback for user actions

## [1.4.0] - 2024-08-15

### Added
- Call logging and history
- Performance monitoring hooks
- WebRTC statistics tracking
- Network quality indicators
- Call duration tracking

### Fixed
- WebRTC connection stability issues
- ICE candidate gathering failures
- Audio device selection bugs

## [1.3.0] - 2024-07-10

### Added
- Dial pad component
- Extension-based calling system
- Incoming call modal
- Call state management
- Error boundaries for React components

### Changed
- Improved WebRTC error handling
- Enhanced reconnection logic
- Better user feedback for network issues

## [1.2.0] - 2024-06-05

### Added
- WebRTC peer-to-peer audio calling
- Socket.IO signaling server
- ICE candidate exchange
- TURN server integration
- Connection status indicators

### Changed
- Migrated from simple WebSocket to Socket.IO
- Improved signaling protocol
- Enhanced error handling

## [1.1.0] - 2024-05-01

### Added
- React frontend with TypeScript
- Vite build system
- Tailwind CSS styling
- React Router for navigation
- Basic UI components

### Changed
- Restructured project for monorepo
- Separated client and server code
- Improved development workflow

## [1.0.0] - 2024-04-01

### Added
- Initial release
- Basic Express server
- WebSocket support
- Simple HTML frontend
- Health check endpoint

### Security
- Basic CORS configuration
- Environment variable support

---

## Release Notes

### Version 2.2.x - Observability Release
Focus on monitoring, metrics, and production readiness with Prometheus integration and comprehensive health checks.

### Version 2.1.x - Scaling Release
Introduction of Redis support for horizontal scaling and multi-server deployments.

### Version 2.0.x - Security Release
Major security enhancements with JWT authentication, password hashing, and strict access controls.

### Version 1.x - Feature Development
Initial development phase focusing on core WebRTC functionality, UI/UX improvements, and basic features.

---

## Migration Guides

### Upgrading to 2.0.0
If upgrading from 1.x to 2.0.0, please note:

1. **Authentication Required**: Enable `ENABLE_GUEST_ACCESS=true` in your `.env` file if you want to maintain guest access
2. **New Environment Variables**: Add `JWT_SECRET` to your server `.env` file
3. **Client Changes**: Update client to handle JWT tokens in localStorage
4. **API Changes**: All protected routes now require `Authorization: Bearer <token>` header

### Upgrading to 2.1.0
If upgrading from 2.0.x to 2.1.0:

1. **Redis Optional**: Set `USE_REDIS=false` if you don't need horizontal scaling
2. **New Environment Variables**: Add Redis configuration if enabling Redis support
3. **No Breaking Changes**: Fully backward compatible with 2.0.x

### Upgrading to 2.2.0
If upgrading from 2.1.x to 2.2.0:

1. **Prometheus Metrics**: Metrics endpoint now available at `/metrics`
2. **Health Checks**: New Kubernetes-ready health check endpoints
3. **Logging**: Winston structured logging replaces console.log
4. **No Breaking Changes**: Fully backward compatible with 2.1.x

---

## Support

For questions or issues with any version, please contact:
- Email: admin@notrack.co.uk
- GitHub Issues: https://github.com/Erikoliva1/no-call/issues
