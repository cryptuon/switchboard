# Production Deployment

Best practices for deploying ChainSync in production.

## Pre-Deployment Checklist

- [ ] Secure environment variables
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and alerting
- [ ] Configure backups
- [ ] Review security settings
- [ ] Load test the deployment
- [ ] Document runbooks

## Environment Configuration

### Production Environment Variables

```bash
# Service Configuration
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://user:password@mongodb-cluster:27017/chainsync?replicaSet=rs0

# Redis (for caching)
REDIS_URL=redis://:password@redis-cluster:6379

# Security
JWT_SECRET=<strong-random-secret>
API_RATE_LIMIT=100

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Stripe (Billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
```

### Secrets Management

Never store secrets in code. Use:

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **GCP Secret Manager**
- **Azure Key Vault**

Example with Docker secrets:

```yaml
services:
  customer-api:
    secrets:
      - jwt_secret
      - mongodb_password

secrets:
  jwt_secret:
    external: true
  mongodb_password:
    external: true
```

## Docker Production Configuration

### Production Compose File

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  customer-api:
    image: chainsync/customer-api:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  core-engine:
    image: chainsync/core-engine:latest
    restart: always
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '4'
          memory: 4G
```

### Start Production

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Reverse Proxy

### Nginx Configuration

```nginx
upstream customer_api {
    least_conn;
    server customer-api-1:3000;
    server customer-api-2:3000;
    server customer-api-3:3000;
}

server {
    listen 443 ssl http2;
    server_name api.chainsync.dev;

    ssl_certificate /etc/ssl/certs/chainsync.crt;
    ssl_certificate_key /etc/ssl/private/chainsync.key;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    location / {
        proxy_pass http://customer_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    location /health {
        proxy_pass http://customer_api;
        access_log off;
    }
}
```

## Database Configuration

### MongoDB Replica Set

For production, use a replica set:

```yaml
services:
  mongodb-primary:
    image: mongo:7
    command: mongod --replSet rs0
    volumes:
      - mongodb_primary:/data/db

  mongodb-secondary-1:
    image: mongo:7
    command: mongod --replSet rs0
    volumes:
      - mongodb_secondary_1:/data/db

  mongodb-secondary-2:
    image: mongo:7
    command: mongod --replSet rs0
    volumes:
      - mongodb_secondary_2:/data/db
```

### PostgreSQL with Replication

```yaml
services:
  postgres-primary:
    image: postgres:16
    environment:
      - POSTGRES_REPLICATION_MODE=master
    volumes:
      - postgres_primary:/var/lib/postgresql/data

  postgres-replica:
    image: postgres:16
    environment:
      - POSTGRES_REPLICATION_MODE=slave
      - POSTGRES_MASTER_HOST=postgres-primary
```

## Monitoring

### Prometheus Metrics

Services expose metrics at `/metrics`:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'chainsync'
    static_configs:
      - targets:
        - 'customer-api:3000'
        - 'core-engine:3001'
```

### Key Metrics to Monitor

| Metric | Alert Threshold |
|--------|-----------------|
| `http_request_duration_seconds` | p99 > 1s |
| `http_requests_total{status="5xx"}` | > 1% |
| `coordination_latency_ms` | > 400ms |
| `database_connections` | > 80% pool |
| `memory_usage_bytes` | > 90% limit |

### Grafana Dashboard

Import the ChainSync dashboard from:

```
https://grafana.com/grafana/dashboards/chainsync
```

## Logging

### Structured Logging

Configure JSON logging for production:

```bash
LOG_FORMAT=json
LOG_LEVEL=info
```

### Log Aggregation

Use ELK stack or similar:

```yaml
services:
  customer-api:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "fluentd:24224"
        tag: "chainsync.customer-api"
```

## Backups

### Database Backups

```bash
# MongoDB backup
mongodump --uri="$MONGODB_URL" --out=/backups/$(date +%Y%m%d)

# PostgreSQL backup
pg_dump "$POSTGRES_URL" > /backups/$(date +%Y%m%d).sql
```

### Automated Backup Schedule

```yaml
services:
  backup:
    image: chainsync/backup
    environment:
      - BACKUP_SCHEDULE=0 2 * * *
      - S3_BUCKET=chainsync-backups
    volumes:
      - backup_data:/backups
```

## Security Hardening

### Network Security

```yaml
services:
  customer-api:
    networks:
      - frontend
      - backend

  core-engine:
    networks:
      - backend  # Not exposed to frontend

  mongodb:
    networks:
      - backend  # Not exposed externally

networks:
  frontend:
  backend:
    internal: true
```

### Container Security

```yaml
services:
  customer-api:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    user: "1000:1000"
```

## Scaling

### Horizontal Scaling

```bash
# Scale Customer API
docker-compose up -d --scale customer-api=5

# Scale Core Engine
docker-compose up -d --scale core-engine=3
```

### Auto-Scaling (Kubernetes)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: customer-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: customer-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Next Steps

- [Cloud Providers](cloud.md) - AWS, GCP, Azure deployment
- [Configuration Reference](../configuration/index.md) - All configuration options
- [Troubleshooting](../support/troubleshooting.md) - Common issues
