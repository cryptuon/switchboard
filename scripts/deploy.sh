#!/bin/bash

# Deployment script for ChainSync

echo "Deploying ChainSync..."

# Build all packages
echo "Building all packages..."
npm run build

# Deploy Solana programs
echo "Deploying Solana programs..."
./scripts/build-programs.sh

# TODO: Add actual deployment commands for Solana programs
# This would typically involve:
# anchor deploy --provider.cluster mainnet

echo "ChainSync deployed successfully!"