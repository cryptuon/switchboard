# Oracle Service Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/services/oracle-service/package*.json ./packages/services/oracle-service/

# Install dependencies
RUN npm install --production

# Copy source code
COPY packages/services/oracle-service/dist ./packages/services/oracle-service/dist
COPY packages/services/oracle-service/src ./packages/services/oracle-service/src

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the service
CMD ["node", "packages/services/oracle-service/dist/index.js"]