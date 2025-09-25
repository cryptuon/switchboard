/**
 * Connector Factory
 *
 * Creates appropriate connector instances for all supported blockchain networks
 */

import { BaseConnector, ChainConnectorConfig } from './connectors/base-connector';
import { EVMConnector } from './connectors/evm-connector';
import { NEARConnector } from './connectors/near-connector';
import { MoveConnector } from './connectors/move-connector';
import { CosmosConnector } from './connectors/cosmos-connector';

interface ChainConfig {
  chainId?: number;
  networkType?: string;
  isTestnet?: boolean;
}

export class ConnectorFactory {
  private static chainConfigurations: { [chainName: string]: ChainConfig } = {
    // EVM Chains
    'ethereum': { chainId: 1, networkType: 'evm' },
    'polygon': { chainId: 137, networkType: 'evm' },
    'arbitrum': { chainId: 42161, networkType: 'evm' },
    'optimism': { chainId: 10, networkType: 'evm' },
    'bsc': { chainId: 56, networkType: 'evm' },
    'avalanche': { chainId: 43114, networkType: 'evm' },
    'fantom': { chainId: 250, networkType: 'evm' },

    // Layer 2 Solutions (EVM-compatible)
    'base': { chainId: 8453, networkType: 'evm' },
    'zksync': { chainId: 324, networkType: 'evm' },
    'polygonzkevm': { chainId: 1101, networkType: 'evm' },
    'linea': { chainId: 59144, networkType: 'evm' },
    'mantle': { chainId: 5000, networkType: 'evm' },
    'scroll': { chainId: 534352, networkType: 'evm' },

    // Alternative Layer 1s
    'near': { chainId: 99990001, networkType: 'near' },
    'cosmos': { chainId: 99990002, networkType: 'cosmos' },
    'terra': { chainId: 99990003, networkType: 'cosmos' },
    'sui': { chainId: 99990004, networkType: 'move' },
    'aptos': { chainId: 99990005, networkType: 'move' },

    // Emerging Networks
    'celestia': { chainId: 99990006, networkType: 'cosmos' },
    'starknet': { chainId: 99990007, networkType: 'custom' },
    'flow': { chainId: 99990008, networkType: 'custom' },
    'heco': { chainId: 128, networkType: 'evm' },
    'kroma': { chainId: 255, networkType: 'evm' },
    'celo': { chainId: 42220, networkType: 'evm' },
    'gnosis': { chainId: 100, networkType: 'evm' },
    'moonbeam': { chainId: 1284, networkType: 'evm' },
    'harmony': { chainId: 1666600000, networkType: 'evm' },

    // Additional Networks
    'cronos': { chainId: 25, networkType: 'evm' },
    'aurora': { chainId: 1313161554, networkType: 'evm' },
    'evmos': { chainId: 9001, networkType: 'evm' },
    'kava': { chainId: 2222, networkType: 'evm' },
    'klaytn': { chainId: 8217, networkType: 'evm' },
    'oasis': { chainId: 42262, networkType: 'evm' },
    'telos': { chainId: 40, networkType: 'evm' },
    'fuse': { chainId: 122, networkType: 'evm' },
    'moonriver': { chainId: 1285, networkType: 'evm' },
    'milkomeda': { chainId: 2001, networkType: 'evm' },
    'metis': { chainId: 1088, networkType: 'evm' },
    'boba': { chainId: 288, networkType: 'evm' },
    'syscoin': { chainId: 57, networkType: 'evm' },
    'velas': { chainId: 106, networkType: 'evm' },
    'elastos': { chainId: 20, networkType: 'evm' },
    'iotex': { chainId: 4689, networkType: 'evm' },

    // Testnets - Development Mode Networks
    'goerli': { chainId: 5, networkType: 'evm', isTestnet: true },
    'sepolia': { chainId: 11155111, networkType: 'evm', isTestnet: true },
    'mumbai': { chainId: 80001, networkType: 'evm', isTestnet: true },
    'fuji': { chainId: 43113, networkType: 'evm', isTestnet: true },
    'arbitrum-goerli': { chainId: 421613, networkType: 'evm', isTestnet: true },
    'optimism-goerli': { chainId: 420, networkType: 'evm', isTestnet: true },
    'base-goerli': { chainId: 84531, networkType: 'evm', isTestnet: true },
    'bsc-testnet': { chainId: 97, networkType: 'evm', isTestnet: true },
    'avalanche-fuji': { chainId: 43113, networkType: 'evm', isTestnet: true },
    'fantom-testnet': { chainId: 4002, networkType: 'evm', isTestnet: true },
    'celo-alfajores': { chainId: 44787, networkType: 'evm', isTestnet: true },

    // Non-EVM Testnets
    'near-testnet': { chainId: 99990002, networkType: 'near', isTestnet: true },
    'sui-testnet': { chainId: 99990003, networkType: 'move', isTestnet: true },
    'aptos-testnet': { chainId: 99990004, networkType: 'move', isTestnet: true },
    'cosmos-testnet': { chainId: 99990005, networkType: 'cosmos', isTestnet: true },
    'solana-devnet': { chainId: 99990006, networkType: 'solana', isTestnet: true }
  };

  /**
   * Create a connector for the specified chain
   */
  static createConnector(chainName: string, rpcUrl: string): BaseConnector {
    const chainConfig = this.chainConfigurations[chainName.toLowerCase()];

    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chainName}`);
    }

    const config: ChainConnectorConfig = {
      rpcUrl,
      chainId: chainConfig.chainId!,
      networkType: (chainConfig.networkType as "evm" | "near" | "cosmos" | "move" | "wasm" | "custom") || "custom",
      chainName: chainName.toLowerCase()
    };

    return this.createConnectorByType(config);
  }

  /**
   * Create connector based on network type
   */
  private static createConnectorByType(config: ChainConnectorConfig): BaseConnector {
    switch (config.networkType) {
      case 'evm':
        return new EVMConnector(config);

      case 'near':
        return new NEARConnector(config);

      case 'move':
        return new MoveConnector(config);

      case 'cosmos':
        return new CosmosConnector(config);

      case 'custom':
        // For now, use EVM connector for custom networks that might be EVM-compatible
        // In the future, implement specific connectors for StarkNet, Flow, etc.
        console.warn(`Using EVM connector for custom network: ${config.chainName}`);
        return new EVMConnector({ ...config, networkType: 'evm' });

      default:
        throw new Error(`Unsupported network type: ${config.networkType}`);
    }
  }

  /**
   * Get all supported chains by category
   */
  static getSupportedChains(): { [category: string]: string[] } {
    const chains = Object.keys(this.chainConfigurations);

    return {
      evm: chains.filter(chain => this.chainConfigurations[chain].networkType === 'evm'),
      layer2: ['base', 'zksync', 'polygonzkevm', 'linea', 'mantle', 'scroll', 'arbitrum', 'optimism'],
      'alt-l1': chains.filter(chain =>
        ['near', 'cosmos', 'move'].includes(this.chainConfigurations[chain].networkType!)
      ),
      emerging: ['celestia', 'starknet', 'flow', 'kroma', 'celo', 'gnosis'],
      testnet: chains.filter(chain => this.chainConfigurations[chain].isTestnet === true),
      mainnet: chains.filter(chain => !this.chainConfigurations[chain].isTestnet),
      devMode: chains.filter(chain => this.chainConfigurations[chain].isTestnet === true),
      prodMode: chains.filter(chain => !this.chainConfigurations[chain].isTestnet),
      all: chains
    };
  }

  /**
   * Check if a chain is supported
   */
  static isSupported(chainName: string): boolean {
    return chainName.toLowerCase() in this.chainConfigurations;
  }

  /**
   * Check if a chain is a testnet
   */
  static isTestnet(chainName: string): boolean {
    const config = this.chainConfigurations[chainName.toLowerCase()];
    return config?.isTestnet === true;
  }

  /**
   * Get development mode networks
   */
  static getDevModeNetworks(): string[] {
    return this.getSupportedChains().devMode;
  }

  /**
   * Get production mode networks
   */
  static getProdModeNetworks(): string[] {
    return this.getSupportedChains().prodMode;
  }

  /**
   * Get chain configuration
   */
  static getChainConfig(chainName: string): Partial<ChainConnectorConfig> | null {
    const config = this.chainConfigurations[chainName.toLowerCase()];
    if (config) {
      // Create a properly typed copy
      return {
        ...config,
        networkType: (config.networkType as "evm" | "near" | "cosmos" | "move" | "wasm" | "custom") || "custom"
      };
    }
    return null;
  }

  /**
   * Get network type for a chain
   */
  static getNetworkType(chainName: string): string | null {
    const config = this.getChainConfig(chainName);
    return config?.networkType || null;
  }

  /**
   * Create multiple connectors at once
   */
  static createMultipleConnectors(chainsConfig: { [chainName: string]: string }): { [chainName: string]: BaseConnector } {
    const connectors: { [chainName: string]: BaseConnector } = {};

    for (const [chainName, rpcUrl] of Object.entries(chainsConfig)) {
      try {
        connectors[chainName] = this.createConnector(chainName, rpcUrl);
        console.log(`✅ Created connector for ${chainName}`);
      } catch (error) {
        console.warn(`⚠️ Failed to create connector for ${chainName}:`, error);
      }
    }

    return connectors;
  }

  /**
   * Validate RPC URL format for a chain
   */
  static validateRpcUrl(chainName: string, rpcUrl: string): boolean {
    if (!rpcUrl || typeof rpcUrl !== 'string') {
      return false;
    }

    // Basic URL validation
    if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
      return false;
    }

    const networkType = this.getNetworkType(chainName);

    // Network-specific validations
    switch (networkType) {
      case 'near':
        // NEAR RPCs typically don't have specific requirements beyond HTTPS
        return rpcUrl.startsWith('https://');

      case 'move':
        // Sui and Aptos RPCs
        if (chainName === 'sui') {
          return rpcUrl.includes('sui.io') || rpcUrl.includes('localhost');
        }
        if (chainName === 'aptos') {
          return rpcUrl.includes('aptoslabs.com') || rpcUrl.includes('localhost');
        }
        return true;

      case 'cosmos':
        // Cosmos RPCs don't have specific requirements
        return true;

      case 'evm':
      default:
        // EVM RPCs - most flexible
        return true;
    }
  }
}