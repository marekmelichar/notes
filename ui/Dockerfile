ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /opt/app

# Placeholder env.js so the build doesn't fail on missing runtime config.
# The real env.js is rewritten at container start by
# /docker-entrypoint.d/40-write-env-js.sh.
RUN echo 'window.API_URL="";window.KEYCLOAK_URL="";window.KEYCLOAK_REALM="";window.KEYCLOAK_CLIENT_ID="";' > env.js

COPY package.json package-lock.json ./
COPY .npmrc* ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .

RUN npm run build && \
    mkdir -p ./build && \
    node -p "require('./package.json').version" > ./build/version.txt

# ---
# Production stage: nginxinc/nginx-unprivileged runs as UID 101 (nginx),
# listens on 8080 by default, and needs no capabilities to start.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Static assets owned by the nginx user so /docker-entrypoint.d scripts can
# overwrite env.js at container start without elevating.
COPY --chown=nginx:nginx --from=build /opt/app/build /usr/share/nginx/html

# Our server block (listens on 8080 to match the unprivileged image).
COPY --chown=nginx:nginx ./nginx.conf /etc/nginx/conf.d/default.conf

# Runtime env.js generator: the base image runs every /docker-entrypoint.d/*.sh
# file in order before `nginx -g 'daemon off;'`. 40- puts us after built-in
# env substitution scripts (10-, 20-, 30-).
COPY --chmod=755 docker-entrypoint.sh /docker-entrypoint.d/40-write-env-js.sh

EXPOSE 8080
