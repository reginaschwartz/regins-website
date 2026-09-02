import { flow, LABELS, CLOSING, START_NODE } from "./flow.js";

export function newSession() {
  return { node: null, answers: {}, updatedAt: Date.now() };
}

function ask(nodeId) {
  const node = flow[nodeId];
  return {
    text: node.prompt,
    buttons: node.options?.map(({ id, title }) => ({ id, title })),
  };
}

function summarise(answers) {
  const lines = Object.entries(answers).map(
    ([nodeId, answer]) => `• ${LABELS[nodeId] || nodeId}: ${answer.label}`
  );
  return lines.join("\n");
}

function resolveChoice(node, input) {
  if (node.expect === "text") {
    const value = input.text?.trim();
    return value ? { label: value, next: node.next } : null;
  }

  const byId = node.options.find((option) => option.id === input.optionId);
  if (byId) {
    return { label: byId.title, next: byId.next };
  }

  // Someone typed instead of tapping: accept an exact title match, case-insensitive.
  const typed = input.text?.trim().toLowerCase();
  const byTitle = node.options.find(
    (option) => option.title.toLowerCase() === typed
  );
  return byTitle ? { label: byTitle.title, next: byTitle.next } : null;
}

// Pure state transition: no network, no clock beyond the timestamp, so the
// whole conversation can be replayed in tests and in the simulator.
export function advance(session, input) {
  const restarting = input.text?.trim().toLowerCase() === "restart";

  if (!session || !session.node || restarting) {
    const fresh = newSession();
    fresh.node = START_NODE;
    return { session: fresh, replies: [ask(START_NODE)], done: false };
  }

  const node = flow[session.node];
  const choice = resolveChoice(node, input);

  if (!choice) {
    return {
      session,
      replies: [
        {
          text: node.options
            ? "Sorry, I did not catch that. Please tap one of the buttons."
            : "Sorry, I did not catch that. Could you type a short answer?",
          buttons: node.options?.map(({ id, title }) => ({ id, title })),
        },
      ],
      done: false,
    };
  }

  const answers = { ...session.answers, [session.node]: { label: choice.label } };
  const nextNode = flow[choice.next];

  if (nextNode.end) {
    return {
      session: { node: null, answers: {}, updatedAt: Date.now() },
      replies: [
        { text: `${nextNode.prompt}\n${summarise(answers)}` },
        { text: CLOSING },
      ],
      done: true,
      answers,
    };
  }

  return {
    session: { node: choice.next, answers, updatedAt: Date.now() },
    replies: [ask(choice.next)],
    done: false,
  };
}
