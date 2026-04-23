#!/bin/sh
# Renew loop for the certbot sidecar.
#
# Wraps `certbot renew` so (a) the logic is readable (vs. a one-line shell
# loop in docker-compose.prod.yml) and (b) renewal invokes the reload hook
# via certbot's own --deploy-hook — which fires per-lineage ONLY when a
# cert is actually renewed. Previous inline loop never signalled nginx,
# so fresh certs on disk coexisted with stale in-memory certs.
#
# Runs inside the certbot/certbot container. Mounted into the container
# at /usr/local/bin/certbot-renew.sh; set as the entrypoint in
# docker-compose.prod.yml.

set -eu

RENEW_INTERVAL="${RENEW_INTERVAL:-43200}"  # 12h
DEPLOY_HOOK="${DEPLOY_HOOK:-/usr/local/bin/reload-nginx.sh}"

trap 'echo "[certbot-renew] received TERM, exiting"; exit 0' TERM INT

# The certbot/certbot image is stock alpine + certbot — no docker CLI.
# The deploy hook needs one to send SIGHUP to the nginx container.
# Install once at container start; negligible cost (~5s on first run,
# cached on restart).
if ! command -v docker >/dev/null 2>&1; then
  echo "[certbot-renew] installing docker-cli (needed by deploy hook)"
  apk add --no-cache docker-cli >/dev/null
fi

echo "[certbot-renew] starting renew loop (interval=${RENEW_INTERVAL}s, deploy-hook=${DEPLOY_HOOK})"

while :; do
  echo "[certbot-renew] $(date -u +%FT%TZ) running certbot renew"

  # --deploy-hook runs per-renewed-lineage with $RENEWED_LINEAGE set.
  # Absence of renewal = hook never fires = no reload churn.
  if certbot renew --deploy-hook "$DEPLOY_HOOK" --quiet; then
    echo "[certbot-renew] renew pass ok"
  else
    # certbot returns non-zero on per-cert failures but keeps going for
    # the rest. Log and continue the loop — next pass in RENEW_INTERVAL.
    echo "[certbot-renew] renew pass reported errors (see certbot logs)" >&2
  fi

  sleep "$RENEW_INTERVAL" &
  wait $!
done
