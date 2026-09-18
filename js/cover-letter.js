// Locally the Python service listens on its own port; in production the page
// and the API share an origin, so the base stays empty there.
const LOCAL_API_BASE = "http://localhost:8000";
const isLocalHost = ["localhost", "127.0.0.1"].includes(location.hostname);

const API_BASE = (
  new URLSearchParams(location.search).get("api") ||
  window.COVER_LETTER_API_BASE ||
  (isLocalHost ? LOCAL_API_BASE : "")
).replace(/\/$/, "");

const form = document.getElementById("cover-letter-form");
const jobField = document.getElementById("job-description");
const resumeField = document.getElementById("resume-text");
const labelField = document.getElementById("company-label");
const fileField = document.getElementById("resume-file");
const submitBtn = document.getElementById("generate");
const errorEl = document.getElementById("form-error");

const resultEl = document.getElementById("result");
const letterEl = document.getElementById("letter");
const badgeEl = document.getElementById("backend-badge");
const stepsEl = document.getElementById("agent-steps");
const downloadEl = document.getElementById("download-zip");
const copyBtn = document.getElementById("copy-letter");

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function renderSteps(steps) {
  stepsEl.innerHTML = "";

  steps.forEach((step) => {
    const item = document.createElement("li");
    item.className = step.error ? "step step-failed" : "step";

    const name = document.createElement("code");
    name.textContent = step.tool;
    item.appendChild(name);

    const detail = document.createElement("span");
    detail.textContent = step.error
      ? ` — ${step.error}`
      : ` — ${describe(step.result)}`;
    item.appendChild(detail);

    stepsEl.appendChild(item);
  });
}

function describe(result) {
  if (!result) {
    return "done";
  }
  if (result.name) {
    return result.bytes ? `${result.name} (${result.bytes} bytes)` : result.name;
  }
  if (result.copied_to) {
    return `copied to ${result.copied_to.split("/").pop()}`;
  }
  if (result.document) {
    return result.document.split("/").pop();
  }
  return "done";
}

fileField?.addEventListener("change", async () => {
  const file = fileField.files?.[0];
  if (!file) {
    return;
  }
  try {
    resumeField.value = await file.text();
    showError("");
  } catch (error) {
    showError(`Could not read that file: ${error.message}`);
  }
});

copyBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(letterEl.textContent);
    copyBtn.textContent = "Copied";
    setTimeout(() => {
      copyBtn.textContent = "Copy text";
    }, 1500);
  } catch {
    showError("Clipboard is blocked in this browser. Select the text instead.");
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");

  submitBtn.disabled = true;
  submitBtn.textContent = "Writing…";

  try {
    const response = await fetch(`${API_BASE}/pyapi/cover-letter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: jobField.value.trim(),
        resumeText: resumeField.value.trim(),
        label: labelField.value.trim(),
      }),
    });

    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.detail || `Request failed (${response.status})`);
    }

    const data = await response.json();
    letterEl.textContent = data.letter;
    badgeEl.textContent = `${data.backend} · plan: ${data.plannedBy}`;
    renderSteps(data.steps || []);

    if (data.downloadUrl) {
      downloadEl.href = `${API_BASE}${data.downloadUrl}`;
      downloadEl.hidden = false;
    } else {
      downloadEl.hidden = true;
    }

    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showError(`${error.message}. Is the cover letter API running?`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Write the letter";
  }
});

document.getElementById("year").textContent = String(new Date().getFullYear());

document.querySelector(".nav-toggle")?.addEventListener("click", (event) => {
  const links = document.querySelector(".nav-links");
  const open = links.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
