export type Viewport = { width: number; height: number; dpr: number };

export type DomNode = {
  nodeId: number;
  tag: string;
  id?: string;
  classes?: string[];
  text?: string;
  attrs?: Record<string,string>;
  bbox?: [number, number, number, number]; // x,y,w,h
};

export type FramePacket = {
  ts: number;
  seq: number;
  viewport: { width: number; height: number; dpr: number };
  image: { format: "png"|"jpeg"; dataB64: string; };
  dom: DomNode[];
  objects: Array<{
    id: string;
    label: string;
    score: number;
    bbox: [number, number, number, number]; // x1,y1,x2,y2
    dom?: { tag?: string; text?: string; id?: string; classes?: string[] };
    source: "yolo"|"dom"|"yolo+dom";
  }>;
  perf: { captureMs: number; domMs: number; inferMs: number; totalMs: number };
};
