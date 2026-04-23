#!/usr/bin/env bash
# Report expiry for every Let's Encrypt cert in the certbot volume.
# Exits 1 if any cert expires within $WARN_DAYS (default 20). Cron-friendly.
#
# Runs against the certbot container rather than reading
# deploy/certbot/conf/live/ on the host: the host dir is 700 root:root
# (certbot writes as root inside the container), so reading it directly
# would need sudo. Execing into the container sidesteps that.
#
# Usage (run on the VPS, from /opt/nettio):
#   bash deploy/check-certs.sh
#   WARN_DAYS=7 bash deploy/check-certs.sh

set -euo pipefail

WARN_DAYS="${WARN_DAYS:-20}"
CERTBOT_CONTAINER="${CERTBOT_CONTAINER:-nettio-certbot}"
LIVE_DIR_IN_CONTAINER="/etc/letsencrypt/live"
WARN_SECONDS=$(( WARN_DAYS * 86400 ))
now=$(date +%s)
status=0

if ! docker inspect "$CERTBOT_CONTAINER" >/dev/null 2>&1; then
  echo "certbot container '$CERTBOT_CONTAINER' not found" >&2
  exit 1
fi

# List every lineage (one subdir per cert bundle). `ls -1` inside the
# container runs as root and can read the 700 dir.
domains=$(docker exec "$CERTBOT_CONTAINER" sh -c \
  "ls -1 $LIVE_DIR_IN_CONTAINER 2>/dev/null | grep -v '^README$' || true")

if [[ -z "$domains" ]]; then
  echo "no certs found in $CERTBOT_CONTAINER:$LIVE_DIR_IN_CONTAINER" >&2
  exit 1
fi

while read -r domain; do
  [[ -z "$domain" ]] && continue
  not_after=$(docker exec "$CERTBOT_CONTAINER" \
    openssl x509 -in "$LIVE_DIR_IN_CONTAINER/$domain/fullchain.pem" -noout -enddate \
    | cut -d= -f2)
  expiry=$(date -d "$not_after" +%s)
  left=$(( expiry - now ))
  days=$(( left / 86400 ))

  if (( left < 0 )); then
    printf '%-30s EXPIRED %d days ago (%s)\n' "$domain" $(( -days )) "$not_after"
    status=1
  elif (( left < WARN_SECONDS )); then
    printf '%-30s expires in %d days (%s)  <-- within warn window\n' "$domain" "$days" "$not_after"
    status=1
  else
    printf '%-30s ok, %d days left\n' "$domain" "$days"
  fi
done <<< "$domains"

exit "$status"
