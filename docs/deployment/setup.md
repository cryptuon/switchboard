# ChainSync Deployment Guide

## Overview

This guide covers deploying ChainSync infrastructure to production environments, including Solana programs, off-chain services, and monitoring setup.

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended)
- **CPU**: 4+ cores
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 100GB SSD
- **Network**: Stable internet connection with low latency

### Required Software

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Rust 1.70+
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Solana CLI 1.16+
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
export PATH="/home/$USER/.local/share/solana/install/active_release/bin:$PATH"

# Anchor Framework 0.30+
npm install -g @coral-xyz/anchor-cli@latest
```

### Required Accounts & Keys

1. **Solana Wallet**: For program deployment
2. **RPC Endpoints**: Alchemy, QuickNode, or similar
3. **Domain**: For API endpoints (optional)
4. **SSL Certificate**: For HTTPS (recommended)

## Environment Setup

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/chainsync.git
cd chainsync

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
```

### 2. Environment Variables

Create `.env` file with the following configuration:

```bash
# Solana Configuration
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_KEYPAIR_PATH=/path/to/deployer-keypair.json

# Program IDs (will be generated during deployment)
STATE_ORACLE_PROGRAM_ID=
COORDINATOR_PROGRAM_ID=

# Chain RPC URLs
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# Service Configuration
PORT=3000
LOG_LEVEL=info
METRICS_ENABLED=true

# Database (if using persistent storage)
DATABASE_URL=postgresql://user:password@localhost:5432/chainsync

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret-here
API_RATE_LIMIT=100

# Monitoring
SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io/
PROMETHEUS_PORT=9090
```

## Solana Program Deployment

### 1. Prepare Deployment Wallet

```bash
# Generate new keypair (or use existing)
solana-keygen new --outfile ~/chainsync-deployer.json

# Fund the wallet (minimum 10 SOL recommended)
# For mainnet, transfer SOL from your main wallet
# For devnet/testnet:
solana airdrop 10 ~/chainsync-deployer.json --url devnet

# Set as default keypair
solana config set --keypair ~/chainsync-deployer.json
solana config set --url mainnet-beta
```

### 2. Build Programs

```bash
# Build all Solana programs
cd packages/programs
anchor build

# Verify build
ls -la target/deploy/
# Should show: state_oracle.so, coordinator.so
```

### 3. Deploy Programs

```bash
# Deploy state oracle program
anchor deploy --program-name state-oracle

# Deploy coordinator program
anchor deploy --program-name coordinator

# Note the program IDs and update .env file
```

### 4. Initialize Programs

```bash
# Initialize state oracle
anchor run initialize-state-oracle

# Initialize coordinator
anchor run initialize-coordinator

# Set up treasury accounts
anchor run setup-treasury
```

## Service Deployment

### 1. Build Services

```bash
# Build all TypeScript services
npm run build

# Verify builds
ls -la packages/*/dist/
```

### 2. Database Setup (Optional)

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb chainsync
sudo -u postgres createuser chainsync

# Run migrations (if using database)
npm run migrate
```

### 3. Deploy Oracle Service

```bash
# Start oracle service
cd packages/services/oracle-service
npm start

# Or use PM2 for production
npm install -g pm2
pm2 start dist/index.js --name chainsync-oracle
```

### 4. Deploy Sync Service

```bash
# Start sync service
cd packages/services/sync-service
pm2 start dist/index.js --name chainsync-sync
```

### 5. Deploy API Service

```bash
# Start API service
cd packages/services/api
pm2 start dist/index.js --name chainsync-api
```

### 6. Deploy Fee Oracle

```bash
# Start fee oracle service
cd packages/services/fee-oracle
pm2 start dist/index.js --name chainsync-fee-oracle
```

## Load Balancer & Reverse Proxy

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/chainsync
upstream chainsync_api {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    listen 443 ssl;
    server_name api.chainsync.org;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://chainsync_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}
```

## Monitoring & Logging

### 1. Prometheus Setup

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'chainsync-api'
    static_configs:
      - targets: ['localhost:3000']

  - job_name: 'chainsync-oracle'
    static_configs:
      - targets: ['localhost:3001']

  - job_name: 'chainsync-sync'
    static_configs:
      - targets: ['localhost:3002']
```

### 2. Grafana Dashboard

```json
{
  "dashboard": {
    "title": "ChainSync Monitoring",
    "panels": [
      {
        "title": "Transaction Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(chainsync_transactions_total[5m])"
          }
        ]
      },
      {
        "title": "Cross-Chain Sync Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "chainsync_sync_duration_seconds"
          }
        ]
      }
    ]
  }
}
```

### 3. Log Aggregation

```bash
# Install Fluentd or similar
sudo apt-get install td-agent

# Configure log forwarding
# /etc/td-agent/td-agent.conf
<source>
  @type tail
  path /var/log/switchboard/*.log
  pos_file /var/log/td-agent/chainsync.log.pos
  tag chainsync.*
  format json
</source>

<match chainsync.**>
  @type elasticsearch
  host elasticsearch.your-domain.com
  port 9200
  index_name chainsync
</match>
```

## Security Configuration

### 1. Firewall Setup

```bash
# Basic firewall configuration
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow custom ports (adjust as needed)
sudo ufw allow 3000:3010/tcp
```

### 2. SSL/TLS Configuration

```bash
# Install Certbot for Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.chainsync.org

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. API Security

```javascript
// Rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

## Health Checks & Monitoring

### 1. Health Check Endpoints

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      solana: 'connected',
      redis: 'connected'
    }
  });
});
```

### 2. Uptime Monitoring

```bash
# Simple uptime check script
#!/bin/bash
# monitor.sh

ENDPOINTS=(
  "https://api.chainsync.org/health"
  "https://oracle.chainsync.org/health"
  "https://sync.chainsync.org/health"
)

for endpoint in "${ENDPOINTS[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
  if [ "$status" != "200" ]; then
    echo "ALERT: $endpoint returned $status"
    # Send alert (email, Slack, etc.)
  fi
done
```

### 3. Performance Monitoring

```javascript
// Performance metrics
const promClient = require('prom-client');

const transactionCounter = new promClient.Counter({
  name: 'chainsync_transactions_total',
  help: 'Total number of cross-chain transactions',
  labelNames: ['chain', 'status']
});

const syncLatency = new promClient.Histogram({
  name: 'chainsync_sync_duration_seconds',
  help: 'Cross-chain synchronization latency',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});
```

## Backup & Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/chainsync"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
pg_dump chainsync > "$BACKUP_DIR/db_backup_$DATE.sql"

# Backup configuration files
tar -czf "$BACKUP_DIR/config_backup_$DATE.tar.gz" \
  /etc/nginx/sites-available/chainsync \
  /home/user/switchboard/.env \
  /home/user/switchboard/scripts/

# Upload to S3 or similar
aws s3 cp "$BACKUP_DIR/" s3://chainsync-backups/ --recursive
```

### 2. Disaster Recovery Plan

1. **Service Recovery**: Use PM2 process files to restart services
2. **Database Recovery**: Restore from latest backup
3. **Configuration Recovery**: Restore from backup
4. **Program Recovery**: Redeploy using saved program IDs

## Troubleshooting

### Common Issues

1. **Program deployment fails**
   - Check SOL balance in deployer wallet
   - Verify network connectivity
   - Check Anchor configuration

2. **Service connection errors**
   - Verify RPC endpoint URLs
   - Check firewall settings
   - Validate SSL certificates

3. **Performance issues**
   - Monitor CPU/memory usage
   - Check database query performance
   - Review rate limiting configuration

### Debug Commands

```bash
# Check service status
pm2 status

# View service logs
pm2 logs chainsync-api

# Monitor system resources
htop
iostat -x 1

# Check network connectivity
netstat -tulnp | grep :3000
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review logs and performance metrics
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and rotate API keys
4. **Annually**: Conduct security audit

### Update Procedure

```bash
# 1. Backup current deployment
./scripts/backup.sh

# 2. Pull latest changes
git pull origin main

# 3. Update dependencies
npm install

# 4. Rebuild services
npm run build

# 5. Restart services with zero downtime
pm2 reload all

# 6. Verify deployment
./scripts/health-check.sh
```

## Support

For deployment assistance:

- **Documentation**: [docs.chainsync.org](https://docs.chainsync.org)
- **GitHub Issues**: [github.com/your-org/chainsync/issues](https://github.com/your-org/chainsync/issues)
- **Discord**: [discord.gg/chainsync](https://discord.gg/chainsync)
- **Email**: support@chainsync.org