# Node.js Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (for caching)
COPY server/package*.json ./

RUN npm install

# Copy source code
COPY server/ .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "index.js"]
