# NoTrack API Documentation

> **Complete API Reference for NoTrack WebRTC Calling Platform**

This document provides comprehensive documentation for all REST API endpoints and WebSocket events in the NoTrack application.

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [REST API Endpoints](#rest-api-endpoints)
4. [WebSocket Events](#websocket-events)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Code Examples](#code-examples)
8. [Interactive Documentation](#interactive-documentation)

---

## API Overview

### Base URLs

- **Production**: `https://signal.notrack.co.uk`
- **Development**: `http://localhost:3000`

### API Version

Current version: **v2.2.4**

### Content Type

All requests and responses use `application/json` format.

### Response Format

```json
{
  "data": {},      // Success response data
  "error": {       // Error response (only on errors)
    "message": "Error description",
    "status": 400
  }
}
```

---

## Authentication

NoTrack uses **JWT (JSON Web Token)** based authentication.

### Authentication Flow

1. **Guest Access** (if enabled):
   ```
   POST /api/auth/guest → Receive JWT token
   ```

2. **User Registration**:
   ```
   POST /api/auth/register → Receive JWT token
   ```

3. **User Login**:
   ```
   POST /api/auth/login → Receive JWT token
   ```

4. **Use Token**:
   - HTTP: Include in `Authorization` header as `Bearer <token>`
   - WebSocket: Include in connection auth payload

### Token Structure

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "extension": "123-456",
  "expiresIn": "24h"
}
```

### Extension Format

Extensions follow the pattern: `XXX-XXX` where X is a digit (0-9).

Examples: `123-456`, `789-012`

---

## REST API Endpoints

### Health & Status Endpoints

#### GET /

**Description**: Main health check endpoint with server information

**Authentication**: Not required

**Response**:
```json
{
  "service": "Audio Calling Web App - Signaling Server",
  "status": "running",
  "timestamp": "2024-12-22T12:00:00.000Z",
  "version": "2.2.4",
  "environment": "production",
  "features": [
    "authentication",
    "rate-limiting",
    "input-validation",
    "connection-cleanup",
    "helmet-security-headers",
    "strict-cors",
    "env-validation",
    "winston-logging",
    "redis-persistence",
    "horizontal-scaling"
  ],
  "security": {
    "https": true,
    "guestAccess": false
  },
  "redis": {
    "enabled": true,
    "status": "healthy",
    "connected": true
  }
}
```

**Status Codes**:
- `200 OK`: Server is healthy

---

#### GET /health/live

**Description**: Kubernetes liveness probe - checks if server is alive

**Authentication**: Not required

**Response**:
```json
{
  "status": "alive",
  "timestamp": "2024-12-22T12:00:00.000Z",
  "uptime": 3600.5
}
```

**Status Codes**:
- `200 OK`: Server is alive
- `503 Service Unavailable`: Server is not responding

**Usage**:
```yaml
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 20
```

---

#### GET /health/ready

**Description**: Kubernetes readiness probe - checks if server can accept traffic

**Authentication**: Not required

**Response**:
```json
{
  "status": "ready",
  "timestamp": "2024-12-22T12:00:00.000Z",
  "checks": {
    "redis": "healthy"
  }
}
```

**Status Codes**:
- `200 OK`: Server is ready to accept traffic
- `503 Service Unavailable`: Server is not ready (dependencies failing)

**Usage**:
```yaml
# Kubernetes readiness probe
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

---

#### GET /api/health/redis

**Description**: Check Redis connection health

**Authentication**: Not required

**Response (Redis Enabled & Healthy)**:
```json
{
  "enabled": true,
  "status": "healthy",
  "connected": true,
  "usedMemory": "1.5M",
  "connectedClients": 3
}
```

**Response (Redis Disabled)**:
```json
{
  "enabled": false,
  "message": "Redis is not enabled"
}
```

**Status Codes**:
- `200 OK`: Redis is healthy or disabled
- `503 Service Unavailable`: Redis is unhealthy

---

#### GET /metrics

**Description**: Prometheus metrics endpoint

**Authentication**: Not required (consider adding in production)

**Response**: Prometheus text format

```
# HELP process_cpu_user_seconds_total Total user CPU time spent
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.5

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/",status_code="200"} 150

# HELP websocket_connections_active Number of active WebSocket connections
# TYPE websocket_connections_active gauge
websocket_connections_active 45
```

**Available Metrics**:
- **System Metrics**: CPU, memory, event loop lag
- **HTTP Metrics**: Request count, duration, status codes
- **WebSocket Metrics**: Active connections, messages sent/received
- **Call Metrics**: Total calls, call duration, call outcomes

---

#### GET /api-docs

**Description**: Interactive Swagger UI API documentation

**Authentication**: Not required

**Access**: Open in browser for interactive documentation

**Features**:
- Try out API endpoints
- View request/response schemas
- Authentication examples
- WebSocket event documentation

---

### Authentication Endpoints

#### POST /api/auth/guest

**Description**: Authenticate as a guest user (if enabled)

**Authentication**: Not required

**Rate Limit**: 5 requests per 15 minutes per IP

**Request Body**: None required

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHRlbnNpb24iOiIxMjMtNDU2IiwiaWF0IjoxNjE2MjM5MDIyfQ...",
  "extension": "123-456",
  "expiresIn": "24h"
}
```

**Status Codes**:
- `200 OK`: Successfully authenticated
- `403 Forbidden`: Guest access is disabled
- `429 Too Many Requests`: Rate limit exceeded

**Example**:
```bash
curl -X POST https://signal.notrack.co.uk/api/auth/guest
```

---

#### POST /api/auth/register

**Description**: Register a new user account

**Authentication**: Not required

**Rate Limit**: 5 requests per 15 minutes per IP

**Request Body**:
```json
{
  "username": "user@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}
```

**Validation Rules**:
- `username`: Valid email format, 3-255 characters
- `password`: Minimum 8 characters, must include uppercase, lowercase, number
- `confirmPassword`: Must match password

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "extension": "789-012",
  "expiresIn": "24h"
}
```

**Status Codes**:
- `201 Created`: Successfully registered
- `400 Bad Request`: Validation error
- `409 Conflict`: Username already exists
- `429 Too Many Requests`: Rate limit exceeded

**Example**:
```bash
curl -X POST https://signal.notrack.co.uk/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'
```

---

#### POST /api/auth/login

**Description**: Login with username and password

**Authentication**: Not required

**Rate Limit**: 5 requests per 15 minutes per IP

**Request Body**:
```json
{
  "username": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "extension": "789-012",
  "expiresIn": "24h"
}
```

**Status Codes**:
- `200 OK`: Successfully authenticated
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded

**Example**:
```bash
curl -X POST https://signal.notrack.co.uk/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "SecurePass123!"
  }'
```

---

## WebSocket Events

### Connection

#### Connecting to WebSocket

**Endpoint**: `wss://signal.notrack.co.uk` (or `ws://localhost:3000`)

**Authentication**:
```javascript
const socket = io('wss://signal.notrack.co.uk', {
  auth: {
    token: 'your-jwt-token-here'
  },
  transports: ['websocket', 'polling']
});
```

**Connection Events**:

1. **connect** - Successfully connected
2. **disconnect** - Connection closed
3. **connect_error** - Connection failed
4. **reconnect** - Reconnected after disconnect

---

### Client → Server Events

#### call-user

**Description**: Initiate a call to another user

**Payload**:
```json
{
  "targetExtension": "456-789",
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n..."
  }
}
```

**Validation**:
- `targetExtension`: Must be valid extension format (XXX-XXX)
- `offer`: Must contain valid WebRTC SDP offer
- Target user must be online

**Server Response Events**:
- `call-made` - Call successfully initiated
- `error` - Call failed (user offline, invalid extension, etc.)

**Example**:
```javascript
socket.emit('call-user', {
  targetExtension: '456-789',
  offer: peerConnection.localDescription
});
```

---

#### answer-call

**Description**: Answer an incoming call

**Payload**:
```json
{
  "targetExtension": "123-456",
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n..."
  }
}
```

**Validation**:
- `targetExtension`: Must be valid extension format
- `answer`: Must contain valid WebRTC SDP answer
- Must have an incoming call from target

**Server Response Events**:
- `answer-made` - Answer sent successfully
- `error` - Answer failed

**Example**:
```javascript
socket.emit('answer-call', {
  targetExtension: '123-456',
  answer: peerConnection.localDescription
});
```

---

#### ice-candidate

**Description**: Exchange ICE candidates for NAT traversal

**Payload**:
```json
{
  "targetExtension": "456-789",
  "candidate": {
    "candidate": "candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host",
    "sdpMLineIndex": 0,
    "sdpMid": "audio"
  }
}
```

**Validation**:
- `targetExtension`: Must be valid extension format
- `candidate`: Must contain valid ICE candidate data
- Must have an active call with target

**Server Response**: Forwards to target user

**Example**:
```javascript
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('ice-candidate', {
      targetExtension: '456-789',
      candidate: event.candidate
    });
  }
};
```

---

#### end-call

**Description**: End an active call

**Payload**:
```json
{
  "targetExtension": "456-789"
}
```

**Validation**:
- `targetExtension`: Must be valid extension format
- Must have an active call with target

**Server Response Events**:
- `call-ended` - Call ended successfully
- Notifies target user with `call-ended` event

**Example**:
```javascript
socket.emit('end-call', {
  targetExtension: '456-789'
});
```

---

### Server → Client Events

#### incoming-call

**Description**: Notification of an incoming call

**Payload**:
```json
{
  "from": "123-456",
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n..."
  }
}
```

**Client Action**: Display incoming call modal, create peer connection

**Example Handler**:
```javascript
socket.on('incoming-call', ({ from, offer }) => {
  // Show incoming call UI
  showIncomingCallModal(from);
  
  // Create peer connection
  peerConnection = createPeerConnection();
  await peerConnection.setRemoteDescription(offer);
  
  // Create answer
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  // Send answer back
  socket.emit('answer-call', {
    targetExtension: from,
    answer: answer
  });
});
```

---

#### call-made

**Description**: Confirmation that call was successfully initiated

**Payload**:
```json
{
  "to": "456-789"
}
```

**Client Action**: Update UI to show calling state

---

#### answer-made

**Description**: Notification that call was answered

**Payload**:
```json
{
  "from": "456-789",
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n..."
  }
}
```

**Client Action**: Set remote description on peer connection

**Example Handler**:
```javascript
socket.on('answer-made', async ({ from, answer }) => {
  await peerConnection.setRemoteDescription(answer);
  // Call is now connected
  updateCallStatus('connected');
});
```

---

#### ice-candidate-received

**Description**: ICE candidate from remote peer

**Payload**:
```json
{
  "from": "456-789",
  "candidate": {
    "candidate": "candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host",
    "sdpMLineIndex": 0,
    "sdpMid": "audio"
  }
}
```

**Client Action**: Add ICE candidate to peer connection

**Example Handler**:
```javascript
socket.on('ice-candidate-received', async ({ from, candidate }) => {
  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
```

---

#### call-ended

**Description**: Notification that call was ended by remote peer

**Payload**:
```json
{
  "from": "456-789"
}
```

**Client Action**: Close peer connection, update UI

**Example Handler**:
```javascript
socket.on('call-ended', ({ from }) => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  updateCallStatus('ended');
  hideCallUI();
});
```

---

#### error

**Description**: Error occurred during WebSocket operation

**Payload**:
```json
{
  "message": "User not found",
  "code": "USER_NOT_FOUND"
}
```

**Common Error Codes**:
- `USER_NOT_FOUND`: Target extension not online
- `INVALID_EXTENSION`: Extension format invalid
- `ALREADY_IN_CALL`: User already in another call
- `RATE_LIMIT_EXCEEDED`: Too many events sent
- `AUTHENTICATION_FAILED`: Invalid or expired token

**Example Handler**:
```javascript
socket.on('error', ({ message, code }) => {
  console.error('Socket error:', message);
  showErrorNotification(message);
});
```

---

## Error Handling

### HTTP Error Response Format

```json
{
  "error": {
    "message": "Detailed error message",
    "status": 400,
    "stack": "Error stack trace (development only)"
  }
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily down |

### WebSocket Error Handling

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
  // Implement reconnection logic
});

socket.on('error', ({ message, code }) => {
  console.error('Socket error:', message, code);
  // Handle specific error codes
});
```

---

## Rate Limiting

### HTTP Rate Limits

#### Authentication Endpoints
- **Limit**: 5 requests per 15 minutes per IP
- **Applies to**:
  - `POST /api/auth/guest`
  - `POST /api/auth/login`
  - `POST /api/auth/register`

#### General API Endpoints
- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: All `/api/*` endpoints

### Rate Limit Headers

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2024-12-22T12:15:00.000Z
```

### WebSocket Rate Limits

- **Connection**: 3 attempts per 5 minutes per IP
- **Events**: 50 events per minute per connection

### Handling Rate Limits

```javascript
// Check rate limit headers
const remaining = response.headers['x-ratelimit-remaining'];
if (remaining < 2) {
  console.warn('Approaching rate limit');
}

// Handle 429 response
if (response.status === 429) {
  const resetTime = response.headers['x-ratelimit-reset'];
  const waitTime = new Date(resetTime) - new Date();
  setTimeout(() => retry(), waitTime);
}
```

---

## Code Examples

### Complete Call Flow Example

```javascript
import io from 'socket.io-client';

// 1. Authenticate and get token
async function authenticate() {
  const response = await fetch('https://signal.notrack.co.uk/api/auth/guest', {
    method: 'POST'
  });
  const { token, extension } = await response.json();
  return { token, extension };
}

// 2. Connect to WebSocket
function connectSocket(token) {
  const socket = io('wss://signal.notrack.co.uk', {
    auth: { token },
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('Connected to signaling server');
  });
  
  return socket;
}

// 3. Setup WebRTC
function createPeerConnection() {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:turn.example.com:3478',
        username: 'username',
        credential: 'password'
      }
    ]
  });
  
  // Add local audio stream
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    });
  
  return pc;
}

// 4. Make a call
async function makeCall(socket, targetExtension) {
  const peerConnection = createPeerConnection();
  
  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        targetExtension,
        candidate: event.candidate
      });
    }
  };
  
  // Handle remote audio
  peerConnection.ontrack = (event) => {
    const remoteAudio = document.getElementById('remoteAudio');
    remoteAudio.srcObject = event.streams[0];
  };
  
  // Create and send offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  
  socket.emit('call-user', {
    targetExtension,
    offer: peerConnection.localDescription
  });
  
  return peerConnection;
}

// 5. Handle incoming call
function setupCallHandlers(socket) {
  let peerConnection;
  
  socket.on('incoming-call', async ({ from, offer }) => {
    peerConnection = createPeerConnection();
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          targetExtension: from,
          candidate: event.candidate
        });
      }
    };
    
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    socket.emit('answer-call', {
      targetExtension: from,
      answer: answer
    });
  });
  
  socket.on('answer-made', async ({ answer }) => {
    await peerConnection.setRemoteDescription(answer);
  });
  
  socket.on('ice-candidate-received', async ({ candidate }) => {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });
  
  socket.on('call-ended', () => {
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
  });
}

// Usage
(async () => {
  const { token, extension } = await authenticate();
  const socket = connectSocket(token);
  setupCallHandlers(socket);
  
  // Make a call
  await makeCall(socket, '456-789');
})();
```

---

## Interactive Documentation

### Swagger UI

Access interactive API documentation at:

**URL**: https://signal.notrack.co.uk/api-docs

Features:
- Try out all API endpoints
- View request/response schemas
- Test authentication
- See WebSocket event documentation
- Download OpenAPI spec

### OpenAPI Specification

Download the complete OpenAPI 3.0 specification:

**URL**: https://signal.notrack.co.uk/swagger.json

---

## Best Practices

### Authentication
1. Store JWT token securely (httpOnly cookie or secure storage)
2. Include token in all authenticated requests
3. Refresh token before expiration
4. Handle 401 responses by re-authenticating

### WebSocket
1. Implement reconnection logic
2. Handle connection state changes
3. Validate all incoming data
4. Implement timeout mechanisms
5. Clean up resources on disconnect

### Error Handling
1. Always handle errors gracefully
2. Provide user-friendly error messages
3. Log errors for debugging
4. Implement retry logic for transient failures
5. Monitor error rates

### Performance
1. Reuse WebSocket connections
2. Implement connection pooling
3. Use compression for large payloads
4. Implement client-side caching
5. Monitor API response times

---

## Support

For API questions or issues:

- **Email**: admin@notrack.co.uk
- **Documentation**: https://github.com/Erikoliva1/no-call/tree/main/docs
- **Issues**: https://github.com/Erikoliva1/no-call/issues

---

**API Version**: 2.2.4  
**Last Updated**: 2024-12-22  
**Contact**: admin@notrack.co.uk
