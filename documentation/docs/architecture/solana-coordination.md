# Solana Coordination Layer

Switchboard uses Solana as the high-performance coordination layer for cross-chain state synchronization, enabling sub-400ms latency across 50+ blockchains.

## Why Solana?

| Feature | Benefit |
|---------|---------|
| **Sub-second finality** | Fast state confirmation |
| **High throughput** | 65,000+ TPS capacity |
| **Low fees** | Cost-effective coordination |
| **Programmability** | Custom programs for state management |

## Architecture

```
                         ┌──────────────────────────┐
                         │    Solana Coordination   │
                         │                          │
                         │  ┌──────────────────┐   │
                         │  │  State Oracle    │   │
                         │  │    Program       │   │
                         │  └────────┬─────────┘   │
                         │           │             │
                         │  ┌────────┴─────────┐   │
                         │  │   Coordinator    │   │
                         │  │    Program       │   │
                         │  └──────────────────┘   │
                         └───────────┬─────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
   ┌─────────┐                 ┌─────────┐                  ┌─────────┐
   │Ethereum │                 │ Polygon │                  │   Sui   │
   │  State  │                 │  State  │                  │  State  │
   └─────────┘                 └─────────┘                  └─────────┘
```

## Solana Programs

### State Oracle Program

Located at: `packages/programs/state-oracle/`

Handles cross-chain data verification and state recording:

```rust
// State registration
pub fn register_state(
    ctx: Context<RegisterState>,
    chain_id: u64,
    contract_address: [u8; 32],
    state_hash: [u8; 32],
) -> Result<()>

// State verification
pub fn verify_state(
    ctx: Context<VerifyState>,
    chain_id: u64,
    expected_hash: [u8; 32],
) -> Result<bool>
```

**Key Functions:**

| Function | Description |
|----------|-------------|
| `register_state` | Record contract state from any chain |
| `verify_state` | Verify state consistency across chains |
| `update_state` | Update recorded state with new data |
| `query_state` | Query current state for a contract |

### Coordinator Program

Located at: `packages/programs/coordinator/`

Manages cross-chain synchronization and coordination:

```rust
// Deployment coordination
pub fn coordinate_deployment(
    ctx: Context<CoordinateDeployment>,
    deployment_id: [u8; 32],
    target_chains: Vec<u64>,
) -> Result<()>

// State synchronization
pub fn sync_states(
    ctx: Context<SyncStates>,
    source_chain: u64,
    target_chains: Vec<u64>,
) -> Result<()>
```

**Key Functions:**

| Function | Description |
|----------|-------------|
| `coordinate_deployment` | Orchestrate multi-chain deployments |
| `sync_states` | Trigger state synchronization |
| `verify_sync` | Confirm synchronization completed |
| `resolve_conflict` | Handle state conflicts |

## Coordination Flow

### 1. Contract Deployment

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  Client  │───▶│ Core Engine  │───▶│   Solana     │
│ Request  │    │              │    │ Coordinator  │
└──────────┘    └──────┬───────┘    └──────┬───────┘
                       │                   │
                       │ Register          │
                       │ Deployment        │
                       ├──────────────────▶│
                       │                   │
                       │ Deploy to chains  │
                       ├───────────────────┼───────────────┐
                       │                   │               │
                       ▼                   ▼               ▼
                 ┌─────────┐         ┌─────────┐    ┌─────────┐
                 │Ethereum │         │ Polygon │    │Arbitrum │
                 └────┬────┘         └────┬────┘    └────┬────┘
                      │                   │              │
                      │ Confirm           │              │
                      └───────────────────┼──────────────┘
                                          ▼
                                   ┌──────────────┐
                                   │   Solana     │
                                   │ Verification │
                                   └──────────────┘
```

### 2. State Synchronization

```
Time ─────────────────────────────────────────────────────────▶

     │ t=0ms          │ t=100ms        │ t=300ms        │ t=400ms
     │                │                │                │
     │ State Change   │ Oracle         │ Verification   │ Sync
     │ on Ethereum    │ Detection      │ on Solana      │ Complete
     │                │                │                │
     ▼                ▼                ▼                ▼
┌─────────┐    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│Ethereum │───▶│Core Engine  │──▶│   Solana    │──▶│ All Chains  │
│Contract │    │Oracle       │   │ Coordinator │   │ Updated     │
└─────────┘    └─────────────┘   └─────────────┘   └─────────────┘
```

## Performance Characteristics

### Latency Breakdown

| Stage | Typical Latency |
|-------|-----------------|
| Event Detection | 50-100ms |
| Oracle Processing | 50-100ms |
| Solana Confirmation | 100-150ms |
| State Propagation | 50-100ms |
| **Total** | **< 400ms** |

### Throughput

- **Coordinated Operations:** 10,000+/second
- **State Updates:** 5,000+/second
- **Verifications:** 20,000+/second

## Configuration

### Environment Variables

```bash
# Solana RPC Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Program IDs (deployed addresses)
STATE_ORACLE_PROGRAM_ID=<program_address>
COORDINATOR_PROGRAM_ID=<program_address>

# Keypair for signing transactions
SOLANA_KEYPAIR_PATH=/path/to/keypair.json
```

### Streaming Configuration

```bash
# Enable real-time streaming
STREAMING_ENABLED=true

# Target coordination latency
COORDINATION_LATENCY_TARGET=400

# Batch processing settings
BATCH_PROCESSING_SIZE=50
MAX_CONCURRENT_CHAINS=100
```

## Using the SDK

### Registering State

```typescript
import { Switchboard } from '@switchboard/sdk';

const switchboard = new Switchboard({
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
    keypairPath: process.env.SOLANA_KEYPAIR_PATH,
  },
});

// Register contract state on Solana
await switchboard.registerState({
  chainId: 1, // Ethereum
  contractAddress: '0x...',
  stateHash: '0x...',
});
```

### Verifying Cross-Chain State

```typescript
// Verify state consistency
const isConsistent = await switchboard.verifyState({
  contractAddress: '0x...',
  chains: ['ethereum', 'polygon', 'arbitrum'],
});

if (!isConsistent) {
  console.log('State mismatch detected!');
  const details = await switchboard.getStateDiscrepancies();
}
```

### Subscribing to State Changes

```typescript
// Subscribe to state changes
switchboard.onStateChange('0xContractAddress', (event) => {
  console.log(`State changed on ${event.chain}`);
  console.log(`New hash: ${event.stateHash}`);
  console.log(`Latency: ${event.latency}ms`);
});
```

## Error Handling

### State Conflicts

When state conflicts are detected:

1. **Detection** - Oracle identifies mismatched states
2. **Notification** - Event emitted to subscribers
3. **Resolution** - Automatic or manual conflict resolution
4. **Verification** - Final state consistency check

```typescript
// Handle conflicts
switchboard.onConflict((conflict) => {
  console.log(`Conflict detected: ${conflict.type}`);

  // Auto-resolve using source of truth
  await switchboard.resolveConflict(conflict.id, {
    strategy: 'use_source_of_truth',
    sourceChain: 'ethereum',
  });
});
```

### Network Issues

```typescript
// Configure retry behavior
const switchboard = new Switchboard({
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
    retries: 3,
    retryDelay: 1000,
    timeout: 30000,
  },
});
```

## Monitoring

### Health Checks

```bash
# Check Solana coordination status
switchboard status:solana

# View coordination metrics
switchboard metrics --solana
```

### Metrics

Key metrics to monitor:

| Metric | Description | Target |
|--------|-------------|--------|
| `coordination_latency_ms` | Time to coordinate across chains | < 400ms |
| `state_sync_success_rate` | Successful synchronizations | > 99.9% |
| `conflict_rate` | State conflicts detected | < 0.1% |
| `solana_confirmation_time` | Solana transaction confirmation | < 150ms |

## Best Practices

1. **Use Websockets** - Enable streaming for real-time updates
2. **Monitor Latency** - Alert on latency > 400ms
3. **Handle Conflicts** - Implement conflict resolution strategies
4. **Backup RPCs** - Configure fallback Solana RPC endpoints
5. **Batch Operations** - Use batch processing for high-volume operations

## Next Steps

- [Supported Chains](supported-chains.md) - View all supported networks
- [SDK Documentation](../sdk/index.md) - Integration guides
- [Configuration](../configuration/index.md) - Detailed configuration options
