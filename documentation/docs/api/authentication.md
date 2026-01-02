# Authentication

ChainSync supports two authentication methods: JWT tokens and API keys.

## JWT Authentication

### Register

Create a new account.

```bash
POST /auth/register
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_abc123",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "rt_abc123..."
  }
}
```

### Login

Authenticate and receive tokens.

```bash
POST /auth/login
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "rt_abc123...",
    "expiresIn": 3600
  }
}
```

### Using JWT Tokens

Include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://api.chainsync.dev/api/v1/deployments
```

### Refresh Token

Refresh an expired JWT token.

```bash
POST /auth/refresh
```

**Request:**

```json
{
  "refreshToken": "rt_abc123..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

## API Key Authentication

API keys are recommended for server-to-server communication.

### Create API Key

```bash
POST /auth/api-keys
```

**Request:**

```json
{
  "name": "Production Server",
  "permissions": ["deploy", "read", "billing"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "name": "Production Server",
    "key": "cs_live_abc123...",  // Only shown once!
    "permissions": ["deploy", "read", "billing"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

!!! warning "Save Your API Key"
    The full API key is only shown once at creation. Store it securely.

### Using API Keys

Include the API key in the X-API-Key header:

```bash
curl -H "X-API-Key: cs_live_abc123..." \
  https://api.chainsync.dev/api/v1/deployments
```

### List API Keys

```bash
GET /auth/api-keys
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "key_abc123",
      "name": "Production Server",
      "lastUsed": "2024-01-15T12:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Revoke API Key

```bash
DELETE /auth/api-keys/:id
```

## Permissions

API keys can have specific permissions:

| Permission | Description |
|------------|-------------|
| `deploy` | Create and manage deployments |
| `read` | Read deployments and transactions |
| `billing` | Access billing and usage information |
| `admin` | Full access (all permissions) |

## Security Best Practices

1. **Use HTTPS** - Always use encrypted connections
2. **Rotate Keys** - Regularly rotate API keys
3. **Minimum Permissions** - Grant only required permissions
4. **Secure Storage** - Store keys in environment variables or secrets managers
5. **Monitor Usage** - Review API key usage regularly

## Error Responses

### Invalid Credentials

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### Expired Token

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "JWT token has expired"
  }
}
```

### Invalid API Key

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key is invalid or revoked"
  }
}
```

## SDK Authentication

When using the SDK, authentication is handled automatically:

```typescript
import { ChainSync } from '@chainsync/sdk';

// Using API key
const chainSync = new ChainSync({
  apiKey: process.env.CHAINSYNC_API_KEY,
  // ...
});

// Using JWT
const chainSync = new ChainSync({
  auth: {
    email: 'user@example.com',
    password: 'password',
  },
  // ...
});
```
