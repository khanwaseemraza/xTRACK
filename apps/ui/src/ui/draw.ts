export function drawOverlay(canvas: HTMLCanvasElement, w: number, h: number, objects: any[]) {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0,0,w,h);
  for (const o of objects || []) {
    const [x1,y1,x2,y2] = o.bbox;
    ctx.lineWidth = 2;
    ctx.strokeStyle = o.source === "yolo+dom" ? "#9ece6a" : (o.source === "dom" ? "#ff9e64" : "#7aa2f7");
    ctx.strokeRect(x1, y1, Math.max(1,x2-x1), Math.max(1,y2-y1));
    const label = `${o.label}${o.dom?.text ? ` — ${o.dom.text}` : ""}`;
    ctx.font = "12px ui-sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x1, Math.max(0,y1-18), tw+8, 16);
    ctx.fillStyle = "#e7e7e7";
    ctx.fillText(label, x1+4, Math.max(12,y1-6));
  }
}
