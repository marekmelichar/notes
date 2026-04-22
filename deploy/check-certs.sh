#!/usr/bin/env bash
# Report expiry for every Let's Encrypt cert in deploy/certbot/conf/live/.
# Exits 1 if any cert expires within $WARN_DAYS (default 20). Suitable for cron.
#
# Usage (run on the VPS, from /opt/nettio):
#   bash deploy/check-certs.sh
#   WARN_DAYS=7 bash deploy/check-certs.sh

set -euo pipefail

WARN_DAYS="${WARN_DAYS:-20}"
LIVE_DIR="deploy/certbot/conf/live"
WARN_SECONDS=$(( WARN_DAYS * 86400 ))
now=$(date +%s)
status=0

if [[ ! -d "$LIVE_DIR" ]]; then
  echo "no certs found at $LIVE_DIR" >&2
  exit 1
fi

shopt -s nullglob
for cert in "$LIVE_DIR"/*/fullchain.pem; do
  domain=$(basename "$(dirname "$cert")")
  # $cert is a symlink into archive/ — openssl follows it transparently.
  not_after=$(openssl x509 -in "$cert" -noout -enddate | cut -d= -f2)
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
done

exit "$status"
