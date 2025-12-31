#!/bin/bash
set -e

DOMAIN=${1:-epoznamky.cz}
EMAIL=${2:-admin@$DOMAIN}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== SSL Setup for $DOMAIN ===${NC}"

cd /opt/epoznamky

# Create directories
mkdir -p deploy/certbot/conf
mkdir -p deploy/certbot/www

# Create temporary nginx config for initial certificate
echo -e "${YELLOW}Creating temporary nginx config...${NC}"
cat > deploy/nginx-init.conf << EOF
events {
    worker_connections 1024;
}
http {
    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 200 'Setting up SSL...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Start temporary nginx
echo -e "${YELLOW}Starting temporary nginx...${NC}"
docker run -d --name nginx-init \
    -p 80:80 \
    -v $(pwd)/deploy/nginx-init.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/deploy/certbot/www:/var/www/certbot \
    nginx:1.27-alpine

# Get certificate
echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
docker run --rm \
    -v $(pwd)/deploy/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/deploy/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Stop temporary nginx
echo -e "${YELLOW}Stopping temporary nginx...${NC}"
docker stop nginx-init
docker rm nginx-init
rm deploy/nginx-init.conf

echo -e "${GREEN}SSL certificate obtained!${NC}"
echo ""
echo -e "${YELLOW}You can now start the application:${NC}"
echo "docker compose -f docker-compose.prod.yml up -d"
