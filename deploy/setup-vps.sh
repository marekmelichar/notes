#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== epoznamky.cz VPS Setup ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Create app directory
mkdir -p /opt/epoznamky
cd /opt/epoznamky

# Create .env file if not exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << 'EOF'
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Keycloak
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# GitHub Container Registry (set by CI/CD)
GITHUB_REPOSITORY=your-username/epoznamky.cz
EOF
    echo -e "${RED}IMPORTANT: Edit /opt/epoznamky/.env and set secure passwords!${NC}"
fi

# Create certbot directories
mkdir -p deploy/certbot/conf
mkdir -p deploy/certbot/www

echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit /opt/epoznamky/.env with secure passwords"
echo "2. Run the SSL setup: ./deploy/setup-ssl.sh epoznamky.cz"
echo "3. Add GitHub secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY)"
echo "4. Push to main branch to trigger deployment"
