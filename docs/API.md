# API Documentation

## Base URL

```
Production: https://api.vlinders.app
Development: http://localhost:8787
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained through the `/auth/login` endpoint and expire after 7 days.

## Rate Limiting

- Anonymous requests: 100 requests per 15 minutes
- Authenticated requests: 1000 requests per 15 minutes

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestId": "unique-request-id",
  "details": {}
}
```

### Error Codes

- `VALIDATION_ERROR` (400): Invalid request data
- `AUTHENTICATION_ERROR` (401): Missing or invalid authentication
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict (e.g., duplicate email)
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## Health Endpoints

### GET /health

Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-28T12:00:00.000Z",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "cache": { "status": "healthy", "latency": 2 },
    "storage": { "status": "healthy", "latency": 3 }
  }
}
```

### GET /health/ready

Check if API is ready to accept requests.

**Response:**
```json
{
  "ready": true,
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

### GET /health/live

Check if API is alive (liveness probe).

**Response:**
```json
{
  "alive": true,
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:** (201 Created)
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-02-28T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- 400: Invalid email or weak password
- 409: Email already registered

### POST /auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- 401: Invalid credentials

### POST /auth/refresh

Refresh authentication token.

**Headers:**
```
Authorization: Bearer <current-token>
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- 401: Invalid or expired token

### POST /auth/logout

Logout and invalidate token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (204 No Content)

---

## User Endpoints

### GET /users/me

Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2026-02-28T12:00:00.000Z",
  "updatedAt": "2026-02-28T12:00:00.000Z"
}
```

### PATCH /users/me

Update current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "updatedAt": "2026-02-28T12:30:00.000Z"
}
```

**Errors:**
- 400: Invalid data
- 409: Email already in use

### DELETE /users/me

Delete current user account.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (204 No Content)

---

## Butterfly Endpoints

### GET /butterflies

List all butterflies with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by name or scientific name
- `family` (optional): Filter by family
- `status` (optional): Filter by conservation status

**Response:**
```json
{
  "data": [
    {
      "id": "butterfly_123",
      "name": "Monarch Butterfly",
      "scientificName": "Danaus plexippus",
      "family": "Nymphalidae",
      "description": "Large orange and black butterfly...",
      "imageUrl": "https://storage.vlinders.app/butterflies/monarch.jpg",
      "conservationStatus": "vulnerable",
      "createdAt": "2026-02-28T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### GET /butterflies/:id

Get butterfly details by ID.

**Response:**
```json
{
  "id": "butterfly_123",
  "name": "Monarch Butterfly",
  "scientificName": "Danaus plexippus",
  "family": "Nymphalidae",
  "description": "Large orange and black butterfly...",
  "imageUrl": "https://storage.vlinders.app/butterflies/monarch.jpg",
  "conservationStatus": "vulnerable",
  "habitat": "Open fields, meadows, gardens",
  "wingspan": "8.9-10.2 cm",
  "createdAt": "2026-02-28T12:00:00.000Z",
  "updatedAt": "2026-02-28T12:00:00.000Z"
}
```

**Errors:**
- 404: Butterfly not found

### POST /butterflies

Create a new butterfly entry (admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request:**
```json
{
  "name": "Blue Morpho",
  "scientificName": "Morpho menelaus",
  "family": "Nymphalidae",
  "description": "Brilliant blue butterfly...",
  "conservationStatus": "least_concern"
}
```

**Response:** (201 Created)
```json
{
  "id": "butterfly_456",
  "name": "Blue Morpho",
  "scientificName": "Morpho menelaus",
  "family": "Nymphalidae",
  "description": "Brilliant blue butterfly...",
  "conservationStatus": "least_concern",
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

**Errors:**
- 400: Invalid data
- 403: Insufficient permissions
- 409: Butterfly already exists

### PATCH /butterflies/:id

Update butterfly information (admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request:**
```json
{
  "description": "Updated description...",
  "conservationStatus": "endangered"
}
```

**Response:**
```json
{
  "id": "butterfly_123",
  "name": "Monarch Butterfly",
  "description": "Updated description...",
  "conservationStatus": "endangered",
  "updatedAt": "2026-02-28T13:00:00.000Z"
}
```

### DELETE /butterflies/:id

Delete a butterfly entry (admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:** (204 No Content)

---

## Observation Endpoints

### GET /observations

List user's butterfly observations.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `butterflyId` (optional): Filter by butterfly

**Response:**
```json
{
  "data": [
    {
      "id": "obs_123",
      "butterflyId": "butterfly_123",
      "butterfly": {
        "id": "butterfly_123",
        "name": "Monarch Butterfly"
      },
      "location": {
        "latitude": 52.3676,
        "longitude": 4.9041,
        "name": "Amsterdam, Netherlands"
      },
      "observedAt": "2026-02-28T10:00:00.000Z",
      "notes": "Spotted in the park",
      "imageUrl": "https://storage.vlinders.app/observations/obs_123.jpg",
      "createdAt": "2026-02-28T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### POST /observations

Create a new observation.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "butterflyId": "butterfly_123",
  "location": {
    "latitude": 52.3676,
    "longitude": 4.9041,
    "name": "Amsterdam, Netherlands"
  },
  "observedAt": "2026-02-28T10:00:00.000Z",
  "notes": "Spotted in the park"
}
```

**Response:** (201 Created)
```json
{
  "id": "obs_456",
  "butterflyId": "butterfly_123",
  "location": {
    "latitude": 52.3676,
    "longitude": 4.9041,
    "name": "Amsterdam, Netherlands"
  },
  "observedAt": "2026-02-28T10:00:00.000Z",
  "notes": "Spotted in the park",
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

### GET /observations/:id

Get observation details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "obs_123",
  "butterflyId": "butterfly_123",
  "butterfly": {
    "id": "butterfly_123",
    "name": "Monarch Butterfly",
    "scientificName": "Danaus plexippus"
  },
  "location": {
    "latitude": 52.3676,
    "longitude": 4.9041,
    "name": "Amsterdam, Netherlands"
  },
  "observedAt": "2026-02-28T10:00:00.000Z",
  "notes": "Spotted in the park",
  "imageUrl": "https://storage.vlinders.app/observations/obs_123.jpg",
  "createdAt": "2026-02-28T12:00:00.000Z"
}
```

### DELETE /observations/:id

Delete an observation.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** (204 No Content)

---

## Image Upload

### POST /upload

Upload an image for observations.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:**
```
Form data with 'file' field containing image
```

**Response:**
```json
{
  "url": "https://storage.vlinders.app/observations/obs_123.jpg",
  "key": "observations/obs_123.jpg"
}
```

**Errors:**
- 400: Invalid file type or size
- 413: File too large (max 5MB)

---

## Admin Endpoints

### GET /admin/stats

Get platform statistics (admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "users": {
    "total": 1250,
    "active": 890,
    "new": 45
  },
  "butterflies": {
    "total": 150,
    "byFamily": {
      "Nymphalidae": 45,
      "Papilionidae": 30
    }
  },
  "observations": {
    "total": 5420,
    "thisMonth": 234
  }
}
```

---

## Webhooks

### POST /webhooks/butterfly-update

Receive notifications about butterfly data updates.

**Payload:**
```json
{
  "event": "butterfly.updated",
  "timestamp": "2026-02-28T12:00:00.000Z",
  "data": {
    "id": "butterfly_123",
    "changes": ["conservationStatus"]
  }
}
```

---

## Response Headers

All responses include:
- `X-Request-ID`: Unique request identifier
- `X-RateLimit-*`: Rate limiting information
- `Content-Type`: application/json

## Versioning

The API uses URL versioning. Current version is v1 (implicit in base URL).
Future versions will use `/v2/` prefix.
