# Regina's website

One Node process serves the HTML site and the WhatsApp webhook.

```bash
docker-compose up -d --build
```

Then open `http://<host>:9000`. Meta webhook URL: `https://<host>/webhook` (or `http://<host>:9000/webhook` if you terminate TLS elsewhere).

Env file: `env.env` in this directory (not baked into the image).

```bash
npm test
npm run simulate
```


`POST /pyapi/cover-letter` flows through these modules:

```mermaid
flowchart TD
  client["cover-letter.html / curl"] -->|POST jobDescription resumeText label| main["main.py<br/>cover_letter()"]

  main --> config["config.py<br/>max input size, CORS, artifact root"]
  main --> getBackend["llm.py<br/>load_backend()"]
  main --> agent["agent.py<br/>run_agent()"]

  getBackend --> template["TemplateBackend"]
  getBackend --> hf["TransformersBackend<br/>PyTorch + Hugging Face"]

  agent --> prompts["prompts.py<br/>SYSTEM_PROMPT USER_PROMPT<br/>build_context TOOL_PROMPT"]
  agent --> llmGen["llm.py generate()"]
  agent --> tools["tools.py<br/>Workspace + registry"]

  llmGen --> template
  llmGen --> hf
  prompts --> llmGen

  tools --> saveT["save_cover_letter"]
  tools --> folderT["create_dated_folder"]
  tools --> copyT["copy_document"]
  tools --> zipT["zip_folder"]

  agent -->|AgentRun letter steps archive| main
  main -->|JSON + downloadUrl| client
  client -.->|GET /pyapi/artifacts/name| artifacts["main.py artifact()<br/>FileResponse zip"]
  artifacts --> tools
```

| Module | Role on this request |
|---|---|
| `main.py` | HTTP in/out, size checks, lazy `get_backend()`, zip URL |
| `config.py` | Limits, origins, model id, artifact root |
| `prompts.py` | Fixed system/user text and the job+resume context |
| `llm.py` | Writes the letter (template or HF/PyTorch) |
| `agent.py` | Calls generate, plans tools, runs them in order |
| `tools.py` | Date folder, save doc, copy, zip — paths stay inside the workspace |