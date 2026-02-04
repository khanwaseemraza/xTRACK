import CDP from "chrome-remote-interface";
import { logger } from "../logger.js";
import type { Viewport, DomNode } from "./types.js";

type CDPClient = Awaited<ReturnType<typeof CDP>>;

export class ChromeController {
  private client: CDPClient | null = null;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly viewport: Viewport
  ) {}

  async connect(): Promise<void> {
    const targets = await CDP.List({ host: this.host, port: this.port });
    let page = targets.find(t => t.type === "page");
    if (!page) {
      const created: any = await CDP.New({ host: this.host, port: this.port, url: "about:blank" });
      page = created;
    }

    this.client = await CDP({ host: this.host, port: this.port, target: page.id });

    const { Page, DOM, DOMSnapshot, Runtime, Emulation } = this.client;

    await Promise.all([
      Page.enable(),
      DOM.enable(),
      Runtime.enable(),
      DOMSnapshot.enable(),
      Emulation.setFocusEmulationEnabled({ enabled: true })
    ]);

    await Emulation.setDeviceMetricsOverride({
      width: this.viewport.width,
      height: this.viewport.height,
      deviceScaleFactor: this.viewport.dpr,
      mobile: false,
      screenWidth: this.viewport.width,
      screenHeight: this.viewport.height,
      screenOrientation: { type: "portraitPrimary", angle: 0 }
    });

    logger.info({ viewport: this.viewport }, "CDP connected & viewport enforced");
  }

  isConnected(): boolean { return !!this.client; }

  async close(): Promise<void> {
    if (this.client) await this.client.close();
    this.client = null;
  }

  async navigate(url: string): Promise<void> {
    if (!this.client) throw new Error("Not connected");
    await this.client.Page.navigate({ url });
  }

  async captureScreenshot(format: "png"|"jpeg", jpegQuality: number): Promise<string> {
    if (!this.client) throw new Error("Not connected");
    const res = await this.client.Page.captureScreenshot({
      format,
      quality: format === "jpeg" ? jpegQuality : undefined,
      fromSurface: true,
      captureBeyondViewport: false
    });
    return res.data;
  }

  async captureDom(maxNodes: number, maxTextLen: number): Promise<DomNode[]> {
    if (!this.client) throw new Error("Not connected");
    const { Runtime } = this.client;

    const expr = `
(() => {
  const maxNodes = ${maxNodes};
  const maxTextLen = ${maxTextLen};
  const nodes = [];
  const isVisible = (el) => {
    const st = window.getComputedStyle(el);
    if (!st) return false;
    if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) return false;
    return true;
  };
  const pickText = (el) => {
    let t = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
    t = t.replace(/\s+/g,' ');
    if (t.length > maxTextLen) t = t.slice(0, maxTextLen) + '…';
    return t || undefined;
  };
  const pickAttrs = (el) => {
    const attrs = {};
    const keys = ['aria-label','title','name','role','type','value','placeholder','href'];
    for (const k of keys) {
      const v = el.getAttribute && el.getAttribute(k);
      if (v) attrs[k] = (''+v).slice(0, 120);
    }
    return Object.keys(attrs).length ? attrs : undefined;
  };
  const els = Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"],[onclick],[tabindex]'));
  for (const el of els) {
    if (nodes.length >= maxNodes) break;
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    nodes.push({
      tag: (el.tagName || '').toLowerCase(),
      id: el.id || undefined,
      classes: (el.className && typeof el.className === 'string') ? el.className.split(/\s+/).filter(Boolean).slice(0,8) : undefined,
      text: pickText(el),
      attrs: pickAttrs(el),
      bbox: [r.x, r.y, r.width, r.height]
    });
  }
  return nodes;
})()
`;
    const evalRes = await Runtime.evaluate({ expression: expr, returnByValue: true });
    const value = (evalRes.result as any).value as any[];
    if (!Array.isArray(value)) return [];
    return value.map((n, i) => ({ nodeId: i, ...n })) as DomNode[];
  }

  async moveMouse(x: number, y: number): Promise<void> {
    if (!this.client) throw new Error("Not connected");
    await this.client.Input.dispatchMouseEvent({ type: "mouseMoved", x, y, buttons: 0 });
  }

  async click(x: number, y: number): Promise<void> {
    if (!this.client) throw new Error("Not connected");
    const { Input } = this.client;
    await Input.dispatchMouseEvent({ type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await Input.dispatchMouseEvent({ type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }


async typeText(text: string): Promise<void> {
  if (!this.client) throw new Error("Not connected");
  const { Input } = this.client;
  // Best-effort: send as a single insertText + fallback key events
  await Input.insertText({ text });
}

  async scroll(deltaY: number): Promise<void> {
    if (!this.client) throw new Error("Not connected");
    await this.client.Input.dispatchMouseEvent({ type: "mouseWheel", x: 10, y: 10, deltaY, deltaX: 0 });
  }
}
