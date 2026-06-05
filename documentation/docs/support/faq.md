# Frequently Asked Questions

Common questions about Switchboard.

## General

### What is Switchboard?

Switchboard is a unified cross-chain state synchronization platform that enables developers to deploy once and sync everywhere across 50+ blockchains with sub-400ms coordination latency.

### How does cross-chain coordination work?

Switchboard uses Solana as a high-performance coordination layer. When you deploy contracts or update state:

1. Changes are recorded on Solana
2. Solana coordinates state across target chains
3. All chains receive updates within 400ms

### What chains are supported?

Switchboard supports 50+ chains including:

- **EVM**: Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche, Base
- **Layer 2**: zkSync Era, Polygon zkEVM, Linea, Mantle
- **Alternative L1**: NEAR, Cosmos, Sui, Aptos
- **Emerging**: Celestia, StarkNet, Flow

See [Supported Chains](../architecture/supported-chains.md) for the full list.

### Is Switchboard open source?

Yes, Switchboard is open source under the MIT license. Contributions are welcome!

## Pricing

### How much does Switchboard cost?

Switchboard offers:

- **Free tier**: 10 deployments/month, 5 chains
- **Pro tier**: $49/month, 100 deployments, unlimited chains
- **Enterprise**: Custom pricing

### What are the gas costs?

Gas costs depend on the target chains. Switchboard helps optimize gas through:

- Batched transactions
- Optimal gas price selection
- Multi-chain parallelization

Use `switchboard estimate` to calculate costs before deployment.

## Technical

### What database should I use?

Both MongoDB and PostgreSQL are supported:

- **MongoDB**: Faster development, flexible schema
- **PostgreSQL**: Better for complex queries, ACID compliance

Choose based on your team's expertise and requirements.

### How do I handle private keys?

Best practices:

1. Use environment variables
2. Use secrets managers (AWS Secrets Manager, Vault)
3. Never commit keys to version control
4. Use different keys for testnet and mainnet

### Can I use my own RPC providers?

Yes, configure any RPC provider:

```bash
ETHEREUM_RPC_URL=https://your-provider.com/rpc
```

Recommended providers: Alchemy, Infura, QuickNode.

### What's the maximum latency?

Switchboard targets sub-400ms coordination latency. Actual latency depends on:

- Network conditions
- Target chain block times
- Geographic location
- RPC provider performance

### How do I monitor deployments?

Multiple options:

1. **CLI**: `switchboard status --watch`
2. **SDK**: Subscribe to deployment events
3. **API**: Poll deployment status endpoint
4. **Dashboard**: Real-time web interface

## Development

### How do I run tests?

```bash
# All tests
npm run test

# Integration tests
npm run test:integration

# Specific package
npm run test --workspace=packages/sdk
```

### How do I debug issues?

Enable debug logging:

```bash
DEBUG=switchboard:* switchboard deploy
```

Or use the diagnostics tool:

```bash
switchboard doctor
```

### Can I contribute?

Yes! See the [Contributing Guide](../development/contributing.md).

## Deployment

### Can I deploy to mainnets?

Yes, use production mode:

```bash
switchboard deploy --prod-mode
```

Always test on testnets first.

### How do I verify contracts?

```bash
switchboard verify --contract MyContract --network ethereum
```

Or enable auto-verification:

```javascript
// switchboard.config.js
module.exports = {
  deployment: {
    verification: true,
  },
};
```

### What if deployment fails on one chain?

Switchboard handles partial failures:

1. Successful chains are recorded
2. Failed chains can be retried
3. State remains consistent

```bash
switchboard deploy:retry --deployment-id abc123
```

## Security

### Is Switchboard secure?

Security measures include:

- JWT authentication
- API key management
- Rate limiting
- Input validation
- Encrypted connections

### How are private keys handled?

Private keys are:

- Never stored by Switchboard
- Used only for transaction signing
- Kept in your environment

### How do I report vulnerabilities?

Email: security@switchboard.dev

Do NOT open public issues for security vulnerabilities.

## Support

### Where can I get help?

- **Documentation**: You're reading it!
- **GitHub Issues**: For bugs and features
- **Discord**: Real-time community help
- **Stack Overflow**: Technical questions

### Is there enterprise support?

Yes, contact enterprise@switchboard.dev for:

- Priority support
- Custom integrations
- SLA guarantees
- Dedicated resources

### How do I stay updated?

- [GitHub Releases](https://github.com/switchboard/switchboard/releases)
- [Twitter](https://twitter.com/switchboard)
- [Discord Announcements](https://discord.gg/switchboard)
- [Blog](https://blog.switchboard.dev)
