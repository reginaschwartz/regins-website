const SESSION_KEY = "regina-bot-session";
const chatRoot = document.getElementById("assistant-dialog");
const logEl = document.getElementById("assistant-log");
const formEl = document.getElementById("assistant-form");
const inputEl = document.getElementById("assistant-input");
const openBtn = document.getElementById("open-assistant");
const closeBtn = document.getElementById("close-assistant");

let busy = false;
let started = false;

function sessionId() {
  try {
    return sessionStorage.getItem(SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function storeSession(id) {
  try {
    sessionStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatText(text) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function appendBubble(role, text, buttons = []) {
  const article = document.createElement("article");
  article.className = `assistant-bubble assistant-bubble-${role}`;
  article.innerHTML = `<p>${formatText(text)}</p>`;

  if (buttons.length) {
    const row = document.createElement("div");
    row.className = "assistant-choices";
    buttons.forEach((button) => {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.className = "assistant-choice";
      choice.dataset.optionId = button.id;
      choice.textContent = button.title;
      row.appendChild(choice);
    });
    article.appendChild(row);
  }

  logEl.appendChild(article);
  logEl.scrollTop = logEl.scrollHeight;
}

function setBusy(next) {
  busy = next;
  inputEl.disabled = next;
  formEl.querySelector("button[type='submit']").disabled = next;
}

function lockChoices() {
  logEl.querySelectorAll(".assistant-choice").forEach((button) => {
    button.disabled = true;
  });
}

function openChat() {
  chatRoot.hidden = false;
  document.body.classList.add("assistant-open");
  openBtn.setAttribute("aria-expanded", "true");
  inputEl.focus();

  if (!started) {
    started = true;
    sendTurn({ text: "hi" }, { silent: true });
  }
}

function closeChat() {
  chatRoot.hidden = true;
  document.body.classList.remove("assistant-open");
  openBtn.setAttribute("aria-expanded", "false");
  openBtn.focus();
}

async function sendTurn(payload, { silent = false } = {}) {
  if (busy) {
    return;
  }

  if (!silent && payload.text) {
    appendBubble("user", payload.text);
  }
  if (!silent && payload.optionTitle) {
    appendBubble("user", payload.optionTitle);
  }

  lockChoices();
  setBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId(),
        text: payload.text || "",
        optionId: payload.optionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed (${response.status})`);
    }

    const data = await response.json();
    if (data.sessionId) {
      storeSession(data.sessionId);
    }

    (data.replies || []).forEach((reply) => {
      appendBubble("bot", reply.text, reply.buttons || []);
    });
  } catch (error) {
    appendBubble(
      "bot",
      "I could not reach the assistant just now. Please try again in a moment."
    );
    console.error(error);
  } finally {
    setBusy(false);
    inputEl.focus();
  }
}

openBtn?.addEventListener("click", openChat);
closeBtn?.addEventListener("click", closeChat);

chatRoot?.addEventListener("click", (event) => {
  if (event.target === chatRoot) {
    closeChat();
  }
});

logEl?.addEventListener("click", (event) => {
  const choice = event.target.closest(".assistant-choice");
  if (!choice || busy) {
    return;
  }
  sendTurn({
    optionId: choice.dataset.optionId,
    optionTitle: choice.textContent,
  });
});

formEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) {
    return;
  }
  inputEl.value = "";
  sendTurn({ text });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !chatRoot.hidden) {
    closeChat();
  }
});
