# Security review notes

Review date: 2026-10-16. This records scoped checks, not a penetration test.

## Current application

The site is the jack.exe portfolio only. `/lab`, `/blogs` and the duplicate
`/projects` page are removed. Project information and keyword routing are local;
there are no AI model calls, blog feeds, repository API requests, Server Actions
or application credentials. AI-related descriptions of portfolio projects are
ordinary text, not running integrations.

Genkit, its CLI, 3D renderers, the unused UI kit, theme/toast providers and
Tailwind were removed along with their dependencies. The interface uses React
and plain CSS. Next.js is pinned to 15.5.28, and its nested PostCSS is overridden
with the compatible root PostCSS dependency (8.5.30 in this lockfile).

## Headers and hosting

Next.js applies CSP, MIME-sniffing protection, frame restrictions, a referrer
policy and browser permission restrictions on both Vercel and self-hosting.
The CSP permits inline hydration scripts and styles; it is not a strict
nonce/hash-based policy. Production does not permit eval, external images or
web workers. Google Fonts remain optional external resources.

Self-hosted nginx constrains requests, connections and body sizes, sanitizes
forwarded headers, disables unsolicited websocket upgrades and does not cache
HTML/RSC responses. Containers run with restricted users, capabilities,
filesystems and resources. HTTPS setup and renewal scripts are documented in
DEPLOYMENT.md. Real certificate issuance, renewal and timer installation require
the owner's domain and server; no DNS or production service was changed here.

## Dependency audit

The current committed dependency graph reports **0 npm audit findings** at all
severity levels, including development dependencies. The original full graph
reported 117 affected packages; the intermediate security pass reported 74.
Removing the unused systems eliminated the remaining flagged dependency chains.
CI now fails on any npm advisory, rather than allowing existing high/moderate
findings. Audit results describe known registry advisories at a point in time,
not the absence of all vulnerabilities. Reproduce with `npm ci` and `npm audit`.

## Verification

Local checks cover unit/DOM behavior, TypeScript, the production build, home and
removed-route responses, security headers, internal section links in markup and
an empty Server Actions manifest. The native nginx smoke test checks isolated
HTTP/TLS behavior with an ephemeral self-signed certificate.

GitHub Actions additionally checks real Docker HTTP/HTTPS containers, restricted
certificate-key access, redirects and HSTS. The browser smoke test checks real
Chrome at desktop/mobile widths, input, pinning, keyboard controls and internal
section links, with optional external fonts blocked. Check the latest CI result
before merging; this document describes the checks, not a substitute for them.

Live ACME issuance, renewal dry-run/timer installation, image vulnerability scans
and a manual visual review remain outside these checks.
