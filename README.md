# Regina's website

One Node process serves the HTML site and the WhatsApp webhook.

```bash
docker-compose up -d --build
```

Then open `http://<host>:9000`. Meta webhook URL: `https://<host>/webhook` (or `http://<host>:9000/webhook` if you terminate TLS elsewhere).

Env file: `env.env` in this directory (not baked into the image).

```bash
npm test
npm run simulate
```
