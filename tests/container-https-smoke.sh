#!/bin/sh
# CI-only: populate an isolated Compose volume with a disposable test certificate.
set -eu
[ "${CI:-}" = true ] || { echo 'Run only on a disposable CI runner.' >&2; exit 1; }
cd "$(dirname "$0")/.."
export SITE_DOMAIN=portfolio.example.com HTTP_PORT=8080 HTTPS_PORT=8443
cert_dir=$(mktemp -d)
trap 'rm -rf "$cert_dir"' EXIT HUP INT TERM
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=$SITE_DOMAIN" \
  -keyout "$cert_dir/privkey.pem" -out "$cert_dir/fullchain.pem" >/dev/null 2>&1
tar -C "$cert_dir" -cf - fullchain.pem privkey.pem | \
  docker compose run --rm -T --entrypoint sh certbot -c '
    set -eu
    mkdir -p /etc/letsencrypt/archive/portfolio /etc/letsencrypt/live/portfolio
    tar --no-same-owner -xf - -C /etc/letsencrypt/archive/portfolio
    ln -sf ../../archive/portfolio/fullchain.pem /etc/letsencrypt/live/portfolio/fullchain.pem
    ln -sf ../../archive/portfolio/privkey.pem /etc/letsencrypt/live/portfolio/privkey.pem
    sh /hooks/cert-permissions.sh
  '
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --wait --wait-timeout 120 nginx
docker compose -f docker-compose.yml -f docker-compose.https.yml exec -T nginx nginx -t
# --insecure is confined to this self-signed fixture, never production bootstrap.
curl --insecure --fail --silent --show-error --tlsv1.2 --tls-max 1.2 \
  -D "$cert_dir/headers" -o /dev/null https://127.0.0.1:8443/
grep -qi '^strict-transport-security: max-age=15552000' "$cert_dir/headers"
grep -qi '^x-frame-options: DENY' "$cert_dir/headers"
curl --silent --show-error -D "$cert_dir/redirect" -o /dev/null http://127.0.0.1:8080/probe
grep -qi '^location: https://portfolio.example.com/probe' "$cert_dir/redirect"
printf 'Container TLS, certificate group permissions, HSTS and redirect passed.\n'
