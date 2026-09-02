# WhatsApp intake bot

A webhook for the WhatsApp Cloud API that runs a short branching conversation:
it asks why someone is getting in touch, then follows a different set of
questions per branch, and finishes with a summary.

The conversation lives in `src/flow.js`. The state machine in `src/engine.js` is
pure, so it can be tested and simulated without any Meta credentials.

## Try it without credentials

```bash
npm install
npm run simulate   # walk the conversation in the terminal
npm test           # covers every branch
```

## Conversation shape

```
                     ┌── Hiring ──── engagement ── focus area ── company + timeline ──┐
"What brings you     ├── Mentoring ─ career stage ─ goal ───────────────────────────  ├─ summary
 here?"              └── Something else ─ topic ─── details ─────────────────────────┘
```

Buttons are capped at three per message with 20-character labels, which is a
Cloud API limit, not a design choice.

## Connecting the real API

1. Create an app at [developers.facebook.com](https://developers.facebook.com/apps)
   (type: Business) and add the **WhatsApp** product.
2. Under **WhatsApp > API Setup**, note the **Phone number ID** and copy the
   temporary access token. The test number Meta gives you can only message
   numbers you add to the allow-list on that page.
3. `cp .env.example .env` and fill in the values. Invent any string for
   `WHATSAPP_VERIFY_TOKEN`.
4. Expose the service publicly. For local development:
   `ngrok http 3000`
5. In **WhatsApp > Configuration > Webhook**, set the callback URL to
   `https://<your-ngrok-domain>/webhook`, paste the same verify token, and
   subscribe to the **messages** field.
6. Message the business number from your own phone. The first reply should
   arrive within a second or two.

Swap the temporary token for a permanent one (Business Settings > System Users)
before relying on this: temporary tokens expire after 24 hours.

## Debugging

Fastest loop, no Docker and no Meta account:

```bash
npm run simulate   # walk the conversation
npm test           # all branches
npm run dev        # server with auto-restart on save
```

In Cursor, `F5` offers **Debug WhatsApp bot**, **Debug WhatsApp simulator**, and
**Debug WhatsApp tests** — breakpoints in `src/` bind directly.

Replay a webhook call without WhatsApp:

```bash
curl -X POST http://127.0.0.1:3000/webhook -H 'Content-Type: application/json' \
  -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"972500000000","type":"text","text":{"body":"hi"}}]}}]}]}'
```

If `WHATSAPP_APP_SECRET` is set, unsigned calls return 401. Sign them with:

```bash
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')"
```

Use `$NF`, not `$2`: OpenSSL 3 prints the bare digest when reading stdin.

To break inside the container, start it with the inspector exposed and use the
**Attach to bot in Docker** launch config:

```bash
docker run --rm -p 3000:3000 -p 9229:9229 regins-whatsapp-bot:latest \
  node --inspect=0.0.0.0:9229 src/server.js
  
  
docker run --rm \
  -p 3000:3000 -p 9229:9229 \
  --env-file /Users/reginaschwartz/projects/regins-website/whatsapp-bot/env.env \
  regins-whatsapp-bot:latest \
  node --inspect=0.0.0.0:9229 src/server.js
```

When real traffic is flowing, `http://127.0.0.1:4040` (ngrok's inspector) shows
every request Meta sent and can replay them, which beats making someone message
the number again.

## Notes

- Sessions are held in memory and expire after 24 hours, matching the Cloud API
  customer service window. Outside that window only approved templates can be
  sent, which this bot does not use — it only ever replies to an inbound message.
- Webhook signatures are verified against `WHATSAPP_APP_SECRET` when it is set.
- Meta's 2026 policy allows task-specific assistants like this one; general
  purpose AI chatbots are not permitted on the platform.
