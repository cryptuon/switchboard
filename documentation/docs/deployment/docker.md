# Docker Deployment

Deploy Switchboard locally using Docker Compose.

## Prerequisites

- Docker 20+
- Docker Compose 2+
- 4GB RAM minimum

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/switchboard/switchboard
cd switchboard
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database (MongoDB by default)
DATABASE_TYPE=mongodb
MONGODB_PASSWORD=switchboard123

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com

# Security
JWT_SECRET=change-this-in-production
```

### 3. Start Services

=== "With MongoDB (Default)"

    ```bash
    docker-compose up -d
    ```

=== "With PostgreSQL"

    ```bash
    DATABASE_TYPE=postgresql docker-compose --profile postgres up -d
    ```

### 4. Verify

```bash
# Check all services
docker-compose ps

# Check Customer API
curl http://localhost:3000/health

# Check Core Engine
curl http://localhost:3001/health
```

## Docker Compose Configuration

### Default Services

```yaml
# docker-compose.yml
services:
  customer-api:
    build:
      context: .
      dockerfile: packages/services/customer-api/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_TYPE=${DATABASE_TYPE:-mongodb}
    depends_on:
      - mongodb
      - redis

  core-engine:
    build:
      context: .
      dockerfile: packages/services/core-engine/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_TYPE=${DATABASE_TYPE:-mongodb}
    depends_on:
      - mongodb
      - redis
      - clickhouse

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"
    volumes:
      - clickhouse_data:/var/lib/clickhouse

volumes:
  mongodb_data:
  clickhouse_data:
```

### PostgreSQL Profile

```yaml
# Included in docker-compose.yml
profiles:
  - postgres

postgres:
  image: postgres:16
  ports:
    - "5432:5432"
  environment:
    - POSTGRES_USER=switchboard
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    - POSTGRES_DB=switchboard
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

## Common Commands

### Start/Stop

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f customer-api
docker-compose logs -f core-engine
```

### Rebuild

```bash
# Rebuild and restart
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build customer-api
```

### Shell Access

```bash
# Access container shell
docker-compose exec customer-api sh
docker-compose exec core-engine sh
```

## Development Mode

For active development with hot reloading:

```yaml
# docker-compose.override.yml
services:
  customer-api:
    volumes:
      - ./packages/services/customer-api:/app
    command: npm run dev

  core-engine:
    volumes:
      - ./packages/services/core-engine:/app
    command: npm run dev
```

Then run:

```bash
docker-compose up -d
```

## Resource Limits

Add resource constraints for stability:

```yaml
services:
  customer-api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Health Checks

Built-in health checks:

```yaml
services:
  customer-api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs customer-api

# Check container status
docker-compose ps
```

### Database Connection Issues

```bash
# Verify database is running
docker-compose ps mongodb

# Check database logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh
```

### Port Conflicts

```bash
# Check what's using the port
lsof -i :3000

# Change port in docker-compose.yml
ports:
  - "3100:3000"  # Map to 3100 instead
```

### Out of Memory

```bash
# Check container stats
docker stats

# Increase Docker memory limit
# Docker Desktop: Settings > Resources > Memory
```

## Next Steps

- [Production Deployment](production.md) - Production-ready configuration
- [Cloud Providers](cloud.md) - Deploy to AWS, GCP, or Azure
