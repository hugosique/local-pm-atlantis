# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment.
#
# DATABASE_URI and PAYLOAD_SECRET are deliberately NOT build args: an ARG/ENV
# pair is baked into the image layers and readable by anyone with the image
# via `docker history`, so passing real secrets at build time leaks them.
# Both are injected at runtime by docker-compose instead.
#
# Nothing needs them during `next build`: every page that reads the database
# is `export const dynamic = 'force-dynamic'`, so none are prerendered. The
# placeholder secret below only satisfies config validation during the build
# and is never the secret the running container uses.
#
# NEXT_PUBLIC_SERVER_URL stays a build arg because Next.js inlines NEXT_PUBLIC_*
# into the client bundle at build time, and it is public by definition.
ARG NEXT_PUBLIC_SERVER_URL

ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV PAYLOAD_SECRET="build-time-placeholder-not-used-at-runtime"
ENV NODE_OPTIONS="--no-deprecation --max-old-space-size=8000"

# Create public directory if it doesn't exist (some Next.js apps may not have one)
RUN mkdir -p public

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-deprecation"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
ENV LOCAL_PM_UPLOADS_DIR=/app/uploads

USER nextjs

EXPOSE 3010

ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start"]
