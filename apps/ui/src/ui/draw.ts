export function drawOverlay(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  objects: any[],
  cursor?: { x: number; y: number; clicking?: boolean }
) {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);

  // Draw object boxes
  for (const o of objects || []) {
    const [x1, y1, x2, y2] = o.bbox;
    ctx.lineWidth = 2;
    ctx.strokeStyle = o.source === "yolo+dom" ? "#9ece6a" : (o.source === "dom" ? "#ff9e64" : "#7aa2f7");
    ctx.strokeRect(x1, y1, Math.max(1, x2 - x1), Math.max(1, y2 - y1));
    const label = `${o.label}${o.dom?.text ? ` — ${o.dom.text}` : ""}`;
    ctx.font = "12px ui-sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x1, Math.max(0, y1 - 18), tw + 8, 16);
    ctx.fillStyle = "#e7e7e7";
    ctx.fillText(label, x1 + 4, Math.max(12, y1 - 6));
  }

  // Draw cursor if position provided
  if (cursor && cursor.x != null && cursor.y != null) {
    const { x, y, clicking } = cursor;
    const size = clicking ? 16 : 12;
    const color = clicking ? "#ff5555" : "#ffcc00";

    // Outer glow
    ctx.beginPath();
    ctx.arc(x, y, size + 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();

    // Main cursor circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Crosshair lines
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size - 8, y);
    ctx.lineTo(x - size, y);
    ctx.moveTo(x + size, y);
    ctx.lineTo(x + size + 8, y);
    ctx.moveTo(x, y - size - 8);
    ctx.lineTo(x, y - size);
    ctx.moveTo(x, y + size);
    ctx.lineTo(x, y + size + 8);
    ctx.stroke();

    // Coordinates label
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    const coordText = `(${Math.round(x)}, ${Math.round(y)})`;
    const ctw = ctx.measureText(coordText).width;
    ctx.fillRect(x + 18, y - 8, ctw + 6, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(coordText, x + 21, y + 4);
  }
}

