#!/bin/bash

# Test script for Solana programs

echo "Testing Solana programs..."

# Navigate to the programs directory
cd packages/programs

# Test each program
echo "Testing state-oracle program..."
cd state-oracle
anchor test
cd ..

echo "Testing coordinator program..."
cd coordinator
anchor test
cd ..

echo "Solana programs tested successfully!"