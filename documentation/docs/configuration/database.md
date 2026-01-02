# Database Configuration

ChainSync supports MongoDB and PostgreSQL as the primary database.

## Database Selection

Set the database type:

```bash
# Use MongoDB (default)
DATABASE_TYPE=mongodb

# Use PostgreSQL
DATABASE_TYPE=postgresql
```

## MongoDB Configuration

### Connection URL

```bash
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://username:password@host:27017/database
```

### URL Components

| Component | Description | Example |
|-----------|-------------|---------|
| `username` | Database user | `chainsync` |
| `password` | User password | `password123` |
| `host` | MongoDB host | `localhost` |
| `port` | MongoDB port | `27017` |
| `database` | Database name | `chainsync` |

### Replica Set

For production, use a replica set:

```bash
MONGODB_URL=mongodb://user:pass@host1:27017,host2:27017,host3:27017/chainsync?replicaSet=rs0
```

### Connection Options

Add options to the connection string:

```bash
MONGODB_URL=mongodb://user:pass@host:27017/chainsync?authSource=admin&retryWrites=true
```

Common options:

| Option | Description |
|--------|-------------|
| `authSource` | Authentication database |
| `replicaSet` | Replica set name |
| `retryWrites` | Retry failed writes |
| `w` | Write concern |
| `maxPoolSize` | Connection pool size |

### Docker Configuration

```yaml
services:
  mongodb:
    image: mongo:7
    environment:
      - MONGO_INITDB_ROOT_USERNAME=chainsync
      - MONGO_INITDB_ROOT_PASSWORD=${MONGODB_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
```

## PostgreSQL Configuration

### Connection URL

```bash
DATABASE_TYPE=postgresql
POSTGRES_URL=postgres://username:password@host:5432/database
```

### URL Components

| Component | Description | Example |
|-----------|-------------|---------|
| `username` | Database user | `chainsync` |
| `password` | User password | `password123` |
| `host` | PostgreSQL host | `localhost` |
| `port` | PostgreSQL port | `5432` |
| `database` | Database name | `chainsync` |

### Connection Options

```bash
POSTGRES_URL=postgres://user:pass@host:5432/chainsync?sslmode=require&pool_max=20
```

Common options:

| Option | Description |
|--------|-------------|
| `sslmode` | SSL mode (disable, require, verify-full) |
| `pool_max` | Maximum pool connections |
| `pool_min` | Minimum pool connections |
| `connect_timeout` | Connection timeout (seconds) |

### Docker Configuration

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=chainsync
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=chainsync
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
```

## Redis Configuration

Redis is used for caching and session management.

```bash
REDIS_URL=redis://localhost:6379
```

### With Password

```bash
REDIS_URL=redis://:password@localhost:6379
```

### With Database Selection

```bash
REDIS_URL=redis://localhost:6379/0
```

### Docker Configuration

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
```

## ClickHouse Configuration

ClickHouse is used for analytics and event streaming.

```bash
CLICKHOUSE_URL=http://username:password@localhost:8123/database
```

### Docker Configuration

```yaml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    environment:
      - CLICKHOUSE_USER=chainsync
      - CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}
      - CLICKHOUSE_DB=chainsync_analytics
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    ports:
      - "8123:8123"
```

## Database Migrations

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:rollback

# Reset database
npm run db:reset
```

### Creating Migrations

```bash
npm run db:migrate:create -- --name add-new-field
```

## Connection Pooling

### MongoDB Pool Settings

Configure via connection URL:

```bash
MONGODB_URL=mongodb://host:27017/db?maxPoolSize=50&minPoolSize=10
```

### PostgreSQL Pool Settings

Configure via connection URL or environment:

```bash
POSTGRES_URL=postgres://host:5432/db?pool_max=50&pool_min=10
```

## Production Recommendations

### MongoDB

1. **Use Replica Sets** - Minimum 3 nodes
2. **Enable Authentication** - Use SCRAM-SHA-256
3. **Configure Connection Pool** - Size based on workload
4. **Enable SSL/TLS** - Encrypt in transit
5. **Regular Backups** - Use mongodump or cloud backups

### PostgreSQL

1. **Use Replication** - Primary with standby
2. **Enable SSL** - Use `sslmode=verify-full`
3. **Configure Pool Size** - Based on available connections
4. **Use Connection Pooler** - PgBouncer for high concurrency
5. **Regular Backups** - Use pg_dump or cloud backups

### Redis

1. **Enable Persistence** - AOF or RDB snapshots
2. **Configure Memory** - Set maxmemory policy
3. **Use Password** - Enable authentication
4. **Consider Redis Cluster** - For high availability

## Troubleshooting

### Connection Refused

```bash
# Check if service is running
docker-compose ps

# Check logs
docker-compose logs mongodb
```

### Authentication Failed

```bash
# Verify credentials
docker-compose exec mongodb mongosh -u chainsync -p password

# Check authSource
MONGODB_URL=mongodb://user:pass@host:27017/db?authSource=admin
```

### Connection Timeout

```bash
# Increase timeout
MONGODB_URL=mongodb://host:27017/db?connectTimeoutMS=10000

# Check network connectivity
ping mongodb-host
```

### Pool Exhausted

```bash
# Increase pool size
MONGODB_URL=mongodb://host:27017/db?maxPoolSize=100

# Check for connection leaks
# Ensure connections are properly closed
```
