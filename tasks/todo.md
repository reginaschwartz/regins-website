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

# WhatsApp

- [x] "Chat on WhatsApp" CTA in the contact section, prefilled message
- [x] Pixel tracks wa.me clicks as Contact / WhatsApp
- [x] Node + Express webhook in `whatsapp-bot/` with a branching intake flow
- [x] Pure state machine, 6 unit tests, terminal simulator
- [x] Dry-run mode so the flow runs with no Meta credentials
- [x] Second compose service, healthchecked
- [x] Verified: full conversation through the webhook, verify handshake,
      signature accept/reject

## Review

The engine is a pure function of (session, input), which is why the flow can be
tested and simulated without touching the Cloud API. Sessions are in-memory,
matching the 24h service window; Redis only becomes necessary with >1 replica.

Still needs from Meta: app, WhatsApp Business number, phone number ID, token,
and a public HTTPS webhook (ngrok locally). Steps in `whatsapp-bot/README.md`.

# CloudFront API origin

- [x] Diagnose 403 on `https://testec2.rinatschwartz770.xyz/api/webhook`
- [x] Point `api/*` origin at EC2 public DNS `:3000` (CloudFront rejects raw IPs)
- [x] Wait until distribution `E21BHV4UQ0NX7K` is Deployed
- [x] Verify `/api/healthz` and Meta webhook verify over HTTPS
- [x] Confirm `/index.html` still comes from S3

## Review

`api/*` was looping back to CloudFront on port 80. Origin is now
`ec2-51-21-198-86.eu-north-1.compute.amazonaws.com:3000` (http-only).
S3 remains the default origin. If the instance public DNS changes after a
stop/start, this origin must be updated again — a stable hostname would be better.

# On-site bot chat

- [x] Replace wa.me CTA with a button that opens an on-page chat
- [x] POST `/api/chat` using the same `advance()` engine as the WhatsApp webhook
- [x] Show bot replies + choice buttons and accept typed answers
- [x] Pixel tracks opening the chat as Contact
- [x] Tests for the chat handler
- [x] Verify a 2–3 step hiring/mentoring path against the local server

## Review

`wa.me` opened personal WhatsApp and never reached Node. The contact CTA now
opens an on-page chat that POSTs to `/api/chat`, which is the same `advance()`
state machine the WhatsApp webhook uses. Live site still needs a static deploy
to S3 and a container rebuild so CloudFront serves the new HTML and `/api/chat`.
