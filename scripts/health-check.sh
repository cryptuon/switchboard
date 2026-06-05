#!/bin/bash
# Switchboard Health Check Script

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "🏥 Switchboard Health Check"
echo "========================="

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local service_name=$2
    local timeout=${3:-5}

    log_info "Checking $service_name at $url"

    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $timeout "$url" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        log_success "$service_name is healthy ✅"
        return 0
    else
        log_error "$service_name is unhealthy (HTTP $response) ❌"
        return 1
    fi
}

# Function to check Docker service
check_docker_service() {
    local service_name=$1
    local compose_file=${2:-"docker-compose.production.yml"}

    log_info "Checking Docker service: $service_name"

    if docker-compose -f "$compose_file" ps "$service_name" | grep -q "Up"; then
        log_success "$service_name container is running ✅"
        return 0
    else
        log_error "$service_name container is not running ❌"
        return 1
    fi
}

# Function to check database
check_database() {
    log_info "Checking PostgreSQL database"

    if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U switchboard 2>/dev/null; then
        log_success "PostgreSQL is ready ✅"

        # Check if tables exist
        table_count=$(docker-compose -f docker-compose.production.yml exec -T postgres psql -U switchboard -d switchboard -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        if [ "$table_count" -gt 0 ]; then
            log_success "Database schema is set up ($table_count tables) ✅"
        else
            log_warning "Database schema appears to be empty"
        fi
        return 0
    else
        log_error "PostgreSQL is not ready ❌"
        return 1
    fi
}

# Function to check Redis
check_redis() {
    log_info "Checking Redis cache"

    if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_success "Redis is responding ✅"
        return 0
    else
        log_error "Redis is not responding ❌"
        return 1
    fi
}

# Function to check Solana connection
check_solana() {
    log_info "Checking Solana connectivity"

    if [ -n "$SOLANA_RPC_URL" ]; then
        response=$(curl -s -X POST "$SOLANA_RPC_URL" \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' \
            --max-time 10 2>/dev/null || echo "")

        if echo "$response" | grep -q "solana-core"; then
            log_success "Solana RPC is responding ✅"
            return 0
        else
            log_error "Solana RPC is not responding ❌"
            return 1
        fi
    else
        log_warning "SOLANA_RPC_URL not set"
        return 1
    fi
}

# Function to check external blockchain RPCs
check_external_rpcs() {
    log_info "Checking external blockchain RPC endpoints"

    local rpcs=(
        "ETHEREUM_RPC_URL:Ethereum"
        "POLYGON_RPC_URL:Polygon"
        "ARBITRUM_RPC_URL:Arbitrum"
        "OPTIMISM_RPC_URL:Optimism"
    )

    local healthy_rpcs=0
    local total_rpcs=${#rpcs[@]}

    for rpc_info in "${rpcs[@]}"; do
        IFS=':' read -r var_name chain_name <<< "$rpc_info"
        rpc_url="${!var_name}"

        if [ -n "$rpc_url" ]; then
            response=$(curl -s -X POST "$rpc_url" \
                -H "Content-Type: application/json" \
                -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                --max-time 5 2>/dev/null || echo "")

            if echo "$response" | grep -q "result"; then
                log_success "$chain_name RPC is responding ✅"
                ((healthy_rpcs++))
            else
                log_error "$chain_name RPC is not responding ❌"
            fi
        else
            log_warning "$chain_name RPC URL not configured"
        fi
    done

    log_info "External RPCs: $healthy_rpcs/$total_rpcs healthy"
    return 0
}

# Function to check disk space
check_disk_space() {
    log_info "Checking disk space"

    available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
    used_percentage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$used_percentage" -lt 80 ]; then
        log_success "Disk space is healthy (${used_percentage}% used, ${available_space}G available) ✅"
        return 0
    elif [ "$used_percentage" -lt 90 ]; then
        log_warning "Disk space is getting low (${used_percentage}% used, ${available_space}G available) ⚠️"
        return 0
    else
        log_error "Disk space is critically low (${used_percentage}% used, ${available_space}G available) ❌"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    log_info "Checking memory usage"

    if command -v free >/dev/null 2>&1; then
        memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
        available_memory=$(free -h | grep Mem | awk '{print $7}')

        if [ "$memory_usage" -lt 80 ]; then
            log_success "Memory usage is healthy (${memory_usage}%, ${available_memory} available) ✅"
            return 0
        elif [ "$memory_usage" -lt 90 ]; then
            log_warning "Memory usage is high (${memory_usage}%, ${available_memory} available) ⚠️"
            return 0
        else
            log_error "Memory usage is critically high (${memory_usage}%, ${available_memory} available) ❌"
            return 1
        fi
    else
        log_warning "Cannot check memory usage (free command not available)"
        return 0
    fi
}

# Main health check execution
main() {
    local overall_status=0

    echo
    log_info "Starting comprehensive health check..."
    echo

    # Load environment if available
    if [ -f ".env.production" ]; then
        source .env.production
    fi

    # System checks
    echo "📊 System Health:"
    check_disk_space || overall_status=1
    check_memory || overall_status=1
    echo

    # Docker service checks
    echo "🐳 Docker Services:"
    check_docker_service "postgres" || overall_status=1
    check_docker_service "redis" || overall_status=1
    check_docker_service "api-service-1" || overall_status=1
    check_docker_service "oracle-service-1" || overall_status=1
    check_docker_service "sync-service" || overall_status=1
    echo

    # Database checks
    echo "💾 Data Layer:"
    check_database || overall_status=1
    check_redis || overall_status=1
    echo

    # API endpoint checks
    echo "🌐 API Endpoints:"
    check_endpoint "http://localhost:3000/health" "API Service" || overall_status=1
    check_endpoint "http://localhost:3001/health" "Oracle Service" || overall_status=1
    check_endpoint "http://localhost:3002/health" "Sync Service" || overall_status=1
    echo

    # External connectivity checks
    echo "🔗 External Connectivity:"
    check_solana || overall_status=1
    check_external_rpcs
    echo

    # Summary
    echo "========================="
    if [ $overall_status -eq 0 ]; then
        log_success "🎉 All critical health checks passed! Switchboard is healthy."
    else
        log_error "❌ Some health checks failed. Please review the issues above."
    fi
    echo "========================="

    return $overall_status
}

# Run health check
main "$@"