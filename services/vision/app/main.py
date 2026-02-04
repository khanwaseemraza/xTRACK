from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Tuple
import base64, time, os, uuid
import numpy as np
import cv2
from ultralytics import YOLO

app = FastAPI(title="UI Vision Service", version="0.1.0")

MODEL_NAME = os.environ.get("YOLO_MODEL", "yolo26n.pt")
MODEL = YOLO(MODEL_NAME)

class DomNode(BaseModel):
    nodeId: int
    tag: str
    id: Optional[str] = None
    classes: Optional[List[str]] = None
    text: Optional[str] = None
    attrs: Optional[Dict[str, str]] = None
    bbox: Optional[Tuple[float, float, float, float]] = None  # x,y,w,h

class InferRequest(BaseModel):
    imageB64: str
    imageFormat: str = Field(pattern="^(png|jpeg)$")
    viewport: Dict[str, float]
    dom: List[DomNode] = []

class VisionObject(BaseModel):
    id: str
    label: str
    score: float
    bbox: Tuple[float, float, float, float]  # x1,y1,x2,y2
    dom: Optional[Dict[str, object]] = None
    source: str

def b64_to_bgr(image_b64: str) -> np.ndarray:
    raw = base64.b64decode(image_b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img

def iou_xyxy(a, b) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    x1 = max(ax1, bx1); y1 = max(ay1, by1)
    x2 = min(ax2, bx2); y2 = min(ay2, by2)
    inter = max(0.0, x2-x1) * max(0.0, y2-y1)
    if inter <= 0: return 0.0
    area_a = max(0.0, ax2-ax1) * max(0.0, ay2-ay1)
    area_b = max(0.0, bx2-bx1) * max(0.0, by2-by1)
    union = area_a + area_b - inter
    return float(inter/union) if union > 0 else 0.0

def dom_bbox_xyxy(n: DomNode):
    if not n.bbox: return None
    x,y,w,h = n.bbox
    return (float(x), float(y), float(x+w), float(y+h))

def best_dom_match(yolo_box, dom_nodes, thr=0.25):
    best, best_i = None, 0.0
    for n in dom_nodes:
        bb = dom_bbox_xyxy(n)
        if not bb: continue
        v = iou_xyxy(yolo_box, bb)
        if v > best_i:
            best, best_i = n, v
    return best, best_i

@app.get("/health")
def health(): return {"ok": True}

@app.post("/infer")
def infer(req: InferRequest):
    t0 = time.time()
    img = b64_to_bgr(req.imageB64)

    results = MODEL.predict(img, verbose=False)
    r0 = results[0]
    names = r0.names

    objects: List[VisionObject] = []

    if r0.boxes is not None and len(r0.boxes) > 0:
        boxes = r0.boxes.xyxy.cpu().numpy()
        confs = r0.boxes.conf.cpu().numpy()
        clss  = r0.boxes.cls.cpu().numpy()

        for (x1,y1,x2,y2), conf, cls in zip(boxes, confs, clss):
            label = str(names.get(int(cls), f"class_{int(cls)}"))
            ybox = (float(x1), float(y1), float(x2), float(y2))

            dom_match, v = best_dom_match(ybox, req.dom, thr=0.25)
            if dom_match and v >= 0.25:
                objects.append(VisionObject(
                    id=str(uuid.uuid4())[:8],
                    label=label,
                    score=float(conf),
                    bbox=ybox,
                    dom={
                        "tag": dom_match.tag,
                        "text": dom_match.text,
                        "id": dom_match.id,
                        "classes": dom_match.classes,
                        "attrs": dom_match.attrs,
                        "iou": float(v)
                    },
                    source="yolo+dom"
                ))
            else:
                objects.append(VisionObject(
                    id=str(uuid.uuid4())[:8],
                    label=label,
                    score=float(conf),
                    bbox=ybox,
                    dom=None,
                    source="yolo"
                ))

    # DOM-only fallback (limit)
    for n in req.dom[:40]:
        bb = dom_bbox_xyxy(n)
        if not bb: continue
        if any(iou_xyxy(o.bbox, bb) > 0.5 for o in objects):
            continue
        objects.append(VisionObject(
            id=str(uuid.uuid4())[:8],
            label=n.tag,
            score=0.5,
            bbox=bb,
            dom={"tag": n.tag, "text": n.text, "id": n.id, "classes": n.classes, "attrs": n.attrs},
            source="dom"
        ))

    objects.sort(key=lambda o: (2 if o.source=="yolo+dom" else 1 if o.source=="yolo" else 0, o.score), reverse=True)

    return {"objects": [o.model_dump() for o in objects], "ms": int((time.time()-t0)*1000)}
