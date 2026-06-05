#!/bin/bash

# Switchboard Development Setup Script

set -e

echo "🚀 Setting up Switchboard development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust 1.70+ first."
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI is not installed. Please install Solana CLI 1.16+ first."
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor is not installed. Installing Anchor..."
    npm install -g @coral-xyz/anchor-cli@latest
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build packages
echo "🔨 Building packages..."
npm run build

# Setup environment file
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your RPC URLs and configuration"
echo "2. Run 'npm run dev' to start development services"
echo "3. Run 'npm test' to run tests"
echo "4. Check docs/ for detailed documentation"