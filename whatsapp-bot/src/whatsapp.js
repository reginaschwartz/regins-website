
import { config } from "./config.js";

function toPayload(to, reply) {
  if (!reply.buttons?.length) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: reply.text },
    };
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: reply.text },
      action: {
        buttons: reply.buttons.slice(0, 3).map(({ id, title }) => ({
          type: "reply",
          reply: { id, title: title.slice(0, 20) },
        })),
      },
    },
  };
}

export async function sendReply(to, reply) {
  const payload = toPayload(to, reply);

  if (config.dryRun) {
    console.log(`[dry-run] -> ${to}:`, JSON.stringify(payload.interactive || payload.text));
   # return { dryRun: true };
  }

  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp send failed (${response.status}): ${body}`);
  }

  return response.json();
}

export function parseIncoming(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];

  if (!message) {
    return null;
  }

  return {
    from: message.from,
    text: message.text?.body || message.interactive?.button_reply?.title,
    optionId: message.interactive?.button_reply?.id,
    profileName: value.contacts?.[0]?.profile?.name,
  };
}
