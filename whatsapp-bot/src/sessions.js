import { config } from "./config.js";

// In-memory is fine for one container: WhatsApp conversations are short and the
// service window is 24h anyway. Swap for Redis if you ever run more than one replica.
const sessions = new Map();

export function getSession(waId) {
  const session = sessions.get(waId);
  if (!session) {
    return null;
  }

  if (Date.now() - session.updatedAt > config.sessionTtlMs) {
    sessions.delete(waId);
    return null;
  }

  return session;
}

export function saveSession(waId, session) {
  if (!session.node) {
    sessions.delete(waId);
    return;
  }
  sessions.set(waId, session);
}

export function sessionCount() {
  return sessions.size;
}
