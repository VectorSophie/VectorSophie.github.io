#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
: "${SITE_DOMAIN:?Export SITE_DOMAIN, or set it in the timer environment file}"
export SITE_DOMAIN
# Optional --dry-run validates renewal against the ACME staging service.
case "${1:-}" in ''|--dry-run) ;; *) echo 'Usage: renew-certificates.sh [--dry-run]' >&2; exit 1;; esac
docker compose run --rm certbot renew --non-interactive ${1:+"$1"} \
  --deploy-hook '/bin/sh /hooks/cert-permissions.sh'
# Reload only after successful renewal and configuration validation.
docker compose -f docker-compose.yml -f docker-compose.https.yml exec -T nginx nginx -t
docker compose -f docker-compose.yml -f docker-compose.https.yml exec -T nginx nginx -s reload
