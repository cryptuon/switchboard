# Support

Get help with ChainSync.

## Resources

- [Troubleshooting](troubleshooting.md) - Common issues and solutions
- [FAQ](faq.md) - Frequently asked questions

## Getting Help

### Documentation

Start with the documentation:

1. Search the docs using the search bar
2. Check the relevant section
3. Review examples

### GitHub Issues

For bugs and feature requests:

1. Search [existing issues](https://github.com/chainsync/chainsync/issues)
2. Open a new issue with details
3. Use issue templates

### Discord

Join our [Discord server](https://discord.gg/chainsync) for:

- Real-time help
- Community discussions
- Announcements

### Stack Overflow

Ask questions with the `chainsync` tag:

- [ChainSync on Stack Overflow](https://stackoverflow.com/questions/tagged/chainsync)

## Reporting Bugs

Include in your bug report:

1. **Description** - What happened?
2. **Steps to reproduce** - How can we recreate it?
3. **Expected behavior** - What should happen?
4. **Environment** - OS, Node.js version, ChainSync version
5. **Logs** - Error messages and stack traces

### Example Bug Report

```markdown
## Description
Deployment fails on Polygon Mumbai with timeout error.

## Steps to Reproduce
1. Initialize project with `chainsync init my-app --dev-mode`
2. Configure Mumbai RPC URL
3. Run `chainsync deploy --networks mumbai`

## Expected Behavior
Deployment should complete within 5 minutes.

## Actual Behavior
Deployment times out after 2 minutes with error:
`TimeoutError: Transaction not confirmed within 120000ms`

## Environment
- OS: Ubuntu 22.04
- Node.js: 20.10.0
- ChainSync CLI: 1.2.3
- RPC Provider: Alchemy

## Logs
[Paste relevant logs here]
```

## Feature Requests

For feature requests:

1. Describe the use case
2. Explain the proposed solution
3. Consider alternatives

## Security Issues

For security vulnerabilities:

- **Do NOT** open a public issue
- Email: security@chainsync.dev
- We'll respond within 48 hours

## Enterprise Support

For enterprise customers:

- Priority support
- Custom integrations
- SLA guarantees

Contact: enterprise@chainsync.dev

## Status Page

Check service status at: [status.chainsync.dev](https://status.chainsync.dev)
