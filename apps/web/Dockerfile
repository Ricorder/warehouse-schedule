FROM node:22-slim AS base
RUN corepack enable
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# === Сборка ===
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# URL API вшивается в бандл на этапе сборки (переменная NEXT_PUBLIC_*).
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter web build

# === Запуск ===
FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --gid 1001 nodejs
ENV NODE_ENV=production
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public
USER nodejs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
