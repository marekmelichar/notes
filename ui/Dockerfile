ARG NODE_VERSION=22
FROM node:$NODE_VERSION AS build

WORKDIR /opt/app

# Create placeholder env.js for build
RUN echo 'window.API_URL="";window.KEYCLOAK_URL="";window.KEYCLOAK_REALM="";window.KEYCLOAK_CLIENT_ID="";window.MOCK_MODE=false;' > env.js

COPY package.json package-lock.json ./
COPY .npmrc* ./
RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build && \
    mkdir -p ./build && \
    node -p "require('./package.json').version" > ./build/version.txt

# Production stage
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=build /opt/app/build /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script for runtime env configuration
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
