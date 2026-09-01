# Homepage plan

- [x] Pull expertise and LinkedIn from resume
- [x] Mirror nivitzhaky.com layout: hero, experience years, expert-in tags, contact
- [x] Add "Go to LinkedIn" caption linking to the resume URL
- [x] Build HTML + JavaScript homepage
- [x] Verify the page in the browser

# Docker packaging

- [x] Dockerfile serving the static site with nginx
- [x] nginx config: gzip, asset caching, security headers, /healthz
- [x] docker-compose.yml with configurable WEB_PORT (default 8081, since 8080 is taken by HA019)
- [x] .dockerignore excluding Maven/IDE files
- [x] Verified: build, container healthy, HTML/CSS/JS return 200, JS renders all sections

## Review

The site is static, so the image is a single nginx layer with no build step —
nothing to compile, and the container starts in about a second.
`add_header` inside the asset location was dropping the inherited security
headers; using only `expires` keeps them intact.

Run with: `docker compose up -d --build` then open http://localhost:8081
Override the port with `WEB_PORT=9000 docker compose up -d`.

# Meta Pixel adoption

- [x] `js/pixel.js`: base code, consent gate, standard + custom events
- [x] Consent banner styled with the existing design tokens
- [x] Verified in Chrome: no consent = no request to connect.facebook.net,
      declined = nothing loads, granted = fbevents.js loads and
      PageView / ViewContent / Lead / Contact / ScrollDepth all fire

## Review

The pixel library is only injected after consent, so a first-time visitor
triggers zero third-party requests. Meta's `fbq('consent','revoke')` API is the
alternative, but it still loads fbevents.js up front.

Set `PIXEL_CONFIG.pixelId` in `js/pixel.js` to go live. Until then the module
stays in console-log mode so events can be checked without a real pixel.
