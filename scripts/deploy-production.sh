#!/bin/bash
# Switchboard Production Deployment Script

set -e

echo "🚀 Starting Switchboard Production Deployment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Please do not run this script as root"
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    log_error ".env.production file not found"
    log_info "Please create .env.production with your configuration"
    exit 1
fi

# Load environment variables
log_info "Loading environment configuration..."
source .env.production

# Check required environment variables
required_vars=("SOLANA_RPC_URL" "ETHEREUM_RPC_URL" "DATABASE_URL" "REDIS_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

log_success "Environment configuration loaded"

# Step 1: Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

log_success "Pre-deployment checks passed"

# Step 2: Build all packages
log_info "Building all packages..."
npm install
npm run build

if [ $? -ne 0 ]; then
    log_error "Build failed"
    exit 1
fi

log_success "All packages built successfully"

# Step 3: Check Solana programs (if program IDs are not set)
if [ -z "$STATE_ORACLE_PROGRAM_ID" ] || [ -z "$COORDINATOR_PROGRAM_ID" ]; then
    log_warning "Solana program IDs not found in environment"
    log_info "Please deploy Solana programs first:"
    log_info "cd packages/programs && anchor build && anchor deploy"

    read -p "Do you want to continue without Solana programs? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    log_success "Solana program IDs found"
fi

# Step 4: Database schema setup
log_info "Setting up database schema..."
if [ -f "scripts/schema.sql" ]; then
    log_info "Database schema file found"
else
    log_warning "Database schema file not found, creating basic schema..."
    mkdir -p scripts
    cat > scripts/schema.sql << 'EOF'
-- Switchboard Database Schema
CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    deployment_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    chains TEXT[] NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(255) NOT NULL,
    chain_name VARCHAR(100) NOT NULL,
    deployment_id VARCHAR(255) REFERENCES deployments(deployment_id),
    status VARCHAR(50) NOT NULL,
    block_number BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    deployment_id VARCHAR(255) REFERENCES deployments(deployment_id),
    amount DECIMAL(18,8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deployments_id ON deployments(deployment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_deployment ON transactions(deployment_id);
CREATE INDEX IF NOT EXISTS idx_billing_user ON billing(user_id);
EOF
fi

log_success "Database schema prepared"

# Step 5: Build Docker images
log_info "Building Docker images..."
docker-compose -f docker-compose.production.yml build --no-cache

if [ $? -ne 0 ]; then
    log_error "Docker build failed"
    exit 1
fi

log_success "Docker images built successfully"

# Step 6: Stop existing services
log_info "Stopping existing services..."
docker-compose -f docker-compose.production.yml down

# Step 7: Start services
log_info "Starting Switchboard services..."
docker-compose -f docker-compose.production.yml up -d

if [ $? -ne 0 ]; then
    log_error "Failed to start services"
    exit 1
fi

log_success "Services started successfully"

# Step 8: Wait for services to be ready
log_info "Waiting for services to start..."
sleep 30

# Step 9: Health checks
log_info "Running health checks..."

# Health check function
check_health() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null; then
            log_success "$service_name is healthy"
            return 0
        fi

        log_info "Attempt $attempt/$max_attempts: Waiting for $service_name..."
        sleep 2
        ((attempt++))
    done

    log_error "$service_name health check failed"
    return 1
}

# Check service health
health_checks_passed=true

# Internal health checks (Docker network)
if ! check_health "http://localhost:3000/health" "API Service"; then
    health_checks_passed=false
fi

if ! check_health "http://localhost:3001/health" "Oracle Service"; then
    health_checks_passed=false
fi

if ! check_health "http://localhost:3002/health" "Sync Service"; then
    health_checks_passed=false
fi

# Check database connectivity
log_info "Checking database connectivity..."
if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U switchboard; then
    log_success "Database is ready"
else
    log_error "Database connectivity check failed"
    health_checks_passed=false
fi

# Check Redis connectivity
log_info "Checking Redis connectivity..."
if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping | grep -q PONG; then
    log_success "Redis is ready"
else
    log_error "Redis connectivity check failed"
    health_checks_passed=false
fi

# Step 10: Display deployment summary
echo
echo "========================================="
echo "🎉 Switchboard Deployment Summary"
echo "========================================="

if [ "$health_checks_passed" = true ]; then
    log_success "All health checks passed!"

    echo
    log_info "Service URLs:"
    echo "  📡 API Service: http://localhost:3000"
    echo "  🔍 Oracle Service: http://localhost:3001"
    echo "  🔄 Sync Service: http://localhost:3002"
    echo "  💰 Fee Oracle: http://localhost:3003"
    echo "  📊 Billing Service: http://localhost:3004"
    echo "  📈 Prometheus: http://localhost:9090"
    echo "  📊 Grafana: http://localhost:3001"

    echo
    log_info "Useful commands:"
    echo "  View logs: docker-compose -f docker-compose.production.yml logs -f [service]"
    echo "  Check status: docker-compose -f docker-compose.production.yml ps"
    echo "  Restart service: docker-compose -f docker-compose.production.yml restart [service]"
    echo "  Stop all: docker-compose -f docker-compose.production.yml down"

    echo
    log_success "Switchboard is now running in production mode! 🚀"

else
    log_error "Some health checks failed. Please check the logs:"
    echo "  docker-compose -f docker-compose.production.yml logs"
    exit 1
fi

# Step 11: Post-deployment tasks
echo
log_info "Post-deployment recommendations:"
echo "  1. Set up SSL certificates for external access"
echo "  2. Configure DNS records for your domain"
echo "  3. Set up monitoring alerts in Grafana"
echo "  4. Review security settings and firewall rules"
echo "  5. Set up automated backups"
echo "  6. Test API endpoints with your domain"

echo
log_info "For SSL setup, run: sudo certbot --nginx -d your-domain.com"
log_info "For monitoring setup, visit: http://localhost:3001 (Grafana)"

echo
echo "========================================="
log_success "Deployment completed successfully! ✅"
echo "========================================="