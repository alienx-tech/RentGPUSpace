# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .

# Next inlines NEXT_PUBLIC_* into the browser bundle at build time.
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_TOKEN

# The client bundle reads Supabase from these at build time; without them the
# browser has no backend to talk to, so fail the build rather than ship a dud image.
RUN test -n "${PUBLIC_SUPABASE_URL}" || (echo "PUBLIC_SUPABASE_URL build arg is required" && exit 1)
RUN test -n "${PUBLIC_SUPABASE_TOKEN}" || (echo "PUBLIC_SUPABASE_TOKEN build arg is required" && exit 1)
# This value is compiled into the browser bundle. A secret key here would be
# served to every visitor and bypass row-level security, so refuse to build.
RUN case "${PUBLIC_SUPABASE_TOKEN}" in \
      sb_secret_*) echo "PUBLIC_SUPABASE_TOKEN is a SECRET key; it must be the publishable (sb_publishable_) key" && exit 1 ;; \
    esac

RUN NEXT_PUBLIC_SUPABASE_URL="${PUBLIC_SUPABASE_URL}" \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${PUBLIC_SUPABASE_TOKEN}" \
    npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

# Next's standalone output traces only the production dependencies actually
# used, unlike the .output/ Nitro folder it replaces conceptually — public/
# and .next/static are excluded from it by design and copied separately.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node

EXPOSE 3000

# Liveness only — /healthz answers from process state and never calls Supabase,
# so a database blip does not restart the container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
