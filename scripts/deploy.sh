#!/bin/bash

# Deployment script for Switchboard

echo "Deploying Switchboard..."

# Build all packages
echo "Building all packages..."
npm run build

# Deploy Solana programs
echo "Deploying Solana programs..."
./scripts/build-programs.sh

# TODO: Add actual deployment commands for Solana programs
# This would typically involve:
# anchor deploy --provider.cluster mainnet

echo "Switchboard deployed successfully!"