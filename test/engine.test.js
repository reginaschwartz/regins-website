import test from "node:test";
import assert from "node:assert/strict";

import { advance } from "../server/engine.js";

function run(inputs) {
  let session = null;
  let result;

  for (const input of inputs) {
    result = advance(session, input);
    session = result.session;
  }

  return result;
}

test("greets a new contact with the intent question", () => {
  const result = advance(null, { text: "hello" });

  assert.match(result.replies[0].text, /What brings you here/);
  assert.deepEqual(
    result.replies[0].buttons.map((b) => b.id),
    ["hiring", "mentoring", "other"]
  );
});

test("hiring branch asks follow-ups then summarises", () => {
  const result = run([
    { text: "hi" },
    { optionId: "hiring" },
    { optionId: "contract" },
    { optionId: "cloud" },
    { optionId: "lead" },
    { optionId: "remote" },
    { optionId: "month" },
    { text: "Acme, payments team" },
  ]);

  assert.equal(result.done, true);
  assert.match(result.replies[0].text, /Engagement: Contract/);
  assert.match(result.replies[0].text, /Focus area: Cloud \/ K8s/);
  assert.match(result.replies[0].text, /Seniority: Tech lead/);
  assert.match(result.replies[0].text, /Location: Remote/);
  assert.match(result.replies[0].text, /Start: Within a month/);
  assert.match(result.replies[0].text, /Acme, payments team/);
});

test("mentoring branch continues through stack and cadence", () => {
  const result = run([
    { text: "hi" },
    { optionId: "mentoring" },
    { optionId: "switcher" },
    { optionId: "interviews" },
    { optionId: "java" },
    { optionId: "weekly" },
    { text: "Land a backend role" },
  ]);

  assert.equal(result.done, true);
  assert.match(result.replies[0].text, /Career stage: Career switcher/);
  assert.match(result.replies[0].text, /Help with: Interviews/);
  assert.match(result.replies[0].text, /Stack: Java \/ Spring/);
  assert.match(result.replies[0].text, /Cadence: Weekly/);
});

test("something-else branch asks urgency and scale", () => {
  const result = run([
    { text: "hi" },
    { optionId: "other" },
    { optionId: "architecture" },
    { optionId: "soon" },
    { optionId: "platform" },
    { text: "Need a review of our Kafka topology" },
  ]);

  assert.equal(result.done, true);
  assert.match(result.replies[0].text, /Topic: Architecture/);
  assert.match(result.replies[0].text, /Urgency: This month/);
  assert.match(result.replies[0].text, /Scale: Whole platform/);
});

test("unrecognised answer re-asks without losing the position", () => {
  let session = advance(null, { text: "hi" }).session;
  const result = advance(session, { text: "banana" });

  assert.equal(result.done, false);
  assert.equal(result.session.node, "intent");
  assert.match(result.replies[0].text, /tap one of the buttons/);
});

test("typing a button label works as well as tapping it", () => {
  const result = run([{ text: "hi" }, { text: "mentoring" }]);

  assert.equal(result.session.node, "mentoring_stage");
});

test("restart returns to the first question mid-conversation", () => {
  const result = run([
    { text: "hi" },
    { optionId: "hiring" },
    { text: "restart" },
  ]);

  assert.equal(result.session.node, "intent");
  assert.deepEqual(result.session.answers, {});
});
