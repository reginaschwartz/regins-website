import crypto from "node:crypto";

import { advance } from "./engine.js";
import { getSession, saveSession } from "./sessions.js";

const WEB_SESSION =
  /^web-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveWebSessionId(raw) {
  if (typeof raw === "string" && WEB_SESSION.test(raw)) {
    return raw;
  }
  return `web-${crypto.randomUUID()}`;
}

export function handleChat({ sessionId, text, optionId } = {}) {
  const id = resolveWebSessionId(sessionId);
  const safeText = typeof text === "string" ? text.slice(0, 500) : "";
  const safeOption =
    typeof optionId === "string" ? optionId.slice(0, 40) : undefined;

  const result = advance(getSession(id), {
    text: safeText,
    optionId: safeOption,
  });
  saveSession(id, result.session);

  return {
    sessionId: id,
    replies: result.replies,
    done: Boolean(result.done),
  };
}
