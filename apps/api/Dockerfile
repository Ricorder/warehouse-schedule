FROM node:22-slim AS base
RUN corepack enable
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# === Сборка ===
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build
# deploy собирает самодостаточную папку: prod-зависимости, dist и src
# (последний нужен nestjs-trpc, который сканирует исходники при старте).
# --legacy — потому что воркспейс не использует inject-workspace-packages.
RUN pnpm --filter api deploy --prod --legacy /out

# === Запуск ===
FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --gid 1001 nodejs
COPY --from=builder --chown=nodejs:nodejs /out ./
USER nodejs
EXPOSE 8000
CMD ["node", "dist/src/main"]
