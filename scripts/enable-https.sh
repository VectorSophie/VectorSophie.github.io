#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
: "${SITE_DOMAIN:?Export SITE_DOMAIN (your own DNS hostname)}"
: "${LETSENCRYPT_EMAIL:?Export LETSENCRYPT_EMAIL}"
# Restrict substitution to a DNS name, not nginx syntax, URLs or shell options.
case "$SITE_DOMAIN" in ''|*[!A-Za-z0-9.-]*|.*|-*|*..*|*.) echo 'Invalid SITE_DOMAIN' >&2; exit 1;; esac
case "$SITE_DOMAIN" in *.*) ;; *) echo 'Use a public DNS hostname' >&2; exit 1;; esac
export SITE_DOMAIN
# This is a one-time bootstrap. Do not replace a working TLS gateway with HTTP.
if docker compose -f docker-compose.yml -f docker-compose.https.yml exec -T nginx test -f /etc/nginx/conf.d/default.conf 2>/dev/null \
  && docker compose exec -T nginx sh -c 'grep -q "listen 8443 ssl" /etc/nginx/conf.d/default.conf'; then
  echo 'HTTPS is already enabled; use scripts/renew-certificates.sh.' >&2
  exit 1
fi
docker compose up -d --build nextjs nginx
docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot \
  --cert-name portfolio --domain "$SITE_DOMAIN" --email "$LETSENCRYPT_EMAIL" \
  --agree-tos --non-interactive --deploy-hook '/bin/sh /hooks/cert-permissions.sh'
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d nginx
docker compose -f docker-compose.yml -f docker-compose.https.yml exec -T nginx nginx -t
printf 'HTTPS configured for %s. Install the renewal timer described in DEPLOYMENT.md.\n' "$SITE_DOMAIN"
