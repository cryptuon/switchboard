#!/bin/bash

# Build script for Solana programs

echo "Building Solana programs..."

# Navigate to the programs directory
cd packages/programs

# Build each program
echo "Building state-oracle program..."
cd state-oracle
anchor build
cd ..

echo "Building coordinator program..."
cd coordinator
anchor build
cd ..

echo "Solana programs built successfully!"