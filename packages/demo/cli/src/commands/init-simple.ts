import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { createSpinner } from '../utils/spinner';
import { saveConfig, ChainSyncConfig } from '../utils/config';

export const initCommand = new Command('init')
  .description('Initialize a new ChainSync project')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('-t, --template <type>', 'Project template (defi, nft, token)', 'basic')
  .option('-n, --name <name>', 'Project name', '')
  .option('--chains <chains>', 'Comma-separated list of chains', 'ethereum,polygon')
  .option('--network <network>', 'Network type (testnet/mainnet)', 'testnet')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Initializing ChainSync project...\n'));

    // Check if already initialized
    if (fs.existsSync('.chainsync.yaml') && !options.force) {
      console.log(chalk.yellow('⚠️  ChainSync project already initialized!'));
      console.log(chalk.gray('Use --force to overwrite existing configuration'));
      return;
    }

    try {
      const spinner = createSpinner('Creating project structure...');
      spinner.start();

      // Get project name
      const projectName = options.name || path.basename(process.cwd()) || 'my-chainsync-project';

      // Parse chains
      const chains = options.chains.split(',').map((c: string) => c.trim());

      // Create config
      const config: ChainSyncConfig = {
        project: {
          name: projectName,
          description: 'A cross-chain application built with ChainSync',
          version: '1.0.0'
        },
        chains: chains,
        network: options.network,
        solana: {
          network: options.network === 'mainnet' ? 'mainnet-beta' : 'devnet',
          rpcUrl: options.network === 'mainnet'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com'
        },
        rpcs: {},
        deployment: {
          gasLimit: 5000000,
          gasPrice: 'auto',
          confirmations: 2
        }
      };

      // Setup default RPC URLs
      chains.forEach((chain: string) => {
        config.rpcs[chain] = getDefaultRpcUrl(chain, options.network);
      });

      // Save configuration
      await saveConfig(config);

      // Create project structure
      createProjectStructure(projectName, options.template);

      // Create .env.example
      createEnvExample(chains, options.network);

      // Create gitignore
      createGitignore();

      spinner.succeed(chalk.green('Project initialized successfully!'));

      // Success message
      console.log(chalk.green('\n✅ ChainSync project created!'));
      console.log(chalk.blue('\nProject Details:'));
      console.log(chalk.gray(`  Name: ${projectName}`));
      console.log(chalk.gray(`  Network: ${options.network}`));
      console.log(chalk.gray(`  Chains: ${chains.join(', ')}`));
      console.log(chalk.gray(`  Template: ${options.template}`));

      console.log(chalk.blue('\nNext steps:'));
      console.log(chalk.gray('1. Edit .env with your API keys'));
      console.log(chalk.gray('2. Run: chainsync deploy'));
      console.log(chalk.gray('3. Check: chainsync status'));
      console.log(chalk.gray('\n📚 Documentation: https://docs.chainsync.org'));

    } catch (error) {
      console.error(chalk.red('Failed to initialize project:'), error);
    }
  });

function getDefaultRpcUrl(chain: string, network: string): string {
  const isMainnet = network === 'mainnet';

  const rpcUrls: { [key: string]: { mainnet: string; testnet: string } } = {
    // Ethereum Virtual Machine (EVM) Chains
    ethereum: {
      mainnet: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY'
    },
    polygon: {
      mainnet: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY'
    },
    arbitrum: {
      mainnet: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://arb-goerli.g.alchemy.com/v2/YOUR_KEY'
    },
    optimism: {
      mainnet: 'https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://opt-goerli.g.alchemy.com/v2/YOUR_KEY'
    },
    bsc: {
      mainnet: 'https://bsc-dataseed.binance.org/',
      testnet: 'https://data-seed-prebsc-1-s1.binance.org:8545/'
    },
    avalanche: {
      mainnet: 'https://api.avax.network/ext/bc/C/rpc',
      testnet: 'https://api.avax-test.network/ext/bc/C/rpc'
    },
    fantom: {
      mainnet: 'https://rpc.ftm.tools/',
      testnet: 'https://rpc.testnet.fantom.network/'
    },

    // Layer 2 Solutions
    base: {
      mainnet: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://base-goerli.g.alchemy.com/v2/YOUR_KEY'
    },
    zksync: {
      mainnet: 'https://mainnet.era.zksync.io',
      testnet: 'https://testnet.era.zksync.dev'
    },
    polygonzkevm: {
      mainnet: 'https://zkevm-rpc.com',
      testnet: 'https://rpc.public.zkevm-test.net'
    },
    linea: {
      mainnet: 'https://rpc.linea.build',
      testnet: 'https://rpc.goerli.linea.build'
    },
    mantle: {
      mainnet: 'https://rpc.mantle.xyz',
      testnet: 'https://rpc.testnet.mantle.xyz'
    },
    scroll: {
      mainnet: 'https://rpc.scroll.io',
      testnet: 'https://sepolia-rpc.scroll.io'
    },

    // Alternative Layer 1s
    near: {
      mainnet: 'https://rpc.mainnet.near.org',
      testnet: 'https://rpc.testnet.near.org'
    },
    cosmos: {
      mainnet: 'https://cosmos-rpc.polkachu.com',
      testnet: 'https://rpc.sentry-01.theta-testnet.polkachu.com'
    },
    terra: {
      mainnet: 'https://terra-rpc.polkachu.com',
      testnet: 'https://pisco-rpc.terra.dev'
    },
    sui: {
      mainnet: 'https://fullnode.mainnet.sui.io:443',
      testnet: 'https://fullnode.testnet.sui.io:443'
    },
    aptos: {
      mainnet: 'https://fullnode.mainnet.aptoslabs.com/v1',
      testnet: 'https://fullnode.testnet.aptoslabs.com/v1'
    },

    // Emerging Networks
    celestia: {
      mainnet: 'https://rpc.lunaroasis.net',
      testnet: 'https://rpc-mocha.pops.one'
    },
    starknet: {
      mainnet: 'https://starknet-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://starknet-goerli.g.alchemy.com/v2/YOUR_KEY'
    },
    flow: {
      mainnet: 'https://rest-mainnet.onflow.org',
      testnet: 'https://rest-testnet.onflow.org'
    },
    heco: {
      mainnet: 'https://http-mainnet.hecochain.com',
      testnet: 'https://http-testnet.hecochain.com'
    },
    kroma: {
      mainnet: 'https://api.kroma.network',
      testnet: 'https://api.sepolia-kroma.network'
    },
    celo: {
      mainnet: 'https://forno.celo.org',
      testnet: 'https://alfajores-forno.celo-testnet.org'
    },
    gnosis: {
      mainnet: 'https://rpc.gnosischain.com',
      testnet: 'https://rpc.chiadochain.net'
    },
    moonbeam: {
      mainnet: 'https://rpc.api.moonbeam.network',
      testnet: 'https://rpc.api.moonbase.moonbeam.network'
    },
    harmony: {
      mainnet: 'https://api.harmony.one',
      testnet: 'https://api.s0.b.hmny.io'
    },

    // Additional Popular Networks
    cronos: {
      mainnet: 'https://evm.cronos.org',
      testnet: 'https://evm-t3.cronos.org'
    },
    aurora: {
      mainnet: 'https://mainnet.aurora.dev',
      testnet: 'https://testnet.aurora.dev'
    },
    evmos: {
      mainnet: 'https://eth.bd.evmos.org:8545',
      testnet: 'https://eth.bd.evmos.dev:8545'
    },
    kava: {
      mainnet: 'https://evm.kava.io',
      testnet: 'https://evm.testnet.kava.io'
    },
    klaytn: {
      mainnet: 'https://public-node-api.klaytnapi.com/v1/cypress',
      testnet: 'https://public-node-api.klaytnapi.com/v1/baobab'
    },
    oasis: {
      mainnet: 'https://emerald.oasis.dev',
      testnet: 'https://testnet.emerald.oasis.dev'
    },
    telos: {
      mainnet: 'https://mainnet.telos.net/evm',
      testnet: 'https://testnet.telos.net/evm'
    },
    fuse: {
      mainnet: 'https://rpc.fuse.io',
      testnet: 'https://rpc.fusespark.io'
    },
    moonriver: {
      mainnet: 'https://rpc.api.moonriver.moonbeam.network',
      testnet: 'https://rpc.api.moonbase.moonbeam.network'
    },
    milkomeda: {
      mainnet: 'https://rpc-mainnet-cardano-evm.c1.milkomeda.com',
      testnet: 'https://rpc-devnet-cardano-evm.c1.milkomeda.com'
    },
    metis: {
      mainnet: 'https://andromeda.metis.io/?owner=1088',
      testnet: 'https://goerli.gateway.metisdevops.link'
    },
    boba: {
      mainnet: 'https://mainnet.boba.network',
      testnet: 'https://goerli.boba.network'
    },
    syscoin: {
      mainnet: 'https://rpc.syscoin.org',
      testnet: 'https://rpc.tanenbaum.io'
    },
    velas: {
      mainnet: 'https://evmexplorer.velas.com/rpc',
      testnet: 'https://evmexplorer.testnet.velas.com/rpc'
    },
    elastos: {
      mainnet: 'https://api.elastos.io/eth',
      testnet: 'https://api-testnet.elastos.io/eth'
    },
    iotex: {
      mainnet: 'https://babel-api.mainnet.iotex.io',
      testnet: 'https://babel-api.testnet.iotex.io'
    },

    // Testnet-specific entries
    goerli: {
      mainnet: 'https://eth-goerli.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://eth-goerli.g.alchemy.com/v2/YOUR_KEY'
    },
    sepolia: {
      mainnet: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY'
    },
    mumbai: {
      mainnet: 'https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY'
    },
    fuji: {
      mainnet: 'https://api.avax-test.network/ext/bc/C/rpc',
      testnet: 'https://api.avax-test.network/ext/bc/C/rpc'
    }
  };

  return rpcUrls[chain]?.[isMainnet ? 'mainnet' : 'testnet'] || `https://rpc.${chain}.network`;
}

function createProjectStructure(projectName: string, template: string): void {
  const dirs = [
    'contracts',
    'scripts',
    'test',
    'deployments'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create sample contract based on template
  const contractContent = getTemplateContract(template);
  fs.writeFileSync('contracts/MyContract.sol', contractContent);

  // Create deployment script
  const deployScript = `
// ChainSync Deployment Script
import { ChainSync } from '@chainsync/sdk';
import fs from 'fs';

async function deploy() {
  const chainSync = new ChainSync({
    solanaRpcUrl: process.env.SOLANA_RPC_URL!,
    ethereumRpcUrl: process.env.ETHEREUM_RPC_URL,
    polygonRpcUrl: process.env.POLYGON_RPC_URL
  });

  const bytecode = fs.readFileSync('contracts/MyContract.bin', 'utf8');

  const deployment = await chainSync.deployContract({
    bytecode,
    chains: ['ethereum', 'polygon']
  });

  console.log('Deployment ID:', deployment.id);
  return deployment;
}

deploy().catch(console.error);
`;

  fs.writeFileSync('scripts/deploy.ts', deployScript.trim());
}

function getTemplateContract(template: string): string {
  const templates: { [key: string]: string } = {
    basic: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    string public message;
    address public owner;

    constructor(string memory _message) {
        message = _message;
        owner = msg.sender;
    }

    function setMessage(string memory _message) public {
        require(msg.sender == owner, "Only owner can set message");
        message = _message;
    }
}`,
    token: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyToken {
    string public name = "My Cross-Chain Token";
    string public symbol = "MCT";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}`
  };

  return (templates[template] || templates.basic).trim();
}

function createEnvExample(chains: string[], network: string): void {
  const isMainnet = network === 'mainnet';
  let envContent = `# ChainSync Environment Configuration
# Copy this file to .env and configure your settings

# Solana Configuration
SOLANA_NETWORK=${isMainnet ? 'mainnet-beta' : 'devnet'}
SOLANA_RPC_URL=${isMainnet ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com'}

# Chain RPC URLs
`;

  chains.forEach(chain => {
    const defaultUrl = getDefaultRpcUrl(chain, network);
    envContent += `${chain.toUpperCase()}_RPC_URL=${defaultUrl}\n`;
  });

  envContent += `
# ChainSync API (optional)
CHAINSYNC_API_KEY=your-api-key-here

# Private Key (for deployment)
PRIVATE_KEY=your-private-key-here
`;

  fs.writeFileSync('.env.example', envContent);
}

function createGitignore(): void {
  const gitignoreContent = `
# Dependencies
node_modules/

# Environment
.env
.env.local

# Build outputs
dist/
build/
out/

# IDE
.vscode/
.idea/

# Logs
*.log

# Cache
.cache/

# ChainSync
deployments/*.json
.chainsync/cache/
`;

  fs.writeFileSync('.gitignore', gitignoreContent.trim());
}