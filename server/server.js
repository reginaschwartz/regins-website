import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import { config, dryRunReason } from "./config.js";
import { advance } from "./engine.js";
import { getSession, saveSession, sessionCount } from "./sessions.js";
import { parseIncoming, sendReply } from "./whatsapp.js";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

function signatureValid(req) {
  if (!config.appSecret) {
    return true;
  }

  const header = req.get("X-Hub-Signature-256");
  if (!header) {
    return false;
  }

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", config.appSecret).update(req.rawBody).digest("hex");

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    sessions: sessionCount(),
    dryRun: config.dryRun,
    dryRunReason: dryRunReason(),
    hasAccessToken: Boolean(config.accessToken),
    hasPhoneNumberId: Boolean(config.phoneNumberId),
    hasAppSecret: Boolean(config.appSecret),
    phoneNumberIdLooksLikePhone: /^\d{9,12}$/.test(config.phoneNumberId),
  });
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];

  if (mode === "subscribe" && token === config.verifyToken) {
    res.status(200).send(req.query["hub.challenge"]);
    return;
  }

  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  if (!signatureValid(req)) {
    res.sendStatus(401);
    return;
  }

  res.sendStatus(200);

  const incoming = parseIncoming(req.body);
  if (!incoming) {
    console.log("webhook POST ignored (status/echo, not a user message)");
    return;
  }

  console.log("inbound message", { from: incoming.from, text: incoming.text, optionId: incoming.optionId });

  const { session, replies, done, answers } = advance(getSession(incoming.from), incoming);
  saveSession(incoming.from, session);

  for (const reply of replies) {
    try {
      await sendReply(incoming.from, reply);
    } catch (error) {
      console.error("send failed:", error.message);
    }
  }

  if (done) {
    console.log("intake complete", {
      from: incoming.from,
      name: incoming.profileName,
      answers: Object.fromEntries(
        Object.entries(answers).map(([node, value]) => [node, value.label])
      ),
    });
  }
});

app.use("/css", express.static(path.join(rootDir, "css")));
app.use("/js", express.static(path.join(rootDir, "js")));
app.get(["/", "/index.html"], (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.listen(config.port, () => {
  const reason = dryRunReason();
  console.log(
    `regins-website listening on :${config.port} (dryRun=${config.dryRun}${reason ? `, ${reason}` : ""}, graph=${config.graphVersion})`
  );
  if (/^\d{9,12}$/.test(config.phoneNumberId)) {
    console.warn(
      "WHATSAPP_PHONE_NUMBER_ID looks like a phone number. Use the 15+ digit ID from WhatsApp > API Setup, not 054..."
    );
  }
});
