import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { advance } from "./engine.js";

// Walks the same engine the webhook uses, so the flow can be tried without
// any Meta credentials: npm run simulate
const rl = readline.createInterface({ input: stdin, output: stdout });
let session = null;

function render(replies) {
  for (const reply of replies) {
    console.log(`\nbot: ${reply.text}`);
    if (reply.buttons) {
      console.log(reply.buttons.map((b, i) => `  [${i + 1}] ${b.title}`).join("\n"));
    }
  }
}

function toInput(answer, replies) {
  const buttons = replies.at(-1)?.buttons;
  const index = Number(answer);

  if (buttons && Number.isInteger(index) && buttons[index - 1]) {
    return { optionId: buttons[index - 1].id, text: buttons[index - 1].title };
  }

  return { text: answer };
}

let result = advance(session, { text: "hi" });
session = result.session;
render(result.replies);

while (true) {
  const answer = await rl.question("\nyou: ");
  if (answer.trim().toLowerCase() === "quit") {
    break;
  }

  result = advance(session, toInput(answer, result.replies));
  session = result.session;
  render(result.replies);

  if (result.done) {
    console.log("\n--- conversation finished, say anything to start again ---");
  }
}

rl.close();
