import fetch from "node-fetch";
import type { DomNode } from "../cdp/types.js";

export type VisionRequest = {
  imageB64: string;
  imageFormat: "png"|"jpeg";
  viewport: { width: number; height: number; dpr: number };
  dom: DomNode[];
};

export type VisionObject = {
  id: string;
  label: string;
  score: number;
  bbox: [number, number, number, number];
  dom?: { tag?: string; text?: string; id?: string; classes?: string[] };
  source: "yolo"|"dom"|"yolo+dom";
};

export class VisionClient {
  constructor(private readonly url: string) {}
  async infer(req: VisionRequest): Promise<VisionObject[]> {
    const res = await fetch(this.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req) });
    if (!res.ok) throw new Error(`Vision error ${res.status}: ${await res.text()}`);
    return (await res.json() as any).objects || [];
  }
}
