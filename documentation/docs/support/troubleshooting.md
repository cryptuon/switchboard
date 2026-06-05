# Troubleshooting

Common issues and their solutions.

## Connection Issues

### RPC Connection Failed

**Symptoms:**
```
Error: Could not connect to RPC endpoint
```

**Solutions:**

1. **Check URL format**
   ```bash
   # Correct
   ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

   # Wrong - missing https
   ETHEREUM_RPC_URL=eth-mainnet.g.alchemy.com/v2/YOUR_KEY
   ```

2. **Test connectivity**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     $ETHEREUM_RPC_URL
   ```

3. **Check API key**
   - Verify key is valid
   - Check rate limits
   - Ensure key has required permissions

### Solana Connection Issues

**Symptoms:**
```
Error: Failed to connect to Solana
```

**Solutions:**

1. **Use correct network URL**
   ```bash
   # Devnet
   SOLANA_RPC_URL=https://api.devnet.solana.com

   # Mainnet
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

2. **Check Solana network status**
   ```bash
   curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```

## Deployment Issues

### Deployment Timeout

**Symptoms:**
```
TimeoutError: Transaction not confirmed within 120000ms
```

**Solutions:**

1. **Increase gas price**
   ```bash
   switchboard deploy --gas-multiplier 1.5
   ```

2. **Check network congestion**
   - Use gas tracker for target network
   - Deploy during low-traffic periods

3. **Increase timeout**
   ```javascript
   // switchboard.config.js
   module.exports = {
     deployment: {
       timeout: 300000, // 5 minutes
     },
   };
   ```

### Insufficient Funds

**Symptoms:**
```
Error: Insufficient funds for gas
```

**Solutions:**

1. **Check balance**
   ```bash
   switchboard balance --network ethereum
   ```

2. **Get test tokens**
   ```bash
   switchboard faucet --network sepolia --address YOUR_ADDRESS
   ```

3. **Estimate fees first**
   ```bash
   switchboard estimate --contract MyContract --networks ethereum,polygon
   ```

### Contract Verification Failed

**Symptoms:**
```
Error: Contract verification failed
```

**Solutions:**

1. **Check constructor arguments**
   - Arguments must match exactly
   - Use correct encoding

2. **Verify compiler version**
   ```javascript
   // hardhat.config.js
   module.exports = {
     solidity: "0.8.19", // Match deployed version
   };
   ```

3. **Retry verification**
   ```bash
   switchboard verify --contract MyContract --network ethereum --force
   ```

## Authentication Issues

### Invalid JWT Token

**Symptoms:**
```
Error: JWT token expired or invalid
```

**Solutions:**

1. **Refresh token**
   ```bash
   switchboard auth refresh
   ```

2. **Re-login**
   ```bash
   switchboard login
   ```

### API Key Not Working

**Symptoms:**
```
Error: Invalid API key
```

**Solutions:**

1. **Check key format**
   ```bash
   # Correct header
   X-API-Key: cs_live_abc123...

   # Wrong - using Bearer
   Authorization: Bearer cs_live_abc123...
   ```

2. **Verify key permissions**
   - Check key has required scopes
   - Verify key isn't revoked

## Database Issues

### Connection Refused

**Symptoms:**
```
Error: ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**

1. **Check if database is running**
   ```bash
   docker-compose ps mongodb
   ```

2. **Start database**
   ```bash
   docker-compose up -d mongodb
   ```

3. **Check connection URL**
   ```bash
   MONGODB_URL=mongodb://localhost:27017/switchboard
   ```

### Authentication Failed

**Symptoms:**
```
Error: Authentication failed
```

**Solutions:**

1. **Check credentials**
   ```bash
   MONGODB_URL=mongodb://user:password@localhost:27017/switchboard?authSource=admin
   ```

2. **Reset password**
   ```bash
   docker-compose exec mongodb mongosh --eval "db.changeUserPassword('switchboard', 'newpassword')"
   ```

## Performance Issues

### High Latency

**Symptoms:**
- Coordination latency > 400ms
- Slow API responses

**Solutions:**

1. **Check network latency**
   ```bash
   ping api.devnet.solana.com
   ```

2. **Use closer RPC endpoints**
   - Choose geographically close providers
   - Use paid tier for lower latency

3. **Enable caching**
   ```bash
   REDIS_URL=redis://localhost:6379
   ```

### Memory Issues

**Symptoms:**
```
Error: JavaScript heap out of memory
```

**Solutions:**

1. **Increase Node.js memory**
   ```bash
   NODE_OPTIONS=--max-old-space-size=4096 npm run dev
   ```

2. **Check for memory leaks**
   - Review event listeners
   - Check for unbounded caches

## Docker Issues

### Container Won't Start

**Solutions:**

1. **Check logs**
   ```bash
   docker-compose logs customer-api
   ```

2. **Verify ports**
   ```bash
   lsof -i :3000
   ```

3. **Rebuild containers**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Volume Permission Errors

**Solutions:**

```bash
# Fix permissions
sudo chown -R 1000:1000 ./data

# Or run as root (not recommended for production)
docker-compose up -d --user root
```

## Getting More Help

If these solutions don't work:

1. **Enable debug logging**
   ```bash
   DEBUG=switchboard:* switchboard deploy
   ```

2. **Collect diagnostics**
   ```bash
   switchboard doctor > diagnostics.txt
   ```

3. **Open an issue** with:
   - Error message
   - Steps to reproduce
   - Diagnostics file
   - Environment details
