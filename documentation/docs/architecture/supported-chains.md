# Supported Chains

ChainSync supports **50+ blockchain networks** across multiple ecosystems, enabling truly universal cross-chain deployment.

## Network Categories

### EVM Networks

Fully compatible Ethereum Virtual Machine networks.

| Chain | Chain ID | Network Type | Status |
|-------|----------|--------------|--------|
| **Ethereum** | 1 | Layer 1 | :white_check_mark: Fully Supported |
| **Polygon** | 137 | Layer 2/Sidechain | :white_check_mark: Fully Supported |
| **Arbitrum** | 42161 | Layer 2 Rollup | :white_check_mark: Fully Supported |
| **Optimism** | 10 | Layer 2 Rollup | :white_check_mark: Fully Supported |
| **BNB Smart Chain** | 56 | Layer 1 | :white_check_mark: Fully Supported |
| **Avalanche C-Chain** | 43114 | Layer 1 | :white_check_mark: Fully Supported |
| **Fantom** | 250 | Layer 1 | :white_check_mark: Fully Supported |

### Layer 2 Solutions

Ethereum scaling solutions with enhanced throughput.

| Chain | Chain ID | Base Layer | Status |
|-------|----------|------------|--------|
| **Base** | 8453 | Ethereum | :white_check_mark: Fully Supported |
| **zkSync Era** | 324 | Ethereum | :white_check_mark: Fully Supported |
| **Polygon zkEVM** | 1101 | Ethereum | :white_check_mark: Fully Supported |
| **Linea** | 59144 | Ethereum | :white_check_mark: Fully Supported |
| **Mantle** | 5000 | Ethereum | :white_check_mark: Fully Supported |
| **Scroll** | 534352 | Ethereum | :white_check_mark: Fully Supported |

### Alternative Layer 1 Blockchains

Non-EVM networks with native integration.

| Chain | Chain ID* | Consensus | Status |
|-------|-----------|-----------|--------|
| **NEAR Protocol** | 99990001 | Nightshade | :white_check_mark: Fully Supported |
| **Cosmos Hub** | 99990002 | Tendermint | :white_check_mark: Fully Supported |
| **Terra** | 99990003 | Tendermint | :white_check_mark: Fully Supported |
| **Sui** | 99990004 | Narwhal/Bullshark | :white_check_mark: Fully Supported |
| **Aptos** | 99990005 | AptosBFT | :white_check_mark: Fully Supported |

*Custom chain IDs used for non-EVM chains

### Emerging Networks

Next-generation blockchain platforms.

| Chain | Chain ID | Focus Area | Status |
|-------|----------|------------|--------|
| **Celestia** | 99990006 | Data Availability | :white_check_mark: Fully Supported |
| **Starknet** | 99990007 | zk-STARK Rollup | :white_check_mark: Fully Supported |
| **Flow** | 99990008 | NFT/Gaming | :white_check_mark: Fully Supported |
| **HECO** | 128 | DeFi | :white_check_mark: Fully Supported |
| **Kroma** | 255 | Layer 2 | :white_check_mark: Fully Supported |

### Additional Networks

Extended ecosystem support.

| Chain | Chain ID | Ecosystem | Status |
|-------|----------|-----------|--------|
| **Celo** | 42220 | Mobile-first | :white_check_mark: Fully Supported |
| **Gnosis Chain** | 100 | Community-driven | :white_check_mark: Fully Supported |
| **Moonbeam** | 1284 | Polkadot Parachain | :white_check_mark: Fully Supported |
| **Harmony** | 1666600000 | Sharding | :white_check_mark: Fully Supported |
| **Cronos** | 25 | Crypto.com | :white_check_mark: Fully Supported |
| **Aurora** | 1313161554 | NEAR Ecosystem | :white_check_mark: Fully Supported |
| **Evmos** | 9001 | Cosmos EVM | :white_check_mark: Fully Supported |
| **Kava** | 2222 | Cosmos DeFi | :white_check_mark: Fully Supported |
| **Klaytn** | 8217 | Korean Platform | :white_check_mark: Fully Supported |
| **Oasis Emerald** | 42262 | Privacy | :white_check_mark: Fully Supported |
| **Telos** | 40 | High Performance | :white_check_mark: Fully Supported |
| **Fuse** | 122 | Payments | :white_check_mark: Fully Supported |
| **Moonriver** | 1285 | Kusama Parachain | :white_check_mark: Fully Supported |
| **Milkomeda C1** | 2001 | Cardano Sidechain | :white_check_mark: Fully Supported |
| **Metis Andromeda** | 1088 | Layer 2 | :white_check_mark: Fully Supported |
| **Boba Network** | 288 | Layer 2 | :white_check_mark: Fully Supported |

### Testnet Networks

Development and testing networks.

| Chain | Chain ID | Purpose | Status |
|-------|----------|---------|--------|
| **Goerli** | 5 | Ethereum Testnet | :white_check_mark: Fully Supported |
| **Sepolia** | 11155111 | Ethereum Testnet | :white_check_mark: Fully Supported |
| **Mumbai** | 80001 | Polygon Testnet | :white_check_mark: Fully Supported |
| **Fuji** | 43113 | Avalanche Testnet | :white_check_mark: Fully Supported |

## Usage Examples

### Initialize with Multiple Networks

=== "Layer 1s"

    ```bash
    chainsync init --chains ethereum,polygon,bsc,avalanche
    ```

=== "Layer 2s"

    ```bash
    chainsync init --chains base,arbitrum,optimism,zksync
    ```

=== "Alternative L1s"

    ```bash
    chainsync init --chains near,cosmos,sui,aptos
    ```

=== "Mixed"

    ```bash
    chainsync init --chains ethereum,polygon,near,sui
    ```

### Deploy Across Networks

```bash
# Deploy to major EVM chains
chainsync deploy --chains ethereum,polygon,arbitrum,optimism,bsc,avalanche

# Deploy to Layer 2 ecosystem
chainsync deploy --chains base,zksync,polygonzkevm,linea,mantle,scroll

# Deploy to alternative platforms
chainsync deploy --chains near,cosmos,sui,aptos
```

## Network Characteristics

### Gas and Fee Structures

| Network Type | Typical Gas Cost | Fee Token |
|--------------|------------------|-----------|
| **Ethereum Mainnet** | High | ETH |
| **Layer 2 Rollups** | Low-Medium | ETH |
| **Alternative L1s** | Variable | Native Token |
| **Sidechains** | Low | Native/Bridged Token |

### Block Times and Finality

| Network Type | Block Time | Finality |
|--------------|------------|----------|
| **Ethereum** | ~12s | 12-32 blocks |
| **Layer 2 Rollups** | ~2s | L1 finality |
| **BSC** | ~3s | 15 blocks |
| **Alternative L1s** | 1-6s | Variable |

## Configuration

### Mainnet RPC URLs

```bash
# Major EVM Chains
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Layer 2 Solutions
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ZKSYNC_RPC_URL=https://mainnet.era.zksync.io
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY

# Alternative Layer 1s
NEAR_RPC_URL=https://rpc.mainnet.near.org
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
APTOS_RPC_URL=https://fullnode.mainnet.aptoslabs.com/v1
```

### Testnet RPC URLs

```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

## EVM Compatibility

### Full EVM Compatibility

These networks are 100% EVM compatible:

- Ethereum
- Polygon
- Arbitrum
- Optimism
- BSC
- Avalanche
- Fantom

### EVM-Compatible

These networks support EVM with minor differences:

- Most Layer 2s and sidechains
- zkSync Era (some opcodes differ)
- Polygon zkEVM

### Custom VM

These require chain-specific contract development:

- NEAR (WebAssembly)
- Cosmos (CosmWasm)
- Sui (Move)
- Aptos (Move)

## Best Practices

### Network Selection Strategy

1. **Start with Core Networks** - Ethereum, Polygon, Arbitrum, BSC
2. **Add Layer 2s** - Base, Optimism, zkSync for lower fees
3. **Consider Alternative L1s** - NEAR, Sui, Aptos for specific use cases
4. **Include Emerging Networks** - For early ecosystem advantages

### Multi-Chain Deployment Tips

1. **Test on Testnets First** - Always validate on test networks
2. **Stagger Deployments** - Deploy incrementally to manage risk
3. **Monitor Gas Prices** - Deploy during optimal fee periods
4. **Use CREATE2** - Maintain consistent addresses across chains

### RPC Provider Recommendations

| Provider | Supported Networks | Tier |
|----------|-------------------|------|
| **Alchemy** | EVM chains, Solana | Primary |
| **Infura** | Ethereum, Polygon, etc. | Primary |
| **QuickNode** | Multi-chain | Primary |
| **Public RPCs** | Various | Backup |

## Network Status

Check the current status of all supported networks:

```bash
# Check all networks
chainsync status --chains

# Check specific network
chainsync health --network ethereum

# Validate configuration
chainsync validate --all
```

## Adding New Networks

ChainSync is designed to be extensible. To request support for a new network:

1. Open an issue on [GitHub](https://github.com/chainsync/chainsync/issues)
2. Provide network details (RPC, chain ID, etc.)
3. The team will evaluate and add support

## Next Steps

- [Configuration Guide](../configuration/networks.md) - Network configuration details
- [Deployment Guide](../deployment/index.md) - How to deploy across chains
- [Examples](../examples/index.md) - Multi-chain deployment examples
