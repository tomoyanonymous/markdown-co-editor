# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Ensure optional runtime directories exist in the build context
RUN mkdir -p /app/data /app/content

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime tools used by the server
RUN apk add --no-cache pandoc git

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/content ./content

# Create runtime directories
RUN mkdir -p /app/data /app/content && \
  chmod 777 /app/data /app/content

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/files', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "dist/server/index.js"]
