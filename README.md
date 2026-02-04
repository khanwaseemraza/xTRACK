# UI-Vision-CDP-YOLO — complete, ready scaffold (10 parts)

This repo gives you a **full working system** for low-latency browser automation with:
- **CDP** (Chrome DevTools Protocol) for capture + input
- **Viewport screenshots** at configurable FPS (1–30+ depending on machine)
- **DOM snapshot** extracted alongside each frame
- **YOLO** inference in a Python service
- **Fusion**: YOLO boxes ↔ DOM boxes via IoU matching to produce semantic outputs like  
  `button at (x,y) is "Submit"`
- **Live streaming UI** (web app) that shows frames + overlays and lets you click boxes to execute CDP clicks

---

## Part 1 — Quickstart

### Prereqs
- Node.js 18+ (20 recommended)
- Python 3.10+ (3.11 recommended)
- Google Chrome (or Chromium)

### 1) Install
```bash
# root
npm install

# python service
cd services/vision
python -m venv .venv
# Windows: .venv\Scripts\activate
# mac/linux: source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Start Chrome with remote debugging
**Windows (PowerShell):**
```powershell
./scripts/start-chrome.ps1 -Port 9222 -Width 1280 -Height 720
```

**macOS/Linux:**
```bash
./scripts/start-chrome.sh 9222 1280 720
```

### 3) Start the vision service
```bash
cd services/vision
# (activate venv first)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4) Start server + UI
From repo root:
```bash
npm run dev
```

Open:
- UI: http://localhost:5173
- Server API: http://localhost:8787/health

---

## Part 2 — Architecture

```
Chrome (CDP ws:9222) <-> Node Server (8787) <-> Python Vision (8000)
                                  |
                                  v
                                 Web UI (5173)
```

---

## Part 3 — Fixing your window-size / scaling mismatch

We force viewport alignment using CDP:
- `Emulation.setDeviceMetricsOverride(width, height, deviceScaleFactor=1)`

So screenshot coords == CDP input coords.

---

## Part 4 — Performance notes

- `Page.captureScreenshot` limits FPS; start with 10 Hz, then push to 15–20 Hz.
- YOLO model defaults to `yolo26n.pt` (YOLO26 nano) and downloads on first use.

---

## Part 5 — Configure

Edit `apps/server/config/default.json` for FPS, viewport, and vision URL.

---

## Part 6 — Features included

- live stream + overlays
- click-to-CDP-click
- navigate by URL
- FPS control
- YOLO + DOM fusion

---

## Part 7 — Production build

```bash
npm run build
npm start
```

Then open http://localhost:8787

---

## Part 8 — Troubleshooting

- Ensure Chrome runs with `--remote-debugging-port=9222`
- Keep DPR=1 for easy coordinate math.

---

## License
MIT


---

## Part 9 — LLM Agent (included)

This repo now includes an **LLM agent module** that consumes the live fused world-state (objects + DOM) and can produce **tool actions** like:
- navigate(url)
- click(x,y)
- type(text)
- scroll(deltaY)
- wait(ms)

### How it works
- Server maintains a rolling `world.latestFrame`.
- Agent calls an **OpenAI-compatible Chat Completions** endpoint (or local proxy) and asks for a `tool_calls` plan.
- Server executes tools via CDP and streams updated frames.

### Configure LLM
Edit `apps/server/config/default.json` and set:
- `llm.baseUrl` (e.g. `http://localhost:11434/v1` for an OpenAI-compatible local server)
- `llm.model`
- `llm.apiKey` (if needed)

### Use from UI
In the UI panel you can type an instruction like:
> "Open Google and search for OpenAI"
Then press **Run Agent Step** to execute one reasoning+action step.

---

## Part 10 — Next upgrades
- async pipelining (capture loop decoupled from inference)
- ROI/motion mode for higher effective FPS
- fine-tuned UI detector model + label taxonomy


### Local LLM option (recommended for latency)
If you have a local server that exposes an OpenAI-compatible endpoint, set `llm.baseUrl` to it.
A common setup is **Ollama** with an OpenAI-compatible shim (`/v1/chat/completions`). If your local stack differs, just point `baseUrl` accordingly.
