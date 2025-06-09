# 🌱 Satupersen Bot Dockerfile
# Multi-stage build for optimal production image

# Build stage
FROM oven/bun:alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies (including dev dependencies for build)
RUN bun install --frozen-lockfile

# Copy source code and configuration
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build application (if needed)
# RUN bun run build

# Remove dev dependencies for smaller image
RUN bun install --production --frozen-lockfile

# Production stage
FROM oven/bun:alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=botuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=botuser:nodejs /app/package.json ./
COPY --from=builder --chown=botuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=botuser:nodejs /app/src ./src
COPY --from=builder --chown=botuser:nodejs /app/index.ts ./

# Create logs directory
RUN mkdir -p /app/logs && chown botuser:nodejs /app/logs

# Switch to non-root user
USER botuser

# Expose port (for health checks if needed)
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV BUN_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD bun run src/utils/test-db-connection.ts || exit 1

# Use dumb-init for proper signal handling and start the bot
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "index.ts"]

# Labels for better maintainability
LABEL maintainer="Satupersen Team <support@satupersen.com>"
LABEL version="1.0.0"
LABEL description="Satupersen Daily Reflection Telegram Bot"
LABEL org.opencontainers.image.source="https://github.com/underworld14/satupersen-bot"
LABEL org.opencontainers.image.title="Satupersen Bot"
LABEL org.opencontainers.image.description="AI-powered daily reflection Telegram bot for 1% daily growth" 