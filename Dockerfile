# Use Node.js 16 as the base image
FROM node:16

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY lerna.json ./

# Copy package directories
COPY packages/ ./packages/

# Install dependencies
RUN npm install

# Build the project
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]