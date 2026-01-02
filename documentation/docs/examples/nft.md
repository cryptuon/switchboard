# NFT Collection Example

Deploy an NFT collection across multiple chains with synchronized metadata.

## Overview

This example demonstrates:

- ERC721 NFT deployment across chains
- Synchronized metadata and ownership
- Cross-chain minting
- Marketplace integration

## Quick Start

```bash
# Create project
chainsync init my-nft --template nft --dev-mode

cd my-nft
npm install

# Configure and deploy
cp .env.example .env
chainsync deploy --dev-mode
```

## Smart Contract

```solidity
// contracts/evm/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    uint256 public maxSupply;
    uint256 public mintPrice;
    string public baseURI;

    event NFTMinted(address indexed to, uint256 indexed tokenId);

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        uint256 _mintPrice,
        string memory _baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        maxSupply = _maxSupply;
        mintPrice = _mintPrice;
        baseURI = _baseURI;
    }

    function mint(address to) public payable returns (uint256) {
        require(_tokenIdCounter.current() < maxSupply, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked(baseURI, toString(tokenId), ".json")));

        emit NFTMinted(to, tokenId);
        return tokenId;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
```

## Deployment Script

```javascript
// scripts/deploy-nft.js
import { ChainSync } from '@chainsync/sdk';
import { readFileSync } from 'fs';

async function main() {
  const chainSync = new ChainSync({
    solana: { rpcUrl: process.env.SOLANA_RPC_URL },
    networks: {
      sepolia: {
        rpcUrl: process.env.ETHEREUM_RPC_URL,
        privateKey: process.env.PRIVATE_KEY,
      },
      mumbai: {
        rpcUrl: process.env.POLYGON_RPC_URL,
        privateKey: process.env.PRIVATE_KEY,
      },
    },
  });

  const artifact = JSON.parse(
    readFileSync('./artifacts/MyNFT.json', 'utf-8')
  );

  const deployment = await chainSync.deployContract({
    name: 'MyNFT',
    bytecode: artifact.bytecode,
    abi: artifact.abi,
    constructorArgs: [
      'My NFT Collection',        // name
      'MNFT',                     // symbol
      10000,                      // maxSupply
      ethers.parseEther('0.01'),  // mintPrice
      'ipfs://QmYourHash/',       // baseURI
    ],
    chains: ['sepolia', 'mumbai'],
    options: {
      verify: true,
    },
  });

  console.log('Deployment ID:', deployment.id);

  // Wait for completion
  let status = await chainSync.trackDeployment(deployment.id);
  while (status.status === 'pending' || status.status === 'deploying') {
    await new Promise((r) => setTimeout(r, 5000));
    status = await chainSync.trackDeployment(deployment.id);
  }

  console.log('NFT Collection Deployed!');
  console.log('Addresses:', status.addresses);
}

main().catch(console.error);
```

## Minting Script

```javascript
// scripts/mint.js
import { ethers } from 'ethers';

async function mint(chain, contractAddress, to) {
  const rpcUrls = {
    sepolia: process.env.ETHEREUM_RPC_URL,
    mumbai: process.env.POLYGON_RPC_URL,
  };

  const provider = new ethers.JsonRpcProvider(rpcUrls[chain]);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const abi = ['function mint(address) payable returns (uint256)'];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const tx = await contract.mint(to, {
    value: ethers.parseEther('0.01'),
  });

  const receipt = await tx.wait();
  console.log(`Minted on ${chain}: ${receipt.hash}`);

  // Get token ID from event
  const event = receipt.logs.find(
    (log) => log.topics[0] === ethers.id('NFTMinted(address,uint256)')
  );

  if (event) {
    const tokenId = ethers.toBigInt(event.topics[2]);
    console.log(`Token ID: ${tokenId}`);
    return tokenId;
  }
}

// Mint on multiple chains
async function mintMultiChain(addresses, to) {
  await Promise.all([
    mint('sepolia', addresses.sepolia, to),
    mint('mumbai', addresses.mumbai, to),
  ]);
}
```

## Metadata Synchronization

Monitor NFT state across chains:

```javascript
// scripts/sync-metadata.js
import { ChainSync } from '@chainsync/sdk';
import { ethers } from 'ethers';

async function checkOwnership(chain, contractAddress, tokenId) {
  const provider = new ethers.JsonRpcProvider(getRpcUrl(chain));
  const abi = ['function ownerOf(uint256) view returns (address)'];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  try {
    return await contract.ownerOf(tokenId);
  } catch {
    return null; // Token doesn't exist on this chain
  }
}

async function syncCheck(addresses, tokenId) {
  const owners = {};

  for (const [chain, address] of Object.entries(addresses)) {
    owners[chain] = await checkOwnership(chain, address, tokenId);
  }

  console.log(`Token ${tokenId} ownership:`, owners);

  // Verify consistency
  const uniqueOwners = [...new Set(Object.values(owners).filter(Boolean))];
  if (uniqueOwners.length > 1) {
    console.warn('Ownership mismatch detected!');
  }
}
```

## IPFS Metadata

Store metadata on IPFS:

```javascript
// scripts/upload-metadata.js
import { create } from 'ipfs-http-client';

async function uploadMetadata(tokenId, metadata) {
  const ipfs = create({ url: 'https://ipfs.infura.io:5001' });

  const result = await ipfs.add(JSON.stringify({
    name: `My NFT #${tokenId}`,
    description: 'A unique cross-chain NFT',
    image: `ipfs://${metadata.imageHash}`,
    attributes: metadata.attributes,
  }));

  return result.cid.toString();
}

// Example metadata
const metadata = {
  imageHash: 'QmImageHash...',
  attributes: [
    { trait_type: 'Background', value: 'Blue' },
    { trait_type: 'Rarity', value: 'Rare' },
  ],
};
```

## Testing

```javascript
// tests/nft.test.js
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('MyNFT', () => {
  let nft;

  beforeEach(async () => {
    const MyNFT = await ethers.getContractFactory('MyNFT');
    nft = await MyNFT.deploy(
      'Test NFT',
      'TNFT',
      100,
      ethers.parseEther('0.01'),
      'ipfs://test/'
    );
  });

  it('should mint NFT', async () => {
    const [owner] = await ethers.getSigners();

    const tx = await nft.mint(owner.address, {
      value: ethers.parseEther('0.01'),
    });

    await tx.wait();

    expect(await nft.ownerOf(0)).to.equal(owner.address);
    expect(await nft.totalSupply()).to.equal(1);
  });

  it('should respect max supply', async () => {
    // Mint up to max supply and verify it fails after
  });
});
```

## Marketplace Integration

Integrate with OpenSea and other marketplaces:

```javascript
// Set OpenSea-compatible metadata
const contractMetadata = {
  name: 'My NFT Collection',
  description: 'Cross-chain NFT collection',
  image: 'ipfs://collection-image',
  external_link: 'https://mynft.com',
  seller_fee_basis_points: 250, // 2.5% royalty
  fee_recipient: '0x...',
};
```

## Next Steps

- [Token Example](token.md) - Simple token deployment
- [DeFi Example](defi.md) - Cross-chain DeFi
- [SDK Reference](../sdk/index.md) - Full API documentation
