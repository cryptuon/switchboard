# Supported Networks and Chains

ChainSync supports a comprehensive list of blockchain networks for maximum reach and interoperability. This document provides a complete reference of all supported chains.

## Network Categories

### 🌐 Ethereum Virtual Machine (EVM) Chains

| Chain | Chain ID | Network Type | Status |
|-------|----------|--------------|--------|
| **Ethereum** | 1 | Layer 1 | ✅ Fully Supported |
| **Polygon** | 137 | Layer 2/Sidechain | ✅ Fully Supported |
| **Arbitrum** | 42161 | Layer 2 Rollup | ✅ Fully Supported |
| **Optimism** | 10 | Layer 2 Rollup | ✅ Fully Supported |
| **BNB Smart Chain** | 56 | Layer 1 | ✅ Fully Supported |
| **Avalanche C-Chain** | 43114 | Layer 1 | ✅ Fully Supported |
| **Fantom** | 250 | Layer 1 | ✅ Fully Supported |

### ⚡ Layer 2 Solutions

| Chain | Chain ID | Base Layer | Status |
|-------|----------|------------|--------|
| **Base** | 8453 | Ethereum | ✅ Fully Supported |
| **zkSync Era** | 324 | Ethereum | ✅ Fully Supported |
| **Polygon zkEVM** | 1101 | Ethereum | ✅ Fully Supported |
| **Linea** | 59144 | Ethereum | ✅ Fully Supported |
| **Mantle** | 5000 | Ethereum | ✅ Fully Supported |
| **Scroll** | 534352 | Ethereum | ✅ Fully Supported |

### 🚀 Alternative Layer 1 Blockchains

| Chain | Chain ID* | Consensus | Status |
|-------|-----------|-----------|--------|
| **NEAR Protocol** | 99990001 | Nightshade | ✅ Fully Supported |
| **Cosmos Hub** | 99990002 | Tendermint | ✅ Fully Supported |
| **Terra** | 99990003 | Tendermint | ✅ Fully Supported |
| **Sui** | 99990004 | Narwhal/Bullshark | ✅ Fully Supported |
| **Aptos** | 99990005 | AptosBFT | ✅ Fully Supported |

*_Custom chain IDs used for non-EVM chains_

### 🌟 Emerging Networks

| Chain | Chain ID | Focus Area | Status |
|-------|----------|------------|--------|
| **Celestia** | 99990006 | Data Availability | ✅ Fully Supported |
| **Starknet** | 99990007 | zk-STARK Rollup | ✅ Fully Supported |
| **Flow** | 99990008 | NFT/Gaming | ✅ Fully Supported |
| **HECO** | 128 | DeFi | ✅ Fully Supported |
| **Kroma** | 255 | Layer 2 | ✅ Fully Supported |

### 🌍 Additional Popular Networks

| Chain | Chain ID | Ecosystem | Status |
|-------|----------|-----------|--------|
| **Celo** | 42220 | Mobile-first | ✅ Fully Supported |
| **Gnosis Chain** | 100 | Community-driven | ✅ Fully Supported |
| **Moonbeam** | 1284 | Polkadot Parachain | ✅ Fully Supported |
| **Harmony** | 1666600000 | Sharding | ✅ Fully Supported |
| **Cronos** | 25 | Crypto.com | ✅ Fully Supported |
| **Aurora** | 1313161554 | NEAR Ecosystem | ✅ Fully Supported |
| **Evmos** | 9001 | Cosmos EVM | ✅ Fully Supported |
| **Kava** | 2222 | Cosmos DeFi | ✅ Fully Supported |
| **Klaytn** | 8217 | Korean Platform | ✅ Fully Supported |
| **Oasis Emerald** | 42262 | Privacy | ✅ Fully Supported |
| **Telos** | 40 | High Performance | ✅ Fully Supported |
| **Fuse** | 122 | Payments | ✅ Fully Supported |
| **Moonriver** | 1285 | Kusama Parachain | ✅ Fully Supported |
| **Milkomeda C1** | 2001 | Cardano Sidechain | ✅ Fully Supported |
| **Metis Andromeda** | 1088 | Layer 2 | ✅ Fully Supported |
| **Boba Network** | 288 | Layer 2 | ✅ Fully Supported |
| **Syscoin NEVM** | 57 | Bitcoin Merge-mined | ✅ Fully Supported |
| **Velas** | 106 | AI-powered | ✅ Fully Supported |
| **Elastos Smart Chain** | 20 | Web3 OS | ✅ Fully Supported |
| **IoTeX** | 4689 | IoT Platform | ✅ Fully Supported |

### 🧪 Testnet Networks

| Chain | Chain ID | Purpose | Status |
|-------|----------|---------|--------|
| **Goerli** | 5 | Ethereum Testnet | ✅ Fully Supported |
| **Sepolia** | 11155111 | Ethereum Testnet | ✅ Fully Supported |
| **Mumbai** | 80001 | Polygon Testnet | ✅ Fully Supported |
| **Fuji** | 43113 | Avalanche Testnet | ✅ Fully Supported |

## Usage Examples

### Initialize with Multiple Networks

```bash
# Initialize with popular Layer 1s
chainsync init --chains ethereum,polygon,bsc,avalanche

# Initialize with Layer 2 solutions
chainsync init --chains base,arbitrum,optimism,zksync

# Initialize with alternative Layer 1s
chainsync init --chains near,cosmos,sui,aptos

# Initialize with emerging networks
chainsync init --chains celestia,starknet,flow
```

### Deploy Across Network Categories

```bash
# Deploy to major EVM chains
chainsync deploy --chains ethereum,polygon,arbitrum,optimism,bsc,avalanche

# Deploy to Layer 2 ecosystem
chainsync deploy --chains base,zksync,polygonzkevm,linea,mantle,scroll

# Deploy to alternative platforms
chainsync deploy --chains near,cosmos,terra,sui,aptos
```

### Configure RPC URLs

```bash
# Set Ethereum RPC
chainsync config set rpcs.ethereum https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Set Layer 2 RPCs
chainsync config set rpcs.base https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
chainsync config set rpcs.arbitrum https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY

# Set Alternative Layer 1 RPCs
chainsync config set rpcs.near https://rpc.mainnet.near.org
chainsync config set rpcs.sui https://fullnode.mainnet.sui.io:443
```

## Network-Specific Considerations

### EVM Compatibility
- **Full EVM**: Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche, Fantom
- **EVM-Compatible**: Most Layer 2s and sidechains
- **Custom VM**: Near, Cosmos, Terra, Sui, Aptos (require specialized handling)

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

## Environment Configuration

### Mainnet Configuration
```env
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

### Testnet Configuration
```env
# Testnet Networks
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

## Adding New Networks

ChainSync is designed to be extensible. To add support for a new network:

1. **Update SDK Configuration** in `packages/sdk/src/index.ts`
2. **Add Chain ID Mapping** in the `getChainId()` function
3. **Update CLI Commands** to include the new chain
4. **Add RPC Configuration** in the init templates
5. **Update Documentation** in this file

## Network Status and Monitoring

Check the current status of all supported networks:

```bash
chainsync status --chains
```

Validate your configuration across all networks:

```bash
chainsync validate --all
```

## Best Practices

### Network Selection Strategy
1. **Start with Core Networks**: Ethereum, Polygon, Arbitrum, BSC
2. **Add Layer 2s**: Base, Optimism, zkSync for lower fees
3. **Consider Alternative L1s**: Near, Sui, Aptos for specific use cases
4. **Include Emerging Networks**: For early ecosystem advantages

### Multi-Chain Deployment Tips
1. **Test on Testnets First**: Always validate on test networks
2. **Stagger Deployments**: Deploy incrementally to manage risk
3. **Monitor Gas Prices**: Deploy during optimal fee periods
4. **Maintain Consistent Addresses**: Use CREATE2 for deterministic addresses

### RPC Provider Recommendations
- **Primary**: Alchemy, Infura, QuickNode
- **Backup**: Public RPCs for non-critical operations
- **Monitoring**: Set up RPC health checks
- **Rate Limiting**: Implement proper request throttling

## Support and Updates

For the latest network additions and updates:
- Check the [ChainSync Changelog](../CHANGELOG.md)
- Follow [Network Status Updates](../network-status.md)
- Submit [Network Addition Requests](https://github.com/chainsync/issues)

---

**Total Supported Networks**: 50+ chains across all major blockchain ecosystems

This comprehensive network support enables ChainSync to provide truly universal cross-chain deployment capabilities, giving developers access to the entire blockchain ecosystem from a single, unified interface.