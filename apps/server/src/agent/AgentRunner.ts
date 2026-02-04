import type { FramePacket } from "../cdp/types.js";
import { ChromeController } from "../cdp/ChromeController.js";
import { sleep } from "../utils/sleep.js";
import { buildAgentSystemPrompt, buildWorldPayload } from "./prompt.js";
import { LLMClient } from "./LLMClient.js";
import type { AgentStepResult, AgentTool } from "./types.js";
import { logger } from "../logger.js";

export class AgentRunner {
  constructor(private llm: LLMClient, private chrome: ChromeController) { }

  async step(instruction: string, frame: FramePacket): Promise<AgentStepResult> {
    const system = buildAgentSystemPrompt();
    const world = buildWorldPayload(frame);
    const user = [
      `INSTRUCTION: ${instruction}`,
      `WORLD_JSON: ${JSON.stringify(world)}`
    ].join("\n\n");

    const out = await this.llm.completeJSON(system, user);

    const tools: AgentTool[] = Array.isArray(out?.tools) ? out.tools : [];
    const final = typeof out?.final === "string" ? out.final : undefined;

    // Execute tools sequentially (single step)
    for (const t of tools) {
      await this.executeTool(t);
    }

    return { tools, final };
  }

  private async executeTool(t: AgentTool): Promise<void> {
    try {
      if (t.name === "navigate") {
        await this.chrome.navigate(t.arguments.url);
        return;
      }
      if (t.name === "click") {
        await this.chrome.click(t.arguments.x, t.arguments.y);
        return;
      }
      if (t.name === "move") {
        await this.chrome.moveMouse(t.arguments.x, t.arguments.y);
        return;
      }
      if (t.name === "scroll") {
        await this.chrome.scroll(t.arguments.deltaY);
        return;
      }
      if (t.name === "wait") {
        await sleep(t.arguments.ms);
        return;
      }
      if (t.name === "type") {
        await this.chrome.typeText(t.arguments.text);
        return;
      }
    } catch (e: any) {
      logger.warn({ tool: t.name, err: String(e?.message || e) }, "tool exec error");
    }
  }
}
