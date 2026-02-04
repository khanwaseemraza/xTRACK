import type { FramePacket } from "../cdp/types.js";

export function buildAgentSystemPrompt() {
  return [
    "You are a fast UI automation agent.",
    "You receive a JSON 'world' that contains:",
    "- viewport size",
    "- detected objects (bbox, label, optional dom tag/text/id/classes)",
    "- limited DOM nodes",
    "",
    "Your job: produce tool calls that move the task forward with minimal steps.",
    "Always prefer clicking by coordinates at the CENTER of the best matching bbox.",
    "If you need to type, click a relevant input first then type().",
    "Never invent URLs; if user says 'google', navigate to https://www.google.com/ .",
    "",
    "Return ONLY JSON with shape: { tools: [...], final?: string }",
    "Tools allowed: navigate, click, move, type, scroll, wait.",
  ].join("\n");
}

export function buildWorldPayload(frame: FramePacket) {
  // Keep payload compact so LLM is fast.
  const objects = (frame.objects || []).slice(0, 40).map((o: any) => ({
    label: o.label,
    score: o.score,
    bbox: o.bbox,
    source: o.source,
    dom: o.dom ? { tag: o.dom.tag, text: o.dom.text, id: o.dom.id, classes: o.dom.classes } : undefined
  }));

  const dom = (frame.dom || []).slice(0, 80).map((n: any) => ({
    tag: n.tag, text: n.text, id: n.id, classes: n.classes, bbox: n.bbox, attrs: n.attrs
  }));

  return {
    ts: frame.ts,
    viewport: frame.viewport,
    objects,
    dom
  };
}
