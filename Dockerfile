# Use Node.js base image
FROM node:20-slim

# Install Python 3 for the scraper script
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm ci

# Copy codebase
COPY . .

# Build frontend production bundle
RUN npm run build

# Expose server port
EXPOSE 5000

# Set default env variables
ENV PORT=5000
ENV DATA_DIR=/app/data

# Pre-create the data directory to ensure permissions
RUN mkdir -p /app/data

# Start Express server
CMD ["npm", "start"]
