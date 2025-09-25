import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { createSpinner } from '../utils/spinner';
import { saveConfig, ChainSyncConfig } from '../utils/config';

export const initCommand = new Command('init')
  .description('Initialize a new ChainSync project')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('-t, --template <type>', 'Project template (defi, nft, token)', 'basic')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Initializing ChainSync project...\n'));

    // Check if already initialized
    if (fs.existsSync('.chainsync.yaml') && !options.force) {
      console.log(chalk.yellow('⚠️  ChainSync project already initialized!'));
      console.log(chalk.gray('Use --force to overwrite existing configuration'));
      return;
    }

    try {
      // Collect project information
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: path.basename(process.cwd()),
          validate: (input) => input.length > 0 || 'Project name is required'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Project description:',
          default: 'A cross-chain application built with ChainSync'
        },
        {
          type: 'checkbox',
          name: 'chains',
          message: 'Select target chains:',
          choices: [
            { name: 'Ethereum', value: 'ethereum', checked: true },
            { name: 'Polygon', value: 'polygon', checked: true },
            { name: 'Arbitrum', value: 'arbitrum' },
            { name: 'Optimism', value: 'optimism' },
            { name: 'BSC', value: 'bsc' },
            { name: 'Avalanche', value: 'avalanche' }
          ],
          validate: (input) => input.length > 0 || 'Select at least one chain'
        },
        {
          type: 'list',
          name: 'network',
          message: 'Select network:',
          choices: [
            { name: 'Testnet (recommended for development)', value: 'testnet' },
            { name: 'Mainnet', value: 'mainnet' }
          ],
          default: 'testnet'
        },
        {
          type: 'confirm',
          name: 'setupEnv',
          message: 'Set up RPC URLs now?',
          default: true
        }
      ]);

      const spinner = createSpinner('Creating project structure...');
      spinner.start();

      // Create config
      const config: ChainSyncConfig = {
        project: {
          name: answers.projectName,
          description: answers.description,
          version: '1.0.0'
        },
        chains: answers.chains,
        network: answers.network,
        solana: {
          network: answers.network === 'mainnet' ? 'mainnet-beta' : 'devnet',
          rpcUrl: answers.network === 'mainnet'
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

      // Setup RPC URLs if requested
      if (answers.setupEnv) {
        spinner.stop();
        console.log(chalk.blue('\n🔗 Configuring RPC endpoints...\n'));

        for (const chain of answers.chains) {
          const rpcUrl = await inquirer.prompt({
            type: 'input',
            name: 'url',
            message: `${chain.charAt(0).toUpperCase() + chain.slice(1)} RPC URL:`,
            default: getDefaultRpcUrl(chain, answers.network),
            validate: (input) => {
              if (!input.startsWith('http')) {
                return 'RPC URL must start with http:// or https://';
              }
              return true;
            }
          });
          config.rpcs[chain] = rpcUrl.url;
        }
        spinner.start();
      }

      // Save configuration
      await saveConfig(config);

      // Create project structure
      createProjectStructure(answers.projectName, answers.template);

      // Create .env.example
      createEnvExample(answers.chains, answers.network);

      // Create gitignore
      createGitignore();

      spinner.succeed(chalk.green('Project initialized successfully!'));

      // Success message
      console.log(chalk.green('\n✅ ChainSync project created!\n'));
      console.log(chalk.blue('Next steps:'));
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
    ethereum: {
      mainnet: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
      testnet: 'https://eth-goerli.g.alchemy.com/v2/YOUR_KEY'
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
    }
  };

  return rpcUrls[chain]?.[isMainnet ? 'mainnet' : 'testnet'] || '';
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
}`,
    defi: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CrossChainDeFi {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public rewards;
    uint256 public totalDeposits;
    uint256 public rewardRate = 100; // 1% per block

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    function deposit() public payable {
        require(msg.value > 0, "Deposit must be greater than 0");

        // Calculate pending rewards
        if (deposits[msg.sender] > 0) {
            rewards[msg.sender] += (deposits[msg.sender] * rewardRate) / 10000;
        }

        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) public {
        require(deposits[msg.sender] >= amount, "Insufficient balance");

        deposits[msg.sender] -= amount;
        totalDeposits -= amount;

        payable(msg.sender).transfer(amount);
        emit Withdraw(msg.sender, amount);
    }
}`,
    nft: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CrossChainNFT {
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => string) public tokenURI;

    uint256 public nextTokenId = 1;
    string public name = "Cross-Chain NFT";
    string public symbol = "CNFT";

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function mint(address to, string memory uri) public returns (uint256) {
        uint256 tokenId = nextTokenId++;
        ownerOf[tokenId] = to;
        balanceOf[to]++;
        tokenURI[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    function transfer(address to, uint256 tokenId) public {
        require(ownerOf[tokenId] == msg.sender, "Not token owner");

        balanceOf[msg.sender]--;
        balanceOf[to]++;
        ownerOf[tokenId] = to;

        emit Transfer(msg.sender, to, tokenId);
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