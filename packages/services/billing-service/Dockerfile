# Billing Service Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/services/billing-service/package*.json ./packages/services/billing-service/

# Install dependencies
RUN npm install --production

# Copy source code
COPY packages/services/billing-service/dist ./packages/services/billing-service/dist
COPY packages/services/billing-service/src ./packages/services/billing-service/src

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the service
CMD ["node", "packages/services/billing-service/dist/index.js"]