import { ChromeController } from "../cdp/ChromeController.js";
import { VisionClient } from "../vision/VisionClient.js";
import { sleep } from "../utils/sleep.js";
import { logger } from "../logger.js";
import type { FramePacket, Viewport } from "../cdp/types.js";

export class StreamEngine {
  private streaming = false;
  private fps: number;
  private seq = 0;

  constructor(
    private readonly chrome: ChromeController,
    private readonly vision: VisionClient,
    private readonly viewport: Viewport,
    fps: number,
    private readonly capture: { format: "png"|"jpeg"; jpegQuality: number; downscale: number },
    private readonly domCfg: { maxNodes: number; maxTextLen: number }
  ) { this.fps = fps; }

  setFps(fps: number) { this.fps = fps; }
  isStreaming() { return this.streaming; }
  stop() { this.streaming = false; }

  async start(onFrame: (frame: FramePacket) => void): Promise<void> {
    if (this.streaming) return;
    this.streaming = true;
    logger.info({ fps: this.fps }, "stream start");

    while (this.streaming) {
      const tick = Date.now();
      const seq = ++this.seq;

      let imageB64 = "";
      let dom: any[] = [];
      let objects: any[] = [];
      let captureMs = 0, domMs = 0, inferMs = 0;

      try {
        const t0 = Date.now();
        imageB64 = await this.chrome.captureScreenshot(this.capture.format, this.capture.jpegQuality);
        captureMs = Date.now() - t0;

        const t1 = Date.now();
        dom = await this.chrome.captureDom(this.domCfg.maxNodes, this.domCfg.maxTextLen);
        domMs = Date.now() - t1;

        const t2 = Date.now();
        objects = await this.vision.infer({ imageB64, imageFormat: this.capture.format, viewport: this.viewport, dom });
        inferMs = Date.now() - t2;
      } catch (err: any) {
        logger.warn({ err: String(err?.message || err) }, "stream frame error");
      }

      const totalMs = Date.now() - tick;
      onFrame({
        ts: Date.now(),
        seq,
        viewport: this.viewport,
        image: { format: this.capture.format, dataB64: imageB64 },
        dom,
        objects,
        perf: { captureMs, domMs, inferMs, totalMs }
      });

      const budget = Math.max(1, Math.floor(1000 / Math.max(1, this.fps)));
      const sleepMs = Math.max(0, budget - (Date.now() - tick));
      if (sleepMs) await sleep(sleepMs);
    }
  }
}
