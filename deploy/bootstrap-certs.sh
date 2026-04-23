#!/usr/bin/env bash
# Obtain initial Let's Encrypt certificates for the nettio.eu stack.
#
# The certbot sidecar in docker-compose.prod.yml only runs `certbot renew` —
# it can't issue a cert that doesn't exist yet. This script handles the
# one-off bootstrap: nginx is stopped (so port 80 is free), certbot runs in
# --standalone mode for each domain set, then nginx can come up normally.
#
# Usage (run on the VPS, from /opt/nettio):
#   sudo bash deploy/bootstrap-certs.sh <email>
#
# Env:
#   CERTBOT_STAGING=1   Use Let's Encrypt staging (untrusted, unrate-limited)
#
# Idempotent: existing live/<domain>/ bundles are skipped. Delete the bundle
# first if you want to re-issue.

set -euo pipefail

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  echo "usage: $0 <email>" >&2
  exit 2
fi

COMPOSE="docker compose -f docker-compose.prod.yml"
CONF_DIR="deploy/certbot/conf"
WWW_DIR="deploy/certbot/www"

# (primary-domain, extra-san, extra-san, ...) per cert bundle
CERTS=(
  "nettio.eu www.nettio.eu"
  "notes.nettio.eu"
  "auth.nettio.eu"
)

STAGING_FLAG=""
if [[ "${CERTBOT_STAGING:-0}" == "1" ]]; then
  STAGING_FLAG="--staging"
  echo "[bootstrap-certs] CERTBOT_STAGING=1 — issuing UNTRUSTED staging certs"
fi

mkdir -p "$CONF_DIR" "$WWW_DIR"

echo "[bootstrap-certs] Stopping nginx so certbot can bind :80"
$COMPOSE stop nginx >/dev/null 2>&1 || true

for entry in "${CERTS[@]}"; do
  # shellcheck disable=SC2206
  domains=($entry)
  primary="${domains[0]}"

  if [[ -d "$CONF_DIR/live/$primary" ]]; then
    echo "[bootstrap-certs] $primary already has a cert — skipping"
    continue
  fi

  d_args=()
  for d in "${domains[@]}"; do d_args+=("-d" "$d"); done

  echo "[bootstrap-certs] Issuing $primary (${domains[*]})"
  docker run --rm \
    -p 80:80 \
    -v "$PWD/$CONF_DIR:/etc/letsencrypt" \
    -v "$PWD/$WWW_DIR:/var/www/certbot" \
    certbot/certbot certonly \
      --standalone \
      --non-interactive \
      --agree-tos \
      --no-eff-email \
      --email "$EMAIL" \
      $STAGING_FLAG \
      "${d_args[@]}"
done

echo "[bootstrap-certs] Done. Start the stack with:"
echo "  $COMPOSE up -d"
