# ChainSync Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Git
- 8GB+ RAM recommended

### 1. Clone and Configure
```bash
git clone <repository-url>
cd switchboard

# Copy environment template
cp .env.template .env

# Edit configuration (REQUIRED)
nano .env
```

### 2. Configure Environment Variables

**CRITICAL: Update these values in .env before deployment:**

```bash
# Database passwords (CHANGE THESE!)
MONGODB_PASSWORD=your_secure_mongodb_password
CLICKHOUSE_PASSWORD=your_secure_clickhouse_password
REDIS_PASSWORD=your_secure_redis_password

# API keys (REQUIRED for blockchain access)
ALCHEMY_API_KEY=your_alchemy_api_key
SOLANA_PRIVATE_KEY=your_solana_private_key

# Security settings
JWT_SECRET=your_jwt_secret_here
GRAFANA_PASSWORD=your_grafana_admin_password
```

### 3. Deploy Services
```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Verify Deployment
```bash
# Test service endpoints
curl http://localhost:3000/health  # API Service
curl http://localhost:3001/health  # Oracle Service
curl http://localhost:3002/health  # Sync Service

# Access monitoring
open http://localhost:3333  # Grafana (admin/your_password)
open http://localhost:9090  # Prometheus
```

## 📊 Service Architecture

### Services & Ports
- **API Service**: http://localhost:3000 - External API interface
- **Oracle Service**: http://localhost:3001 - Real-time blockchain streaming
- **Sync Service**: http://localhost:3002 - Cross-chain coordination
- **MongoDB**: localhost:27017 - Primary database
- **ClickHouse**: localhost:8123/9000 - Analytics database
- **Redis**: localhost:6379 - Caching layer
- **Prometheus**: http://localhost:9090 - Metrics collection
- **Grafana**: http://localhost:3333 - Monitoring dashboards

### Database Architecture
- **MongoDB**: Deployments, transactions, configuration
- **ClickHouse**: High-throughput event analytics, performance metrics
- **Redis**: Session management, real-time caching

## ⚡ Performance Validation

The system is configured for **sub-400ms coordination latency**:

```bash
# Test coordination performance
curl -X POST http://localhost:3000/api/v1/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "bytecode": "0x608060405234801561001057600080fd5b50...",
    "chains": ["ethereum", "polygon"]
  }'

# Check performance metrics
curl http://localhost:3000/api/v1/metrics/streaming
```

## 🔧 Configuration Options

### Environment Profiles
```bash
# Development (reduced security, verbose logging)
NODE_ENV=development

# Staging (production settings, test data)
NODE_ENV=staging

# Production (full security, optimized performance)
NODE_ENV=production
```

### Performance Tuning
```bash
# Coordination latency target (milliseconds)
COORDINATION_LATENCY_TARGET=400

# Maximum concurrent blockchain connections
MAX_CONCURRENT_CHAINS=100

# Batch processing size for efficiency
BATCH_PROCESSING_SIZE=50

# Database connection pooling
DB_MAX_CONNECTIONS=20
```

### Blockchain Network Configuration
```bash
# Support additional chains by adding RPC endpoints
FANTOM_RPC_URL=https://rpc.fantom.network
NEAR_RPC_URL=https://rpc.mainnet.near.org
```

## 📈 Monitoring & Observability

### Grafana Dashboards
- **ChainSync Overview**: System health and performance
- **Coordination Metrics**: Sub-400ms latency tracking
- **Blockchain Health**: Network status and connectivity
- **Database Performance**: MongoDB, ClickHouse, Redis metrics

### Prometheus Metrics
```bash
# Key metrics to monitor
chainsync_coordination_latency_seconds  # Sub-400ms target
chainsync_deployment_success_rate       # Deployment reliability
chainsync_active_deployments           # System load
http_requests_total                    # API usage
```

### Alerting (Optional)
```bash
# Configure Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Configure email alerts
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🛡️ Security Considerations

### Production Security Checklist
- [ ] Change all default passwords in `.env`
- [ ] Use strong, unique passwords (>20 characters)
- [ ] Enable firewall rules (only expose necessary ports)
- [ ] Use HTTPS with valid SSL certificates
- [ ] Configure CORS origins restrictively
- [ ] Enable rate limiting
- [ ] Set up log monitoring and alerting
- [ ] Regular security updates

### Network Security
```bash
# Recommended firewall rules
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3000  # API Service (or use reverse proxy)
ufw deny 27017  # Block direct MongoDB access
ufw deny 6379   # Block direct Redis access
ufw deny 8123   # Block direct ClickHouse access
```

## 🔄 Backup & Recovery

### Database Backups
```bash
# MongoDB backup
docker exec chainsync-mongodb mongodump --out /backup

# ClickHouse backup
docker exec chainsync-clickhouse clickhouse-backup create

# Redis backup (automatic with RDB snapshots)
docker exec chainsync-redis redis-cli BGSAVE
```

### Service Recovery
```bash
# Restart individual services
docker-compose restart oracle-service
docker-compose restart sync-service
docker-compose restart api-service

# Full system restart
docker-compose down && docker-compose up -d

# Reset databases (DESTRUCTIVE - dev only)
docker-compose down -v && docker-compose up -d
```

## 📊 Scaling Considerations

### Horizontal Scaling
```bash
# Scale sync service for higher throughput
docker-compose up -d --scale sync-service=3

# Scale API service for more requests
docker-compose up -d --scale api-service=2
```

### Vertical Scaling
```bash
# Increase container resources in docker-compose.yml
services:
  oracle-service:
    deploy:
      resources:
        limits:
          memory: 2g
          cpus: '2'
```

### Database Scaling
- **MongoDB**: Enable replica sets for high availability
- **ClickHouse**: Configure clustering for large-scale analytics
- **Redis**: Set up Redis Cluster for distributed caching

## 🚨 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check logs
docker-compose logs oracle-service
docker-compose logs sync-service
docker-compose logs api-service

# Check disk space
df -h

# Check memory usage
free -h
```

**High coordination latency:**
```bash
# Check blockchain RPC connectivity
curl -X POST https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}'

# Monitor database performance
docker exec chainsync-mongodb mongostat
docker exec chainsync-clickhouse clickhouse-client --query "SHOW PROCESSLIST"
```

**Database connection issues:**
```bash
# Test MongoDB connection
docker exec chainsync-mongodb mongosh --eval "db.adminCommand('ping')"

# Test ClickHouse connection
docker exec chainsync-clickhouse clickhouse-client --query "SELECT 1"

# Test Redis connection
docker exec chainsync-redis redis-cli ping
```

### Performance Optimization

**Optimize for sub-400ms latency:**
1. Use SSD storage for databases
2. Ensure stable, low-latency RPC endpoints
3. Monitor network connectivity to blockchain nodes
4. Scale Oracle service horizontally if needed
5. Use Redis caching effectively

**Database optimization:**
```bash
# MongoDB: Create proper indexes (done automatically)
# ClickHouse: Optimize partition keys
# Redis: Configure memory policies
```

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify configuration: Review `.env` file
3. Test connectivity: Use health check endpoints
4. Monitor performance: Use Grafana dashboards

## 🎯 Success Criteria

Your deployment is successful when:
- [ ] All services show "healthy" status
- [ ] API endpoints respond within 200ms
- [ ] Coordination latency consistently <400ms
- [ ] Database connections are stable
- [ ] Monitoring dashboards show green metrics
- [ ] Test deployment completes successfully