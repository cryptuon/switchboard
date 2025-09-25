-- ChainSync ClickHouse Analytics Database Initialization
-- Creates optimized tables for high-throughput event and log analytics

-- Create chainsync_analytics database
CREATE DATABASE IF NOT EXISTS chainsync_analytics;

-- Switch to analytics database
USE chainsync_analytics;

-- =====================================================
-- BLOCKCHAIN EVENTS TABLE
-- High-throughput storage for blockchain events
-- =====================================================

CREATE TABLE IF NOT EXISTS blockchain_events (
    -- Event identification
    event_id String,
    chain_name LowCardinality(String),
    chain_id UInt32,

    -- Block information
    block_number UInt64,
    block_hash String,
    block_timestamp DateTime64(3),

    -- Transaction information
    transaction_hash String,
    transaction_index UInt32,
    log_index UInt32,

    -- Contract information
    contract_address String,
    event_name LowCardinality(String),
    event_signature String,

    -- Event data
    topics Array(String),
    data String,
    decoded_data String, -- JSON string of decoded parameters

    -- Processing metadata
    processed_at DateTime64(3) DEFAULT now64(),
    deployment_id Nullable(String),

    -- Partitioning and ordering
    date Date MATERIALIZED toDate(block_timestamp)
) ENGINE = MergeTree()
PARTITION BY (chain_name, date)
ORDER BY (chain_name, block_number, transaction_index, log_index)
SETTINGS index_granularity = 8192;

-- =====================================================
-- DEPLOYMENT ANALYTICS TABLE
-- Analytics data for cross-chain deployments
-- =====================================================

CREATE TABLE IF NOT EXISTS deployment_analytics (
    -- Deployment identification
    deployment_id String,

    -- Timing metrics
    initiated_at DateTime64(3),
    completed_at Nullable(DateTime64(3)),
    total_duration_ms Nullable(UInt32),

    -- Chain metrics
    target_chains Array(String),
    successful_chains Array(String),
    failed_chains Array(String),
    chain_count UInt8,
    success_rate Float32,

    -- Performance metrics
    coordination_latency_ms UInt32,
    average_deployment_time_ms Nullable(UInt32),
    solana_coordination_time_ms Nullable(UInt32),

    -- Resource metrics
    total_gas_used UInt64,
    average_gas_used UInt32,
    total_cost_wei String, -- Large numbers as string

    -- Status and metadata
    final_status LowCardinality(String), -- pending, completed, failed, partial
    error_count UInt16,
    retry_count UInt16,

    -- Contract information
    bytecode_size UInt32,
    contract_addresses Array(String),

    -- Partitioning
    date Date MATERIALIZED toDate(initiated_at)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (final_status, initiated_at)
SETTINGS index_granularity = 8192;

-- =====================================================
-- PERFORMANCE METRICS TABLE
-- System performance tracking and monitoring
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
    -- Metric identification
    metric_name LowCardinality(String),
    service_name LowCardinality(String),

    -- Metric value and context
    value Float64,
    unit LowCardinality(String), -- ms, bytes, count, percentage, etc.
    tags Map(String, String), -- Additional context as key-value pairs

    -- Time and location
    timestamp DateTime64(3),
    chain_name Nullable(String),
    deployment_id Nullable(String),

    -- Aggregation helpers
    hour DateTime MATERIALIZED toStartOfHour(timestamp),
    minute DateTime MATERIALIZED toStartOfMinute(timestamp),

    -- Partitioning
    date Date MATERIALIZED toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (service_name, metric_name, timestamp)
SETTINGS index_granularity = 8192;

-- =====================================================
-- CHAIN STATE LOGS TABLE
-- Historical blockchain state tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS chain_state_logs (
    -- Chain identification
    chain_name LowCardinality(String),
    chain_id UInt32,

    -- Block information
    block_number UInt64,
    block_hash String,
    parent_hash String,
    block_timestamp DateTime64(3),

    -- Block metrics
    transaction_count UInt32,
    gas_used UInt64,
    gas_limit UInt64,
    base_fee_per_gas Nullable(UInt64),

    -- Validator/Miner information
    validator_address String,

    -- Network health
    sync_status LowCardinality(String), -- synced, syncing, behind
    network_health LowCardinality(String), -- healthy, degraded, offline

    -- Processing metadata
    recorded_at DateTime64(3) DEFAULT now64(),
    latency_ms UInt32, -- Time to process this block

    -- Partitioning
    date Date MATERIALIZED toDate(block_timestamp)
) ENGINE = MergeTree()
PARTITION BY (chain_name, date)
ORDER BY (chain_name, block_number)
SETTINGS index_granularity = 8192;

-- =====================================================
-- REAL-TIME COORDINATION LOGS
-- Sub-400ms coordination performance tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS coordination_logs (
    -- Coordination identification
    coordination_id String,
    deployment_id String,

    -- Timing breakdown
    initiated_at DateTime64(3),
    solana_submitted_at DateTime64(3),
    solana_confirmed_at Nullable(DateTime64(3)),
    coordination_completed_at DateTime64(3),

    -- Performance metrics
    total_latency_ms UInt32,
    solana_latency_ms UInt32,
    chain_sync_latency_ms UInt32,

    -- Chain information
    coordinated_chains Array(String),
    chain_count UInt8,

    -- Results
    success Bool,
    error_message Nullable(String),
    solana_transaction_id Nullable(String),

    -- Performance classification
    performance_tier LowCardinality(String), -- excellent(<200ms), good(<400ms), acceptable(<1000ms), slow(>1000ms)
    meets_sla Bool MATERIALIZED total_latency_ms <= 400,

    -- Partitioning
    date Date MATERIALIZED toDate(initiated_at)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (performance_tier, initiated_at)
SETTINGS index_granularity = 8192;

-- =====================================================
-- SYSTEM LOGS TABLE
-- Application logs for debugging and monitoring
-- =====================================================

CREATE TABLE IF NOT EXISTS system_logs (
    -- Log metadata
    timestamp DateTime64(3),
    level LowCardinality(String), -- error, warn, info, debug
    service LowCardinality(String),

    -- Log content
    message String,
    error_code Nullable(String),
    stack_trace Nullable(String),

    -- Context
    chain_name Nullable(String),
    deployment_id Nullable(String),
    transaction_hash Nullable(String),
    user_id Nullable(String),

    -- Additional data
    metadata String, -- JSON string for flexible additional data

    -- Partitioning
    date Date MATERIALIZED toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY (level, date)
ORDER BY (service, timestamp)
SETTINGS index_granularity = 8192;

-- =====================================================
-- MATERIALIZED VIEWS FOR REAL-TIME ANALYTICS
-- =====================================================

-- Hourly performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_performance_mv
TO performance_summary_hourly
AS SELECT
    toStartOfHour(timestamp) as hour,
    service_name,
    metric_name,
    avg(value) as avg_value,
    min(value) as min_value,
    max(value) as max_value,
    count(*) as sample_count
FROM performance_metrics
GROUP BY hour, service_name, metric_name;

-- Create destination table for materialized view
CREATE TABLE IF NOT EXISTS performance_summary_hourly (
    hour DateTime,
    service_name String,
    metric_name String,
    avg_value Float64,
    min_value Float64,
    max_value Float64,
    sample_count UInt64
) ENGINE = SummingMergeTree()
ORDER BY (hour, service_name, metric_name);

-- Daily coordination performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_coordination_mv
TO coordination_summary_daily
AS SELECT
    toDate(initiated_at) as date,
    count(*) as total_coordinations,
    countIf(success) as successful_coordinations,
    countIf(meets_sla) as sla_compliant,
    avg(total_latency_ms) as avg_latency_ms,
    quantile(0.95)(total_latency_ms) as p95_latency_ms,
    quantile(0.99)(total_latency_ms) as p99_latency_ms
FROM coordination_logs
GROUP BY date;

-- Create destination table
CREATE TABLE IF NOT EXISTS coordination_summary_daily (
    date Date,
    total_coordinations UInt64,
    successful_coordinations UInt64,
    sla_compliant UInt64,
    avg_latency_ms Float64,
    p95_latency_ms Float64,
    p99_latency_ms Float64
) ENGINE = SummingMergeTree()
ORDER BY date;

-- =====================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- =====================================================

-- Blockchain events indexes
ALTER TABLE blockchain_events ADD INDEX idx_contract_event (contract_address, event_name) TYPE minmax GRANULARITY 1;
ALTER TABLE blockchain_events ADD INDEX idx_deployment (deployment_id) TYPE bloom_filter GRANULARITY 1;

-- Performance metrics indexes
ALTER TABLE performance_metrics ADD INDEX idx_service_metric (service_name, metric_name) TYPE minmax GRANULARITY 1;
ALTER TABLE performance_metrics ADD INDEX idx_tags (tags) TYPE bloom_filter GRANULARITY 1;

-- Coordination logs indexes
ALTER TABLE coordination_logs ADD INDEX idx_performance_tier (performance_tier) TYPE set GRANULARITY 1;
ALTER TABLE coordination_logs ADD INDEX idx_deployment (deployment_id) TYPE bloom_filter GRANULARITY 1;

-- =====================================================
-- RETENTION POLICIES
-- =====================================================

-- Keep raw events for 90 days, then move to cold storage
-- ALTER TABLE blockchain_events MODIFY TTL date + INTERVAL 90 DAY;

-- Keep detailed performance metrics for 30 days
-- ALTER TABLE performance_metrics MODIFY TTL date + INTERVAL 30 DAY;

-- Keep system logs for 14 days (adjust based on storage needs)
-- ALTER TABLE system_logs MODIFY TTL date + INTERVAL 14 DAY;

-- Keep coordination logs for 180 days (important for SLA compliance)
-- ALTER TABLE coordination_logs MODIFY TTL date + INTERVAL 180 DAY;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample performance metrics
INSERT INTO performance_metrics VALUES
('coordination_latency', 'oracle-service', 250.5, 'ms', {'chain': 'ethereum'}, now64(), 'ethereum', 'deploy_123'),
('deployment_time', 'sync-service', 1200.0, 'ms', {'chains': '2'}, now64(), NULL, 'deploy_123'),
('transaction_throughput', 'api-service', 45.2, 'tps', {'endpoint': 'deploy'}, now64(), NULL, NULL);

-- Insert sample coordination log
INSERT INTO coordination_logs VALUES
('coord_123', 'deploy_123', now64() - 1, now64() - 0.8, now64() - 0.5, now64() - 0.2, 250, 180, 70, ['ethereum', 'polygon'], 2, true, NULL, 'solana_tx_456', 'good', toDate(now64()));

-- =====================================================
-- USER MANAGEMENT
-- =====================================================

-- Create read-only user for analytics queries
-- CREATE USER IF NOT EXISTS 'chainsync_readonly' IDENTIFIED BY 'readonly_password_change_in_production';
-- GRANT SELECT ON chainsync_analytics.* TO 'chainsync_readonly';

-- Create application user for data ingestion
-- CREATE USER IF NOT EXISTS 'chainsync_writer' IDENTIFIED BY 'writer_password_change_in_production';
-- GRANT INSERT, SELECT ON chainsync_analytics.* TO 'chainsync_writer';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'ClickHouse ChainSync Analytics Database Initialized Successfully!' as status;
SELECT 'Created tables: blockchain_events, deployment_analytics, performance_metrics, chain_state_logs, coordination_logs, system_logs' as tables;
SELECT 'Created materialized views for real-time analytics' as views;
SELECT 'Applied performance indexes and partitioning' as optimization;
SELECT 'Database ready for high-throughput event analytics!' as ready;