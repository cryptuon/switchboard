# Customer API Service Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/services/customer-api/package*.json ./packages/services/customer-api/
COPY packages/services/services-shared/package*.json ./packages/services/services-shared/

# Install dependencies
RUN npm install --production

# Copy source code
COPY packages/services/customer-api/dist ./packages/services/customer-api/dist
COPY packages/services/customer-api/src ./packages/services/customer-api/src
COPY packages/services/services-shared/dist ./packages/services/services-shared/dist
COPY packages/services/services-shared/src ./packages/services/services-shared/src

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the service
CMD ["node", "packages/services/customer-api/dist/index.js"]