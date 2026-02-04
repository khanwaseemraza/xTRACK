import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type AppConfig = {
  cdp: { host: string; port: number };
  viewport: { width: number; height: number; dpr: number };
  capture: { fps: number; format: "png" | "jpeg"; jpegQuality: number; downscale: number };
  dom: { maxNodes: number; maxTextLen: number };
  vision: { url: string };
  llm: { baseUrl: string; model: string; apiKey?: string; temperature?: number; maxTokens?: number };
  server: { port: number };
  ws: { path: string };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadConfig(): AppConfig {
  const p = path.resolve(__dirname, "../../config/default.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as AppConfig;
}
