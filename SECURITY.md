# Security review notes

Review date: 2026-10-16. These are scoped checks, not a penetration-test report.

## Changes in this branch

- Next.js 15.3.8 -> 15.5.28, the patched 15.x version in the October 14 advisory.
  The associated image-processing update is included. External SVG optimization
  is disabled. Next.js's nested PostCSS is overridden to the root compatible
  8.x dependency; the clean lockfile installs PostCSS 8.5.30.
- Removed unused Firebase, Next/Genkit adapter and patch-package dependencies;
  refreshed compatible dependencies without forcing framework major upgrades.
- CSP, frame restrictions, MIME sniffing protection, referrer and browser
  permission policies apply in Next.js on either hosting path. The CSP still
  permits inline scripts/styles required by the current static hydration and
  styling approach. It is not a nonce/hash-based strict CSP. Production does
  not allow eval. Verify visual behavior in a browser before merging.
- Blog helpers are server-only modules, not public Server Actions. AI summaries
  default off; optional calls use bounded inputs/outputs and a daily cache.
  Build verification checks the public Server Actions manifest is empty.
- External data fetches have eight-second timeouts and one-hour cache windows.
  Velog uses GraphQL variables and bounded profile/limit inputs. Naver post links
  are restricted to expected HTTPS blog hosts; Velog URL segments are encoded.
- Self-hosted nginx limits requests/connections/body sizes, disables unsolicited
  websocket upgrades, overwrites forwarded client headers and does not cache
  HTML/RSC responses. There is no blanket immutable cache header for errors.
- Containers have constrained users, capabilities, filesystems and resources.
  TLS setup, certificate key permissions, renewal scripts and systemd units are
  provided. They require a real owned domain and installation on the server.

## Dependency findings still open

After a clean install, npm audit reports **74 affected packages**: 0 critical,
18 high and 56 moderate. With `--omit=dev`, it reports **69 affected packages**:
0 critical, 13 high and 56 moderate. The original full graph reported 117
packages, including 5 critical and 39 high. These are package-level reports,
including transitive/metavulnerability counts, not counts of independently
exploitable vulnerabilities. Production dependency classification alone does
not establish whether a package is in the standalone runtime bundle or reachable.

Remaining findings primarily involve Genkit/OpenTelemetry/Google Cloud chains,
Genkit development tooling, and Tailwind 3/glob dependencies. In particular,
there are gRPC certificate-context and OpenTelemetry denial-of-service reports.
Do not interpret the lack of critical findings as a clean security audit.
Resolving all chains needs upstream compatible releases or separately tested
framework/tooling migrations. This branch does not force incompatible major
versions or hide the reports. CI currently gates on critical production findings
and prints the remaining warnings; it is not a zero-vulnerability gate.

Reproduce with `npm audit` and `npm audit --omit=dev` against the committed
lockfile. Advisory databases change, so later counts can differ. Build output
also retains a Genkit/OpenTelemetry optional Jaeger-exporter resolution warning;
Jaeger tracing is not configured or tested here. ESLint remains skipped by the
existing configuration.

## Validation and limits

Confirmed locally: clean `npm ci`, unit/DOM tests, TypeScript, production build,
standalone HTTP/404 security headers, empty Server Actions manifest, and native
nginx 1.30.6 HTTP/TLS smoke tests using an ephemeral self-signed certificate.
The native nginx test uses an isolated single process, not a Docker container.
Compose YAML and shell scripts were parsed/checked.

Docker Engine is unavailable in the editing environment. CI is configured to
validate merged Compose configuration, build the image, start real HTTP
containers and test HTTPS with a disposable self-signed certificate. Check its result before merging. ACME production issuance, renewal
dry-run, installed renewal timer, image vulnerability scans, provider quotas,
live external data and full browser visual behavior remain unverified. No
production hosting, DNS, certificate issuance or system services were changed.
