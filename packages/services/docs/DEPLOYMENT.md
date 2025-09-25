# ChainSync Deployment Guide

This guide covers deploying ChainSync services to production environments using various deployment strategies.

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **MongoDB**: 5.0 or higher
- **Memory**: Minimum 2GB RAM per service
- **Storage**: 20GB+ available disk space
- **Network**: Outbound HTTPS access to blockchain RPC endpoints

### External Dependencies

- **Blockchain RPC Endpoints**: Reliable RPC providers for target chains
- **Database**: MongoDB cluster with replica set
- **Monitoring**: Prometheus and Grafana (recommended)
- **Load Balancer**: For high availability deployments

## Environment Configuration

### Environment Variables

Create environment files for each service with required configuration:

#### Shared Environment Variables

```bash
# Node.js Configuration
NODE_ENV=production
PORT=3000

# Logging Configuration
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# Database Configuration
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/chainsync?retryWrites=true&w=majority
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# Security Configuration
JWT_SECRET=your-very-secure-jwt-secret-minimum-32-characters
CORS_ORIGINS=https://app.chainsync.com,https://dashboard.chainsync.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Monitoring Configuration
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### Blockchain Configuration

```bash
# Ethereum Mainnet
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-infura-key
ETHEREUM_PRIVATE_KEY=0x1234567890abcdef... # For deployments
ETHEREUM_CHAIN_ID=1

# Polygon Mainnet
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/your-infura-key
POLYGON_PRIVATE_KEY=0x1234567890abcdef...
POLYGON_CHAIN_ID=137

# Arbitrum One
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_PRIVATE_KEY=0x1234567890abcdef...
ARBITRUM_CHAIN_ID=42161

# Binance Smart Chain
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_PRIVATE_KEY=0x1234567890abcdef...
BSC_CHAIN_ID=56

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=base58-encoded-private-key
```

#### Service-Specific Configuration

**API Service** (`.env.api`):
```bash
# API Service Specific
SERVICE_NAME=chainsync-api
SERVICE_VERSION=1.0.0

# Additional API configuration
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
```

**Sync Service** (`.env.sync`):
```bash
# Sync Service Specific
SERVICE_NAME=chainsync-sync
SERVICE_VERSION=1.0.0

# Processing Configuration
MAX_CONCURRENT_DEPLOYMENTS=5
MONITOR_INTERVAL_MS=10000
DEPLOYMENT_TIMEOUT_MS=300000

# Queue Configuration
QUEUE_BATCH_SIZE=10
QUEUE_PROCESSING_INTERVAL=5000
```

## Docker Deployment

### Docker Images

#### API Service Dockerfile

```dockerfile
# packages/services/api/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/services/shared/package*.json ./packages/services/shared/
COPY packages/services/api/package*.json ./packages/services/api/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/services/shared ./packages/services/shared
COPY packages/services/api ./packages/services/api

# Build applications
RUN cd packages/services/shared && npm run build
RUN cd packages/services/api && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S chainsync && \
    adduser -S chainsync -u 1001

# Copy built application
COPY --from=builder --chown=chainsync:chainsync /app/packages/services/api/dist ./dist
COPY --from=builder --chown=chainsync:chainsync /app/packages/services/api/node_modules ./node_modules
COPY --from=builder --chown=chainsync:chainsync /app/packages/services/api/package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER chainsync

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]
```

#### Sync Service Dockerfile

```dockerfile
# packages/services/sync-service/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/services/shared/package*.json ./packages/services/shared/
COPY packages/services/sync-service/package*.json ./packages/services/sync-service/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/services/shared ./packages/services/shared
COPY packages/services/sync-service ./packages/services/sync-service

# Build applications
RUN cd packages/services/shared && npm run build
RUN cd packages/services/sync-service && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S chainsync && \
    adduser -S chainsync -u 1001

# Copy built application
COPY --from=builder --chown=chainsync:chainsync /app/packages/services/sync-service/dist ./dist
COPY --from=builder --chown=chainsync:chainsync /app/packages/services/sync-service/node_modules ./node_modules
COPY --from=builder --chown=chainsync:chainsync /app/packages/services/sync-service/package*.json ./

# Switch to non-root user
USER chainsync

# Start application
CMD ["node", "dist/index.js"]
```

### Docker Compose

#### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: chainsync-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: chainsync
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - chainsync-network

  api-service:
    build:
      context: .
      dockerfile: packages/services/api/Dockerfile
    container_name: chainsync-api
    restart: unless-stopped
    env_file:
      - .env.shared
      - .env.api
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
    networks:
      - chainsync-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  sync-service:
    build:
      context: .
      dockerfile: packages/services/sync-service/Dockerfile
    container_name: chainsync-sync
    restart: unless-stopped
    env_file:
      - .env.shared
      - .env.sync
    depends_on:
      - mongodb
    networks:
      - chainsync-network

  prometheus:
    image: prom/prometheus:latest
    container_name: chainsync-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - chainsync-network

  grafana:
    image: grafana/grafana:latest
    container_name: chainsync-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - chainsync-network

volumes:
  mongodb_data:
  prometheus_data:
  grafana_data:

networks:
  chainsync-network:
    driver: bridge
```

#### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api-service:
    image: chainsync/api:${VERSION:-latest}
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
      restart_policy:
        condition: on-failure
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    networks:
      - chainsync-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  sync-service:
    image: chainsync/sync:${VERSION:-latest}
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 1G
          cpus: '0.5'
      restart_policy:
        condition: on-failure
        max_attempts: 3
    env_file:
      - .env.production
    networks:
      - chainsync-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api-service
    networks:
      - chainsync-network

networks:
  chainsync-network:
    external: true
```

## Kubernetes Deployment

### Namespace and ConfigMaps

```yaml
# k8s/namespace.yml
apiVersion: v1
kind: Namespace
metadata:
  name: chainsync
  labels:
    name: chainsync
---
# k8s/configmap.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chainsync-config
  namespace: chainsync
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  ENABLE_METRICS: "true"
  ENABLE_HEALTH_CHECKS: "true"
  RATE_LIMIT_WINDOW: "900000"
  RATE_LIMIT_MAX: "100"
```

### Secrets

```yaml
# k8s/secrets.yml
apiVersion: v1
kind: Secret
metadata:
  name: chainsync-secrets
  namespace: chainsync
type: Opaque
data:
  DATABASE_URL: <base64-encoded-mongodb-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ETHEREUM_PRIVATE_KEY: <base64-encoded-private-key>
  POLYGON_PRIVATE_KEY: <base64-encoded-private-key>
  SENTRY_DSN: <base64-encoded-sentry-dsn>
```

### API Service Deployment

```yaml
# k8s/api-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chainsync-api
  namespace: chainsync
  labels:
    app: chainsync-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chainsync-api
  template:
    metadata:
      labels:
        app: chainsync-api
    spec:
      containers:
      - name: api
        image: chainsync/api:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: SERVICE_NAME
          value: "chainsync-api"
        envFrom:
        - configMapRef:
            name: chainsync-config
        - secretRef:
            name: chainsync-secrets
        resources:
          requests:
            memory: 512Mi
            cpu: 250m
          limits:
            memory: 1Gi
            cpu: 500m
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
---
# k8s/api-service.yml
apiVersion: v1
kind: Service
metadata:
  name: chainsync-api-service
  namespace: chainsync
  labels:
    app: chainsync-api
spec:
  selector:
    app: chainsync-api
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
---
# k8s/api-ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chainsync-api-ingress
  namespace: chainsync
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.chainsync.com
    secretName: chainsync-api-tls
  rules:
  - host: api.chainsync.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: chainsync-api-service
            port:
              number: 80
```

### Sync Service Deployment

```yaml
# k8s/sync-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chainsync-sync
  namespace: chainsync
  labels:
    app: chainsync-sync
spec:
  replicas: 2
  selector:
    matchLabels:
      app: chainsync-sync
  template:
    metadata:
      labels:
        app: chainsync-sync
    spec:
      containers:
      - name: sync
        image: chainsync/sync:v1.0.0
        env:
        - name: SERVICE_NAME
          value: "chainsync-sync"
        - name: MAX_CONCURRENT_DEPLOYMENTS
          value: "5"
        - name: MONITOR_INTERVAL_MS
          value: "10000"
        envFrom:
        - configMapRef:
            name: chainsync-config
        - secretRef:
            name: chainsync-secrets
        resources:
          requests:
            memory: 1Gi
            cpu: 500m
          limits:
            memory: 2Gi
            cpu: 1000m
        livenessProbe:
          exec:
            command:
            - node
            - -e
            - "process.exit(0)"
          initialDelaySeconds: 30
          periodSeconds: 30
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chainsync-api-hpa
  namespace: chainsync
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chainsync-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chainsync-sync-hpa
  namespace: chainsync
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chainsync-sync
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 85
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "chainsync-rules.yml"

scrape_configs:
  - job_name: 'chainsync-api'
    static_configs:
      - targets: ['api-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'chainsync-sync'
    static_configs:
      - targets: ['sync-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Alerting Rules

```yaml
# monitoring/chainsync-rules.yml
groups:
  - name: chainsync-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: DeploymentQueueBacklog
        expr: chainsync_active_deployments > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High deployment queue backlog"
          description: "{{ $value }} deployments in queue"

      - alert: DatabaseConnectionFailure
        expr: up{job="mongodb"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failure"
          description: "MongoDB is not responding"

      - alert: ServiceDown
        expr: up{job=~"chainsync-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "ChainSync service is down"
          description: "{{ $labels.job }} is not responding"
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "ChainSync Dashboard",
    "panels": [
      {
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ endpoint }}"
          }
        ]
      },
      {
        "title": "Deployment Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(chainsync_deployments_total{status=\"completed\"}[5m]) / rate(chainsync_deployments_total[5m]) * 100",
            "legendFormat": "Success Rate"
          }
        ]
      },
      {
        "title": "Active Deployments",
        "type": "stat",
        "targets": [
          {
            "expr": "chainsync_active_deployments",
            "legendFormat": "Active"
          }
        ]
      },
      {
        "title": "Database Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(db_query_duration_seconds_sum[5m]) / rate(db_query_duration_seconds_count[5m])",
            "legendFormat": "{{ operation }}"
          }
        ]
      }
    ]
  }
}
```

## Load Balancing

### Nginx Configuration

```nginx
# nginx/nginx.conf
upstream chainsync_api {
    least_conn;
    server api-service-1:3000 max_fails=3 fail_timeout=30s;
    server api-service-2:3000 max_fails=3 fail_timeout=30s;
    server api-service-3:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.chainsync.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.chainsync.com;

    ssl_certificate /etc/nginx/ssl/chainsync.crt;
    ssl_certificate_key /etc/nginx/ssl/chainsync.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Gzip compression
    gzip on;
    gzip_types application/json text/plain application/javascript text/css;

    location / {
        proxy_pass http://chainsync_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location /health {
        proxy_pass http://chainsync_api;
        access_log off;
    }

    location /metrics {
        proxy_pass http://chainsync_api;
        allow 10.0.0.0/8;
        deny all;
    }
}
```

## Database Setup

### MongoDB Replica Set

```yaml
# mongodb/replica-set.yml
version: '3.8'
services:
  mongo-primary:
    image: mongo:5.0
    command: mongod --replSet rs0 --bind_ip_all
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo-primary-data:/data/db
    ports:
      - "27017:27017"

  mongo-secondary:
    image: mongo:5.0
    command: mongod --replSet rs0 --bind_ip_all
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo-secondary-data:/data/db
    ports:
      - "27018:27017"

  mongo-arbiter:
    image: mongo:5.0
    command: mongod --replSet rs0 --bind_ip_all
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo-arbiter-data:/data/db
    ports:
      - "27019:27017"

volumes:
  mongo-primary-data:
  mongo-secondary-data:
  mongo-arbiter-data:
```

### Database Indexes

```javascript
// scripts/create-indexes.js
db = db.getSiblingDB('chainsync');

// Deployments collection indexes
db.deployments.createIndex({ "deploymentId": 1 }, { unique: true });
db.deployments.createIndex({ "status": 1, "createdAt": -1 });
db.deployments.createIndex({ "initiatedBy": 1, "createdAt": -1 });
db.deployments.createIndex({ "chains.name": 1, "chains.status": 1 });
db.deployments.createIndex({ "createdAt": -1 });
db.deployments.createIndex({ "updatedAt": 1 });

// Transactions collection indexes
db.transactions.createIndex({ "transactionId": 1 }, { unique: true });
db.transactions.createIndex({ "transactionHash": 1 }, { unique: true });
db.transactions.createIndex({ "deploymentId": 1, "status": 1 });
db.transactions.createIndex({ "chain": 1, "status": 1 });
db.transactions.createIndex({ "status": 1, "createdAt": 1 });
db.transactions.createIndex({ "confirmations": 1, "requiredConfirmations": 1 });
db.transactions.createIndex({ "status": 1, "updatedAt": 1 });
```

## Security Considerations

### Network Security

1. **VPC/Network Isolation**: Deploy services in private subnets
2. **Security Groups**: Restrict port access to necessary services only
3. **TLS Encryption**: Use HTTPS for all external communication
4. **Certificate Management**: Use Let's Encrypt or managed certificates

### Application Security

1. **Environment Variables**: Never hardcode secrets in images
2. **Non-root Containers**: Run containers as non-privileged users
3. **Image Scanning**: Scan container images for vulnerabilities
4. **Secret Management**: Use Kubernetes secrets or HashiCorp Vault

### Database Security

1. **Authentication**: Enable MongoDB authentication
2. **Encryption**: Use MongoDB encryption at rest and in transit
3. **Network Access**: Restrict database access to application servers only
4. **Backup Encryption**: Encrypt database backups

## Backup and Disaster Recovery

### Database Backup

```bash
#!/bin/bash
# scripts/backup-mongodb.sh

BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="chainsync_backup_$DATE"

# Create backup
mongodump --uri="$DATABASE_URL" --out="$BACKUP_DIR/$BACKUP_NAME"

# Compress backup
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/$BACKUP_NAME.tar.gz" s3://chainsync-backups/

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
```

### Recovery Procedures

```bash
#!/bin/bash
# scripts/restore-mongodb.sh

BACKUP_FILE=$1
RESTORE_DIR="/tmp/restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Extract backup
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

# Restore database
BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)
mongorestore --uri="$DATABASE_URL" --drop "$RESTORE_DIR/$BACKUP_NAME"

# Cleanup
rm -rf "$RESTORE_DIR"
```

## Performance Tuning

### Database Optimization

```javascript
// MongoDB configuration for production
// /etc/mongod.conf equivalent settings

// Connection pooling
db.adminCommand({
    "setParameter": 1,
    "maxConns": 20000
});

// WiredTiger cache size (adjust based on available RAM)
db.adminCommand({
    "setParameter": 1,
    "wiredTigerCacheSizeGB": 4
});

// Index building
db.adminCommand({
    "setParameter": 1,
    "maxIndexBuildMemoryUsageMegabytes": 2048
});
```

### Application Optimization

```javascript
// Node.js optimization flags
process.env.NODE_OPTIONS = [
    '--max-old-space-size=2048',
    '--optimize-for-size',
    '--gc-interval=100'
].join(' ');

// Connection pooling settings
const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE_URL, {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    bufferMaxEntries: 0,
    bufferCommands: false
});
```

This deployment guide provides comprehensive coverage of deploying ChainSync services in various environments with proper security, monitoring, and scalability considerations.