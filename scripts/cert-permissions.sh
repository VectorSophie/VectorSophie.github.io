#!/bin/sh
set -eu
# Certbot remains root; nginx reads keys as UID/GID 101, without world access.
# -h avoids following symlinks and changing unrelated targets.
chgrp -hR 101 /etc/letsencrypt/live /etc/letsencrypt/archive
chmod 0750 /etc/letsencrypt/live /etc/letsencrypt/archive \
  /etc/letsencrypt/live/portfolio /etc/letsencrypt/archive/portfolio
chmod 0640 /etc/letsencrypt/archive/portfolio/privkey*.pem
