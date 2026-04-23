#!/bin/sh
# certbot --deploy-hook: reload the edge nginx so it picks up new certs.
#
# Invoked by certbot from inside the certbot sidecar, once per renewed
# lineage, with:
#   RENEWED_LINEAGE  — path under /etc/letsencrypt/live/<domain>/
#   RENEWED_DOMAINS  — space-separated list of SANs
#
# nginx runs in a separate container. We reach it by sending SIGHUP via
# the docker socket mounted from the host at /var/run/docker.sock.
# SIGHUP = nginx graceful config+cert reload (no dropped connections).
#
# Security note: mounting /var/run/docker.sock into the certbot container
# is effectively root on the host. Acceptable trade-off here because
# certbot is an official image, the VPS is single-tenant, and the
# alternative (a separate inotify sidecar with the same socket) doesn't
# actually reduce exposure.

set -eu

NGINX_CONTAINER="${NGINX_CONTAINER:-nettio-nginx}"

if [ -z "${RENEWED_LINEAGE:-}" ]; then
  # Safety net: certbot should always set this when invoking a deploy-hook.
  # If it didn't, something ran us directly — bail rather than reload blindly.
  echo "[reload-nginx] RENEWED_LINEAGE empty; refusing to reload" >&2
  exit 1
fi

echo "[reload-nginx] cert renewed for: ${RENEWED_DOMAINS:-$RENEWED_LINEAGE}"
echo "[reload-nginx] sending SIGHUP to ${NGINX_CONTAINER}"

# `docker kill -s HUP` is the canonical way to trigger an nginx config
# reload; it does NOT stop the container.
if docker kill -s HUP "$NGINX_CONTAINER"; then
  echo "[reload-nginx] reload signal delivered"
else
  # Don't fail the whole renewal if reload fails — the new cert is on
  # disk and the next container restart will pick it up. But surface it
  # loudly so monitoring / logs flag it.
  echo "[reload-nginx] FAILED to signal ${NGINX_CONTAINER}; new cert on disk but nginx still serving old one" >&2
  exit 1
fi
