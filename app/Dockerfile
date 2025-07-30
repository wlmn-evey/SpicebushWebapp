# Multi-stage Dockerfile for Spicebush Montessori Astro Application
# Supports both development and production builds

# Stage 1: Base image with dependencies
FROM node:20-alpine AS base

# Install system dependencies for sharp image processing
RUN apk add --no-cache \
    git \
    vips-dev \
    fftw-dev \
    build-base \
    gcc \
    g++ \
    make \
    python3 \
    libc6-compat

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astro -u 1001

# Stage 2: Dependencies installation
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --legacy-peer-deps --loglevel=error --no-audit --no-fund && \
    npm cache clean --force

# Copy production dependencies aside
RUN cp -R node_modules prod_node_modules

# Install all dependencies (including dev) with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --loglevel=error --no-audit --no-fund && \
    npm cache clean --force

# Stage 3: Build stage
FROM base AS build

# Accept build arguments for environment variables
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG PUBLIC_STRAPI_URL

# Set environment variables for the build
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
ENV PUBLIC_STRAPI_URL=$PUBLIC_STRAPI_URL

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Ensure the build user has proper permissions
RUN chown -R astro:nodejs /app

# Switch to non-root user for build
USER astro

# Build the Astro application with error handling
RUN npm run build || (echo "Build failed. Check environment variables." && exit 1)

# Verify build output
RUN test -d dist || (echo "dist directory not created!" && exit 1)

# Stage 4: Production runtime
FROM base AS production

# Set NODE_ENV
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=deps /app/prod_node_modules ./node_modules

# Copy built application as root first
COPY --from=build --chown=astro:nodejs /app/dist ./dist
COPY --from=build --chown=astro:nodejs /app/package*.json ./

# Copy public assets that might not be in dist
COPY --from=build --chown=astro:nodejs /app/public ./public

# Create a simple server script for better error handling
RUN echo '#!/bin/sh\nif [ ! -d "dist" ]; then\n  echo "Error: dist directory not found!"\n  exit 1\nfi\nexec npm run preview -- --host 0.0.0.0 --port 4321' > /app/start.sh && \
    chmod +x /app/start.sh && \
    chown astro:nodejs /app/start.sh

# Switch to non-root user
USER astro

# Expose port (Astro preview server)
EXPOSE 4321

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4321', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Production preview command
CMD ["/app/start.sh"]

# Stage 5: Development runtime
FROM base AS development

# Set NODE_ENV
ENV NODE_ENV=development

# Copy all dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (will be overridden by volume mount)
COPY . .

# Change ownership to non-root user
RUN chown -R astro:nodejs /app

# Switch to non-root user
USER astro

# Expose port
EXPOSE 4321

# Development command with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4321"]