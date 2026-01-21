# Deployment Guide

This guide covers deploying epoznamky.cz to a Linux VPS (tested on Contabo VPS with Ubuntu/Debian).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼ (ports 80, 443)
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (SSL Termination)                   │
│                                                              │
│  /           → frontend:80                                   │
│  /api/       → api:8080                                      │
│  /realms/    → keycloak:8080                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌───────────┐
   │Frontend │      │   API   │      │ Keycloak  │
   │ (React) │      │ (.NET)  │      │  (Auth)   │
   └─────────┘      └────┬────┘      └─────┬─────┘
                         │                 │
                         └────────┬────────┘
                                  ▼
                         ┌──────────────┐
                         │  PostgreSQL  │
                         └──────────────┘
```

## Prerequisites

### On your VPS
- Ubuntu 22.04+ or Debian 11+ (other Linux distros should work)
- Root or sudo access
- Domain pointing to your VPS IP (A record for `epoznamky.cz` and `www.epoznamky.cz`)
- Ports 80 and 443 open in firewall

### On GitHub
- Repository pushed to GitHub
- GitHub Actions enabled

## Step 1: Configure GitHub Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | Your VPS IP address | `123.45.67.89` |
| `VPS_USER` | SSH username | `root` |
| `VPS_SSH_KEY` | Private SSH key (full content) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

### Generating SSH Key (if needed)

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/epoznamky-deploy

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/epoznamky-deploy.pub root@YOUR_VPS_IP

# The private key content goes into VPS_SSH_KEY secret
cat ~/.ssh/epoznamky-deploy
```

## Step 2: Initial VPS Setup

SSH into your VPS and run:

```bash
# Download setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/epoznamky.cz/main/deploy/setup-vps.sh -o setup-vps.sh

# Review and run
chmod +x setup-vps.sh
sudo ./setup-vps.sh
```

This script will:
- Install Docker if not present
- Create `/opt/epoznamky` directory
- Create `.env` template file

### Configure Environment Variables

```bash
sudo nano /opt/epoznamky/.env
```

Set secure passwords:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-very-secure-database-password-here

# Keycloak Admin
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=your-very-secure-keycloak-password-here

# GitHub Container Registry
GITHUB_REPOSITORY=your-github-username/epoznamky.cz
```

**Important:** Use strong, unique passwords! You can generate them with:
```bash
openssl rand -base64 32
```

## Step 3: DNS Configuration

Before obtaining SSL certificates, ensure your domain points to your VPS:

1. Go to your domain registrar's DNS settings
2. Add/update A records:
   - `epoznamky.cz` → `YOUR_VPS_IP`
   - `www.epoznamky.cz` → `YOUR_VPS_IP`
3. Wait for DNS propagation (can take up to 24h, usually faster)

Verify DNS:
```bash
dig epoznamky.cz +short
# Should return your VPS IP
```

## Step 4: SSL Certificate Setup

Once DNS is configured, obtain SSL certificates:

```bash
cd /opt/epoznamky

# Download SSL setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/epoznamky.cz/main/deploy/setup-ssl.sh -o deploy/setup-ssl.sh
chmod +x deploy/setup-ssl.sh

# Run SSL setup (replace with your email)
./deploy/setup-ssl.sh epoznamky.cz your-email@example.com
```

This script will:
- Start a temporary nginx container
- Obtain Let's Encrypt certificates via HTTP challenge
- Store certificates in `deploy/certbot/conf/`

## Step 5: First Deployment

Push to `main` branch to trigger the first deployment:

```bash
git add .
git commit -m "Configure CI/CD deployment"
git push origin main
```

Or manually trigger via GitHub Actions:
1. Go to repository → **Actions**
2. Select "Build and Deploy" workflow
3. Click "Run workflow"

### Monitor Deployment

- **GitHub Actions:** Check the Actions tab for build/deploy logs
- **VPS logs:** `docker compose -f docker-compose.prod.yml logs -f`

## Step 6: Verify Deployment

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                 STATUS
# epoznamky-nginx      Up
# epoznamky-frontend   Up
# epoznamky-api        Up
# epoznamky-keycloak   Up
# epoznamky-db         Up (healthy)
# epoznamky-certbot    Up
```

Visit https://epoznamky.cz to verify the application is running.

## Maintenance

### View Logs

```bash
cd /opt/epoznamky

# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f keycloak
```

### Restart Services

```bash
cd /opt/epoznamky

# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart api
```

### Manual Deployment

```bash
cd /opt/epoznamky

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart with new images
docker compose -f docker-compose.prod.yml up -d

# Clean up old images
docker image prune -f
```

### Database Backup

#### Manual Backup

```bash
# Backup
docker exec epoznamky-db pg_dump -U postgres epoznamky > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i epoznamky-db psql -U postgres epoznamky < backup_20240101.sql
```

#### Automated Daily Backups

A backup script is included at `deploy/backup.sh`. It backs up:
- **epoznamky database** - notes, folders, tags (daily, 7-day retention)
- **keycloak database** - users, realms, sessions (daily, 7-day retention)
- **.env file** - credentials and configuration (daily, 7-day retention)
- **SSL certificates** - Let's Encrypt certs (weekly on Sundays, 30-day retention)
- **uploads directory** - user uploaded files, if exists (daily, 7-day retention)

To set up automated daily backups:

```bash
# 1. Create backup directory
sudo mkdir -p /var/backups/epoznamky

# 2. Make script executable
chmod +x /opt/epoznamky/deploy/backup.sh

# 3. Add to crontab (runs daily at 3 AM)
crontab -e
```

Add this line to crontab:
```
0 3 * * * /opt/epoznamky/deploy/backup.sh /var/backups/epoznamky >> /var/log/epoznamky-backup.log 2>&1
```

#### Restore from Backup

```bash
# Restore epoznamky database
gunzip -c /var/backups/epoznamky/epoznamky-YYYYMMDD-HHMMSS.sql.gz | docker exec -i epoznamky-db psql -U postgres epoznamky

# Restore keycloak database
gunzip -c /var/backups/epoznamky/keycloak-YYYYMMDD-HHMMSS.sql.gz | docker exec -i epoznamky-db psql -U postgres keycloak

# Restore .env file
cp /var/backups/epoznamky/env-YYYYMMDD-HHMMSS.backup /opt/epoznamky/.env

# Restore SSL certificates
tar -xzf /var/backups/epoznamky/ssl-certs-YYYYMMDD-HHMMSS.tar.gz -C /opt/epoznamky/deploy/certbot

# Restore uploads (if applicable)
tar -xzf /var/backups/epoznamky/uploads-YYYYMMDD-HHMMSS.tar.gz -C /opt/epoznamky
```

### SSL Certificate Renewal

Certificates auto-renew via the certbot container. To manually renew:

```bash
docker compose -f docker-compose.prod.yml exec certbot certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Update Keycloak Realm

If you need to update Keycloak configuration:

1. Export realm from Keycloak Admin Console
2. Update `keycloak-realm.json`
3. Push to GitHub (triggers redeployment)

Note: Existing realm data won't be overwritten. For significant changes, you may need to manually update via Keycloak Admin.

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs SERVICE_NAME

# Check if port is in use
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

### SSL certificate issues

```bash
# Check certificate status
docker compose -f docker-compose.prod.yml exec certbot certbot certificates

# Force renewal
docker compose -f docker-compose.prod.yml exec certbot certbot renew --force-renewal
```

### Database connection issues

```bash
# Check if postgres is healthy
docker compose -f docker-compose.prod.yml ps postgres

# Connect to database
docker exec -it epoznamky-db psql -U postgres -d epoznamky
```

### API returns 401/403

- Check Keycloak is running and accessible
- Verify realm configuration
- Check API logs for authentication errors

### GitHub Actions fails

1. Check Actions tab for error logs
2. Verify all secrets are set correctly
3. Ensure VPS is accessible via SSH
4. Check VPS disk space: `df -h`

## Security Recommendations

1. **Change default passwords** - Never use default passwords in production
2. **Firewall** - Only expose ports 80, 443, and SSH (22)
3. **SSH** - Use key-based authentication, disable password login
4. **Updates** - Keep VPS system updated: `apt update && apt upgrade`
5. **Backups** - Set up regular database backups
6. **Monitoring** - Consider adding uptime monitoring (UptimeRobot, etc.)

## File Locations on VPS

| Path | Description |
|------|-------------|
| `/opt/epoznamky/` | Application root |
| `/opt/epoznamky/.env` | Environment variables |
| `/opt/epoznamky/deploy/certbot/conf/` | SSL certificates |
| `/opt/epoznamky/deploy/nginx.conf` | Nginx configuration |
| Docker volume `postgres_data` | Database files |
