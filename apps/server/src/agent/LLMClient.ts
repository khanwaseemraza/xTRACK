import { request } from "undici";
import { logger } from "../logger.js";

export type LLMConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class LLMClient {
  constructor(private cfg: LLMConfig) {}

  async completeJSON(system: string, user: string): Promise<any> {
    // OpenAI-compatible Chat Completions endpoint:
    // POST {baseUrl}/chat/completions
    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const headers: Record<string,string> = { "content-type": "application/json" };
    if (this.cfg.apiKey) headers["authorization"] = `Bearer ${this.cfg.apiKey}`;

    const body = {
      model: this.cfg.model,
      temperature: this.cfg.temperature ?? 0.2,
      max_tokens: this.cfg.maxTokens ?? 600,
      messages: [
        { role: "system", content: system } satisfies ChatMessage,
        { role: "user", content: user } satisfies ChatMessage
      ]
    };

    const res = await request(url, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await res.body.text();

    if (res.statusCode < 200 || res.statusCode >= 300) {
      logger.warn({ status: res.statusCode, text: text.slice(0, 500) }, "LLM error");
      throw new Error(`LLM HTTP ${res.statusCode}`);
    }

    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("LLM returned no content");

    // Expect the model to return JSON only.
    try {
      return JSON.parse(content);
    } catch {
      // Try to salvage JSON if surrounded by text.
      const m = content.match(/\{[\s\S]*\}$/);
      if (!m) throw new Error("LLM output was not JSON");
      return JSON.parse(m[0]);
    }
  }
}
