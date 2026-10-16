# jack.exe

VectorSophie's portfolio: a retro desktop with project cards and an interactive,
local keyword-routing visualization. It uses Next.js, React and plain CSS.
There are no AI API calls, blog feeds or external repository fetches.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. No API key or environment file is needed.
The old `/lab`, `/blogs` and `/projects` pages have been removed; projects live
in the homepage's `experts.idx` window.

## Check and build

```sh
npm test
npm run typecheck
npm run build
npm run test:security
```

Docker/nginx/HTTPS deployment and renewal steps are in DEPLOYMENT.md.
Security configuration and verification limits are in SECURITY.md.
