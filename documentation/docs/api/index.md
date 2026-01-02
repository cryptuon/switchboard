# API Reference

ChainSync exposes a REST API through the Customer API service (port 3000).

## Base URL

```
https://api.chainsync.dev/api/v1
```

For local development:

```
http://localhost:3000/api/v1
```

## Authentication

All API requests (except health checks) require authentication. See [Authentication](authentication.md) for details.

## Quick Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get JWT |
| POST | `/auth/refresh` | Refresh JWT token |
| POST | `/auth/api-keys` | Create API key |
| GET | `/auth/api-keys` | List API keys |

### Deployments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/deploy` | Create deployment |
| GET | `/deploy/:id` | Get deployment status |
| GET | `/deploy/:id/status` | Get detailed status |
| GET | `/deploy` | List deployments |

### Chains

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chains` | List supported chains |
| GET | `/chains/:id` | Get chain details |
| GET | `/chains/:id/status` | Get chain health |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List transactions |
| GET | `/transactions/:hash` | Get transaction |
| POST | `/transactions/track` | Track transaction |

### Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/billing/plans` | List available plans |
| POST | `/billing/customers` | Create customer |
| POST | `/billing/subscriptions` | Create subscription |
| GET | `/billing/usage` | Get usage stats |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/metrics/streaming` | Real-time metrics |

## Response Format

All responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Rate Limiting

Default rate limits:

| Tier | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Free | 60 | 1,000 |
| Pro | 300 | 10,000 |
| Enterprise | Unlimited | Unlimited |

Rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:

```
GET /api/v1/deployments?page=1&limit=20
```

Response includes pagination metadata:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Next Steps

- [Authentication](authentication.md) - Learn about API authentication
- [Endpoints](endpoints.md) - Detailed endpoint documentation
