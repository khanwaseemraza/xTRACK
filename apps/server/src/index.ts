import express from "express";
import cors from "cors";
import expressWs from "express-ws";
import path from "node:path";
import fs from "node:fs";
import { loadConfig } from "./utils/config.js";
import { logger } from "./logger.js";
import { ChromeController } from "./cdp/ChromeController.js";
import { VisionClient } from "./vision/VisionClient.js";
import { StreamEngine } from "./stream/StreamEngine.js";
import { LLMClient } from "./agent/LLMClient.js";
import { AgentRunner } from "./agent/AgentRunner.js";
import { ClientMsgSchema } from "./ws/protocol.js";

const cfg = loadConfig();

const appBase = express();
expressWs(appBase);
const app = appBase;

app.use(cors());
app.use(express.json({ limit: "30mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));


app.post("/agent/step", async (req, res) => {
  try {
    const instruction = String(req.body?.instruction || "").trim();
    if (!instruction) return res.status(400).json({ error: "instruction required" });
    await ensureConnected();
    if (!latestFrame) return res.status(409).json({ error: "no frame yet; start stream first" });

    const result = await agent.step(instruction, latestFrame);
    return res.json({ ok: true, result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Serve built UI in production
const uiDist = path.resolve(process.cwd(), "apps/ui/dist");
if (fs.existsSync(uiDist)) {
  app.use(express.static(uiDist));
  app.get("/", (_req, res) => res.sendFile(path.join(uiDist, "index.html")));
}

const chrome = new ChromeController(cfg.cdp.host, cfg.cdp.port, cfg.viewport);
const vision = new VisionClient(cfg.vision.url);
const engine = new StreamEngine(chrome, vision, cfg.viewport, cfg.capture.fps, cfg.capture, cfg.dom);

const llm = new LLMClient(cfg.llm);
const agent = new AgentRunner(llm, chrome);
let latestFrame: any = null;

const clients = new Set<any>();
const broadcast = (obj: any) => {
  const s = JSON.stringify(obj);
  for (const c of clients) { try { c.send(s); } catch {} }
};

const status = () => ({ type: "status", connected: chrome.isConnected(), streaming: engine.isStreaming(), fps: cfg.capture.fps, viewport: cfg.viewport });

async function ensureConnected() { if (!chrome.isConnected()) await chrome.connect(); }

app.ws(cfg.ws.path, (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify(status()));

  ws.on("message", async (raw: any) => {
    try {
      const msg = ClientMsgSchema.parse(JSON.parse(String(raw)));

      if (msg.type === "start") {
        await ensureConnected();
        if (!engine.isStreaming()) engine.start((frame) => { latestFrame = frame; broadcast({ type: "frame", payload: frame }); });
      }
      if (msg.type === "stop") engine.stop();
      if (msg.type === "set_fps") { cfg.capture.fps = msg.fps; engine.setFps(msg.fps); broadcast(status()); }
      if (msg.type === "navigate") { await ensureConnected(); await chrome.navigate(msg.url); }
      if (msg.type === "move") { await ensureConnected(); await chrome.moveMouse(msg.x, msg.y); }
      if (msg.type === "click") { await ensureConnected(); await chrome.click(msg.x, msg.y); }
      if (msg.type === "scroll") { await ensureConnected(); await chrome.scroll(msg.deltaY); }
    } catch (e: any) {
      logger.warn({ err: String(e?.message || e) }, "ws msg error");
    }
  });

  ws.on("close", () => clients.delete(ws));
});

app.listen(cfg.server.port, () => logger.info({ port: cfg.server.port }, "server listening"));
