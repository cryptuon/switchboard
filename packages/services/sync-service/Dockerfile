# Sync Service Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/services/sync-service/package*.json ./packages/services/sync-service/

# Install dependencies
RUN npm install --production

# Copy source code
COPY packages/services/sync-service/dist ./packages/services/sync-service/dist
COPY packages/services/sync-service/src ./packages/services/sync-service/src

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the service
CMD ["node", "packages/services/sync-service/dist/index.js"]