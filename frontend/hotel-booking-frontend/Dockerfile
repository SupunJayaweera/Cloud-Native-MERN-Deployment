# Build stage
FROM node:20 as builder

WORKDIR /app

# Accept build arguments for API URLs
ARG VITE_API_BASE_URL=""
ARG VITE_HOTEL_API_BASE_URL=""
ARG VITE_ROOM_API_BASE_URL=""
ARG VITE_BOOKING_API_BASE_URL=""

# Set them as environment variables for the build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_HOTEL_API_BASE_URL=$VITE_HOTEL_API_BASE_URL
ENV VITE_ROOM_API_BASE_URL=$VITE_ROOM_API_BASE_URL
ENV VITE_BOOKING_API_BASE_URL=$VITE_BOOKING_API_BASE_URL

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]

