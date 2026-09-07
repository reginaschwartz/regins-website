import test from "node:test";
import assert from "node:assert/strict";

import { handleChat, resolveWebSessionId } from "../server/chat.js";

test("assigns a web session id when none is sent", () => {
  const result = handleChat({ text: "hi" });

  assert.match(result.sessionId, /^web-[0-9a-f-]{36}$/i);
  assert.match(result.replies[0].text, /What brings you here/);
  assert.equal(result.done, false);
});

test("rejects a forged session id and starts a new conversation", () => {
  const result = handleChat({ sessionId: "wa-972543077026", text: "hi" });

  assert.match(result.sessionId, /^web-/);
  assert.notEqual(result.sessionId, "wa-972543077026");
});

test("keeps a 3-step hiring path on the same session", () => {
  const first = handleChat({ text: "hello" });
  const second = handleChat({ sessionId: first.sessionId, optionId: "hiring" });
  const third = handleChat({ sessionId: first.sessionId, optionId: "contract" });

  assert.equal(first.sessionId, second.sessionId);
  assert.equal(second.sessionId, third.sessionId);
  assert.match(second.replies[0].text, /engagement/i);
  assert.match(third.replies[0].text, /area is closest/i);
  assert.equal(third.done, false);
});

test("resolveWebSessionId only accepts its own ids", () => {
  const kept = "web-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  assert.equal(resolveWebSessionId(kept), kept);
  assert.notEqual(resolveWebSessionId("not-a-session"), "not-a-session");
});
