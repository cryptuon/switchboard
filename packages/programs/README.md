# Switchboard Solana Programs

This directory contains the Solana on-chain programs that power Switchboard's coordination layer.

## Programs

1. **State Oracle Program** - Processes data from the Universal State Oracle
2. **Coordinator Program** - Manages cross-chain state synchronization
3. **Shared Utilities** - Common functions and types used by both programs

## Development

### Prerequisites

- Rust
- Solana CLI tools
- Anchor framework

### Building

```bash
# Build a specific program
anchor build

# Build all programs
./scripts/build-programs.sh
```

### Testing

```bash
# Run tests for a specific program
anchor test

# Run all tests
./scripts/test-programs.sh
```

### Deployment

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

## Program Architecture

### State Oracle Program

The State Oracle program is responsible for processing data received from the off-chain Universal State Oracle. It verifies cryptographic proofs and stores verified state data in Solana accounts.

### Coordinator Program

The Coordinator program manages cross-chain state synchronization. It uses the verified state data to ensure consistency across all connected chains.

### Shared Utilities

Contains common functions and types used by both programs, including:
- Account structures
- Error types
- Serialization utilities
- Validation functions

## Security

These programs implement a comprehensive security model:
- Input validation on all instructions
- Proper access control using Solana's account constraints
- Secure account management with proper ownership checks
- Extensive testing to prevent vulnerabilities

## License

MIT