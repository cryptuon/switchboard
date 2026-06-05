# Switchboard Cloud Deployment Architecture Guide

This guide provides a complete overview of Switchboard's cloud infrastructure architecture and step-by-step deployment instructions for your team.

## 🏗️ **Switchboard Infrastructure Architecture**

Switchboard consists of **two main deployment layers**:

### **Layer 1: Solana Programs (On-Chain)**
- **State Oracle Program**: Deployed to Solana blockchain
- **Coordinator Program**: Deployed to Solana blockchain
- **Test Program**: For testing and validation

### **Layer 2: Off-Chain Services (Cloud Infrastructure)**
- **Oracle Service**: Multi-chain data collection and verification
- **Sync Service**: Cross-chain synchronization coordination
- **API Service**: RESTful API for external integrations
- **Fee Oracle**: Dynamic fee calculation
- **Billing Service**: Usage tracking and payments

## 🌐 **Complete Architecture Diagram**

```mermaid
graph TB
    subgraph "External Blockchains"
        ETH[Ethereum]
        POLY[Polygon]
        ARB[Arbitrum]
        NEAR[NEAR]
        SUI[Sui]
        COSMOS[Cosmos]
        OTHERS[... 44+ more]
    end

    subgraph "Cloud Infrastructure (Your Deployment)"
        subgraph "Load Balancer"
            LB[Nginx/HAProxy]
        end

        subgraph "API Layer"
            API1[API Service Instance 1]
            API2[API Service Instance 2]
        end

        subgraph "Core Services"
            ORACLE1[Oracle Service Instance 1]
            ORACLE2[Oracle Service Instance 2]
            SYNC[Sync Service]
            FEE[Fee Oracle]
            BILLING[Billing Service]
        end

        subgraph "Data Layer"
            REDIS[Redis Cache]
            POSTGRES[PostgreSQL DB]
        end

        subgraph "Monitoring"
            PROMETHEUS[Prometheus]
            GRAFANA[Grafana]
            LOGS[Log Aggregation]
        end
    end

    subgraph "Solana Blockchain (Deployed Programs)"
        STATE_ORACLE[State Oracle Program]
        COORDINATOR[Coordinator Program]
        TEST_PROG[Test Program]
    end

    subgraph "Users"
        DEV[Developers]
        CLI[Switchboard CLI]
        SDK[Switchboard SDK]
    end

    %% External connections
    ETH --> ORACLE1
    POLY --> ORACLE1
    ARB --> ORACLE2
    NEAR --> ORACLE2
    SUI --> ORACLE1
    COSMOS --> ORACLE2
    OTHERS --> ORACLE1
    OTHERS --> ORACLE2

    %% Internal service connections
    LB --> API1
    LB --> API2

    API1 --> ORACLE1
    API2 --> ORACLE2
    API1 --> SYNC
    API2 --> SYNC

    ORACLE1 --> STATE_ORACLE
    ORACLE2 --> STATE_ORACLE
    SYNC --> COORDINATOR
    FEE --> STATE_ORACLE
    BILLING --> COORDINATOR

    ORACLE1 --> REDIS
    ORACLE2 --> REDIS
    SYNC --> POSTGRES
    BILLING --> POSTGRES

    %% User connections
    DEV --> LB
    CLI --> LB
    SDK --> LB

    %% Monitoring connections
    API1 --> PROMETHEUS
    API2 --> PROMETHEUS
    ORACLE1 --> PROMETHEUS
    ORACLE2 --> PROMETHEUS
    SYNC --> PROMETHEUS
    PROMETHEUS --> GRAFANA
```

## 🚀 **Deployment Components Breakdown**

### **1. On-Chain Components (Solana)**
**What**: Rust programs deployed to Solana blockchain
**Where**: Solana Mainnet/Devnet
**Who Deploys**: Your team (one-time deployment)

### **2. Off-Chain Services (Your Cloud)**
**What**: TypeScript/Node.js microservices
**Where**: Your cloud provider (AWS/GCP/Azure)
**Who Deploys**: Your team (continuous deployment)

### **3. Supporting Infrastructure**
**What**: Databases, caches, monitoring, load balancers
**Where**: Your cloud provider
**Who Manages**: Your team

## ☁️ **Cloud Provider Setup Options**

### **Option 1: AWS Deployment**

#### **Infrastructure Components**
```yaml
# infrastructure.yml
Resources:
  # Compute
  - ECS Cluster (for services)
  - Application Load Balancer
  - Auto Scaling Groups

  # Data
  - RDS PostgreSQL (Multi-AZ)
  - ElastiCache Redis (Clustered)

  # Monitoring
  - CloudWatch Logs/Metrics
  - X-Ray Tracing

  # Security
  - VPC with private subnets
  - Security Groups
  - IAM Roles

  # Storage
  - S3 for backups/logs
  - EFS for shared storage
```

#### **Service Deployment Map**
```bash
# Oracle Service
oracle-service:
  instances: 2
  cpu: 1 vCPU
  memory: 2GB
  ports: [3001]

# Sync Service
sync-service:
  instances: 1
  cpu: 0.5 vCPU
  memory: 1GB
  ports: [3002]

# API Service
api-service:
  instances: 2
  cpu: 0.5 vCPU
  memory: 1GB
  ports: [3000]

# Fee Oracle
fee-oracle:
  instances: 1
  cpu: 0.25 vCPU
  memory: 512MB
  ports: [3003]

# Billing Service
billing-service:
  instances: 1
  cpu: 0.25 vCPU
  memory: 512MB
  ports: [3004]
```

### **Option 2: GCP Deployment**

#### **Infrastructure Components**
```yaml
# GCP Resources
Resources:
  # Compute
  - GKE Cluster (Kubernetes)
  - Cloud Load Balancing

  # Data
  - Cloud SQL PostgreSQL (HA)
  - Memorystore Redis

  # Monitoring
  - Cloud Logging
  - Cloud Monitoring
  - Cloud Trace

  # Security
  - VPC with private subnets
  - Firewall rules
  - Service Accounts
```

### **Option 3: Azure Deployment**

#### **Infrastructure Components**
```yaml
# Azure Resources
Resources:
  # Compute
  - Container Instances
  - Application Gateway

  # Data
  - Azure Database for PostgreSQL
  - Azure Cache for Redis

  # Monitoring
  - Azure Monitor
  - Application Insights
```

## 📋 **Step-by-Step Deployment Guide**

### **Phase 1: Pre-Deployment Setup**

#### **1. Environment Preparation**
```bash
# Clone repository
git clone https://github.com/your-org/switchboard.git
cd switchboard

# Install dependencies
npm install

# Build all packages
npm run build
```

#### **2. Create Environment Configuration**
```bash
# Create production environment file
cp .env.example .env.production

# Edit configuration
nano .env.production
```

**Required Environment Variables:**
```bash
# === SOLANA CONFIGURATION ===
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_deployment_private_key

# === DEPLOYED PROGRAM IDS (Update after deployment) ===
STATE_ORACLE_PROGRAM_ID=F9PpEEnEt7nnNzDom1wK2GtLk2A94ffvMuqbcxXkfwtn
COORDINATOR_PROGRAM_ID=CZP1U8GuiYYW8P3FRTb23nkFBKiKHcwX64oxxMp9QYtP

# === BLOCKCHAIN RPC ENDPOINTS ===
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
NEAR_RPC_URL=https://rpc.mainnet.near.org
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
APTOS_RPC_URL=https://fullnode.mainnet.aptoslabs.com/v1
COSMOS_RPC_URL=https://cosmos-rpc.polkachu.com

# === DATABASE CONFIGURATION ===
DATABASE_URL=postgresql://switchboard:password@your-db-host:5432/switchboard
REDIS_URL=redis://your-redis-host:6379

# === SERVICE CONFIGURATION ===
NODE_ENV=production
LOG_LEVEL=info
API_RATE_LIMIT=1000
JWT_SECRET=your-super-secure-jwt-secret

# === MONITORING ===
PROMETHEUS_PORT=9090
GRAFANA_URL=https://grafana.your-domain.com
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# === SECURITY ===
CORS_ORIGINS=https://your-frontend.com,https://api.your-domain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### **Phase 2: Solana Program Deployment**

#### **1. Setup Solana Deployment Wallet**
```bash
# Generate deployment keypair
solana-keygen new --outfile ~/.config/solana/switchboard-deployer.json

# Fund wallet (minimum 10 SOL for mainnet deployment)
# Transfer SOL from your main wallet to the deployer address

# Configure Solana CLI
solana config set --keypair ~/.config/solana/switchboard-deployer.json
solana config set --url mainnet-beta

# Verify configuration
solana config get
solana balance
```

#### **2. Deploy Solana Programs**
```bash
# Navigate to programs directory
cd packages/programs

# Build programs
anchor build

# Deploy state oracle program
anchor deploy --program-name state-oracle --provider.cluster mainnet

# Deploy coordinator program
anchor deploy --program-name coordinator --provider.cluster mainnet

# Save program IDs
anchor keys list

# Update .env.production with program IDs
echo "STATE_ORACLE_PROGRAM_ID=$(anchor keys list | grep state-oracle | cut -d' ' -f2)" >> ../../.env.production
echo "COORDINATOR_PROGRAM_ID=$(anchor keys list | grep coordinator | cut -d' ' -f2)" >> ../../.env.production
```

#### **3. Initialize Programs**
```bash
# Initialize state oracle
anchor run initialize-state-oracle --provider.cluster mainnet

# Initialize coordinator
anchor run initialize-coordinator --provider.cluster mainnet

# Verify deployments
solana program show $(anchor keys list | grep state-oracle | cut -d' ' -f2)
solana program show $(anchor keys list | grep coordinator | cut -d' ' -f2)
```

### **Phase 3: Cloud Infrastructure Setup**

#### **Option A: AWS Deployment**

##### **1. Create AWS Infrastructure**
```bash
# Install AWS CLI and CDK
npm install -g aws-cdk
aws configure

# Deploy infrastructure stack
cd infrastructure/aws
cdk bootstrap
cdk deploy switchboard-infrastructure-stack
```

##### **2. Setup RDS Database**
```bash
# Create database
aws rds create-db-instance \
  --db-instance-identifier switchboard-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username switchboard \
  --master-user-password YourSecurePassword \
  --allocated-storage 100 \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name switchboard-db-subnet-group

# Create database schema
psql -h your-rds-endpoint -U switchboard -d switchboard -f scripts/schema.sql
```

##### **3. Setup ElastiCache Redis**
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id switchboard-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

##### **4. Deploy Services to ECS**
```bash
# Build Docker images
docker build -t switchboard/oracle-service -f packages/services/oracle-service/Dockerfile .
docker build -t switchboard/sync-service -f packages/services/sync-service/Dockerfile .
docker build -t switchboard/api-service -f packages/services/api/Dockerfile .

# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

docker tag switchboard/oracle-service:latest your-account.dkr.ecr.us-east-1.amazonaws.com/switchboard/oracle-service:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/switchboard/oracle-service:latest

# Deploy ECS services
aws ecs create-service \
  --cluster switchboard-cluster \
  --service-name oracle-service \
  --task-definition switchboard-oracle:1 \
  --desired-count 2
```

#### **Option B: Docker Compose Deployment (Simpler)**

##### **1. Enhanced Docker Compose Setup**
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - api-service-1
      - api-service-2
    networks:
      - switchboard-network

  api-service-1:
    build:
      context: .
      dockerfile: packages/services/api/Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - switchboard-network

  api-service-2:
    build:
      context: .
      dockerfile: packages/services/api/Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - switchboard-network

  oracle-service-1:
    build:
      context: .
      dockerfile: packages/services/oracle-service/Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3001
    env_file:
      - .env.production
    depends_on:
      - redis
    networks:
      - switchboard-network

  oracle-service-2:
    build:
      context: .
      dockerfile: packages/services/oracle-service/Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3001
    env_file:
      - .env.production
    depends_on:
      - redis
    networks:
      - switchboard-network

  sync-service:
    build:
      context: .
      dockerfile: packages/services/sync-service/Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3002
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - switchboard-network

  fee-oracle:
    build:
      context: .
      dockerfile: packages/services/fee-oracle/Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3003
    env_file:
      - .env.production
    networks:
      - switchboard-network

  billing-service:
    build:
      context: .
      dockerfile: packages/services/billing-service/Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3004
    env_file:
      - .env.production
    depends_on:
      - postgres
    networks:
      - switchboard-network

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: switchboard
      POSTGRES_USER: switchboard
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    networks:
      - switchboard-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - switchboard-network

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - switchboard-network

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    networks:
      - switchboard-network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  switchboard-network:
    driver: bridge
```

##### **2. Deploy with Docker Compose**
```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check service health
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f oracle-service-1
```

### **Phase 4: Load Balancer & SSL Setup**

#### **1. Nginx Configuration**
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream api_backend {
        server api-service-1:3000;
        server api-service-2:3000;
    }

    upstream oracle_backend {
        server oracle-service-1:3001;
        server oracle-service-2:3001;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name api.switchboard.org;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.switchboard.org;

        ssl_certificate /etc/ssl/cert.pem;
        ssl_certificate_key /etc/ssl/key.pem;

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Oracle endpoints
        location /oracle/ {
            proxy_pass http://oracle_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### **Phase 5: Monitoring & Alerting Setup**

#### **1. Prometheus Configuration**
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'switchboard-api'
    static_configs:
      - targets: ['api-service-1:3000', 'api-service-2:3000']

  - job_name: 'switchboard-oracle'
    static_configs:
      - targets: ['oracle-service-1:3001', 'oracle-service-2:3001']

  - job_name: 'switchboard-sync'
    static_configs:
      - targets: ['sync-service:3002']

  - job_name: 'switchboard-fee-oracle'
    static_configs:
      - targets: ['fee-oracle:3003']

  - job_name: 'switchboard-billing'
    static_configs:
      - targets: ['billing-service:3004']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### **2. Grafana Dashboard Setup**
```json
{
  "dashboard": {
    "title": "Switchboard Production Dashboard",
    "panels": [
      {
        "title": "Cross-Chain Transaction Volume",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(chainsync_transactions_total[5m]))"
          }
        ]
      },
      {
        "title": "Oracle Service Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job='switchboard-oracle'}"
          }
        ]
      },
      {
        "title": "API Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends"
          }
        ]
      }
    ]
  }
}
```

### **Phase 6: Security & SSL**

#### **1. SSL Certificate Setup**
```bash
# Install Certbot
sudo apt-get install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d api.switchboard.org

# Copy certificates to Docker volume
sudo cp /etc/letsencrypt/live/api.switchboard.org/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/api.switchboard.org/privkey.pem ./ssl/key.pem

# Set up auto-renewal
echo "0 2 * * * root certbot renew --quiet && docker-compose -f docker-compose.production.yml restart nginx" | sudo tee -a /etc/crontab
```

#### **2. Security Configuration**
```bash
# Setup firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to services
sudo ufw deny 3000:3004/tcp
```

## 🔧 **Deployment Scripts**

### **1. Complete Deployment Script**
```bash
#!/bin/bash
# deploy-production.sh

set -e

echo "🚀 Starting Switchboard Production Deployment..."

# 1. Environment setup
echo "📋 Setting up environment..."
source .env.production

# 2. Build all services
echo "🔨 Building services..."
npm run build

# 3. Deploy Solana programs (if needed)
echo "⛓️ Checking Solana programs..."
if [ -z "$STATE_ORACLE_PROGRAM_ID" ]; then
    echo "Deploying Solana programs..."
    cd packages/programs
    anchor build
    anchor deploy --provider.cluster mainnet
    cd ../..
fi

# 4. Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.production.yml build

# 5. Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.production.yml up -d

# 6. Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# 7. Health checks
echo "🏥 Running health checks..."
./scripts/health-check.sh

echo "✅ Switchboard deployed successfully!"
echo "📊 Monitoring: https://grafana.your-domain.com"
echo "🔍 API Docs: https://api.your-domain.com/docs"
```

### **2. Health Check Script**
```bash
#!/bin/bash
# scripts/health-check.sh

ENDPOINTS=(
    "https://api.switchboard.org/health"
    "http://localhost:3001/health"
    "http://localhost:3002/health"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Checking $endpoint..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
    if [ "$response" = "200" ]; then
        echo "✅ $endpoint is healthy"
    else
        echo "❌ $endpoint returned $response"
        exit 1
    fi
done

echo "🎉 All services are healthy!"
```

## 📊 **Resource Requirements**

### **Minimum Production Setup**
```yaml
CPU: 4 vCPUs total
  - Oracle Service: 2 vCPUs (2 instances)
  - API Service: 1 vCPU (2 instances)
  - Sync Service: 0.5 vCPU
  - Other Services: 0.5 vCPU

Memory: 8GB total
  - Oracle Service: 4GB (2 instances)
  - API Service: 2GB (2 instances)
  - Database: 2GB
  - Redis: 512MB
  - Other Services: 1.5GB

Storage: 100GB total
  - Database: 50GB
  - Logs: 20GB
  - Docker Images: 20GB
  - Backups: 10GB

Network: 100 Mbps minimum
```

### **Recommended Production Setup**
```yaml
CPU: 8 vCPUs total
Memory: 16GB total
Storage: 500GB total
Network: 1 Gbps
```

## 💰 **Estimated Cloud Costs**

### **AWS Monthly Costs (us-east-1)**
```yaml
Compute (ECS/EC2):
  - t3.large instances (2): $120/month
  - t3.medium instances (2): $60/month

Database:
  - RDS db.t3.medium: $85/month
  - ElastiCache t3.micro: $15/month

Load Balancer:
  - Application Load Balancer: $25/month

Storage:
  - EBS (500GB): $50/month
  - S3 (backups): $10/month

Data Transfer: $30/month

Total: ~$395/month
```

### **GCP Monthly Costs**
```yaml
Similar configuration: ~$370/month
```

### **Azure Monthly Costs**
```yaml
Similar configuration: ~$380/month
```

## 🔄 **CI/CD Pipeline Setup**

### **GitHub Actions Workflow**
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Build packages
      run: npm run build

    - name: Run tests
      run: npm test

    - name: Deploy to production
      env:
        DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
        DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
      run: |
        echo "$DEPLOY_KEY" > deploy_key
        chmod 600 deploy_key
        scp -i deploy_key -r . $DEPLOY_USER@$DEPLOY_HOST:/opt/switchboard/
        ssh -i deploy_key $DEPLOY_USER@$DEPLOY_HOST 'cd /opt/switchboard && ./scripts/deploy-production.sh'
```

## 🆘 **Troubleshooting Guide**

### **Common Deployment Issues**

#### **1. Solana Program Deployment Fails**
```bash
# Check wallet balance
solana balance

# Verify network connection
solana cluster-version

# Check program size
ls -la packages/programs/target/deploy/

# Solution: Ensure sufficient SOL balance (10+ SOL)
```

#### **2. Service Connection Errors**
```bash
# Check service logs
docker-compose logs oracle-service-1

# Test RPC connections
curl -X POST https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Solution: Verify RPC URLs and API keys
```

#### **3. Database Connection Issues**
```bash
# Test database connection
psql -h your-db-host -U switchboard -d switchboard -c "SELECT version();"

# Check connection pool
docker-compose exec api-service-1 npm run db:status

# Solution: Check DATABASE_URL and firewall rules
```

## 🎯 **Next Steps After Deployment**

1. **Monitor Dashboard**: Set up alerts in Grafana
2. **Performance Testing**: Load test your deployment
3. **Security Audit**: Review security configurations
4. **Backup Strategy**: Implement automated backups
5. **Documentation**: Update team deployment procedures

## 📞 **Team Support**

For deployment assistance:
- **Architecture Questions**: Review this guide and architecture diagrams
- **Technical Issues**: Check troubleshooting section first
- **Emergency Support**: Follow incident response procedures
- **Updates & Maintenance**: Use provided CI/CD pipelines

---

Your Switchboard infrastructure is now production-ready with full monitoring, security, and scalability! 🚀