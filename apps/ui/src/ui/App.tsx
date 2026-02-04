import React, { useEffect, useMemo, useRef, useState } from "react";
import { connect, type ServerMsg } from "./ws";
import { drawOverlay } from "./draw";

export default function App() {
  const [status, setStatus] = useState<any>(null);
  const [frame, setFrame] = useState<any>(null);
  const [fps, setFps] = useState(10);
  const [url, setUrl] = useState("https://example.com");
  const [showOverlay, setShowOverlay] = useState(true);
  const [cursor, setCursor] = useState<{ x: number; y: number; clicking?: boolean } | null>(null);

  const [agentInstr, setAgentInstr] = useState("Open https://example.com then click any link.");
  const [agentLog, setAgentLog] = useState<string>("");

  const runAgentStep = async () => {
    try {
      const res = await fetch("/agent/step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction: agentInstr })
      });
      const j = await res.json();
      setAgentLog(JSON.stringify(j, null, 2));
    } catch (e: any) {
      setAgentLog(String(e?.message || e));
    }
  };

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<any>(null);

  useEffect(() => {
    const c = connect((m: ServerMsg) => {
      if (m.type === "status") { setStatus(m); setFps(m.fps); }
      if (m.type === "frame") setFrame(m.payload);
    });
    wsRef.current = c;
    return () => c.ws.close();
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !frame) return;
    const w = frame.viewport.width, h = frame.viewport.height;
    canvas.width = w; canvas.height = h;
    if (showOverlay) drawOverlay(canvas, w, h, frame.objects, cursor || undefined);
    else canvas.getContext("2d")!.clearRect(0, 0, w, h);
  }, [frame, showOverlay, cursor]);

  const imgSrc = useMemo(() => frame?.image?.dataB64 ? `data:image/${frame.image.format};base64,${frame.image.dataB64}` : "", [frame]);

  const toViewportCoords = (ev: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const r = img.getBoundingClientRect();
    const x = (ev.clientX - r.left) * (status?.viewport?.width / r.width);
    const y = (ev.clientY - r.top) * (status?.viewport?.height / r.height);
    return { x, y };
  };

  const handleMouseMove = (ev: React.MouseEvent) => {
    const coords = toViewportCoords(ev);
    setCursor({ x: coords.x, y: coords.y });
    // Also send move to server for CDP
    wsRef.current?.send({ type: "move", x: coords.x, y: coords.y });
  };

  const handleClick = (ev: React.MouseEvent) => {
    const coords = toViewportCoords(ev);
    setCursor({ x: coords.x, y: coords.y, clicking: true });
    wsRef.current?.send({ type: "click", x: coords.x, y: coords.y });
    // Reset clicking state after animation
    setTimeout(() => setCursor(c => c ? { ...c, clicking: false } : null), 300);
  };

  const handleMouseLeave = () => {
    setCursor(null);
  };

  return (
    <div className="wrap">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>UI Vision Stream</h2>

        <div className="row">
          <button className="btn" onClick={() => wsRef.current?.send({ type: "start" })}>Start</button>
          <button className="btn" onClick={() => wsRef.current?.send({ type: "stop" })}>Stop</button>
          <span className="tag">{status?.connected ? "CDP connected" : "CDP not connected"}</span>
          <span className="tag">{status?.streaming ? "streaming" : "stopped"}</span>
        </div>

        <div className="hr" />

        <div className="row">
          <label className="small" style={{ width: 60 }}>FPS</label>
          <input className="input" type="number" min={1} max={60} value={fps}
            onChange={(e) => setFps(parseInt(e.target.value || "10", 10))} />
          <button className="btn" onClick={() => wsRef.current?.send({ type: "set_fps", fps })}>Apply</button>
        </div>

        <div className="row">
          <label className="small" style={{ width: 60 }}>URL</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn" onClick={() => wsRef.current?.send({ type: "navigate", url })}>Go</button>
        </div>

        <div className="row">
          <label className="small">
            <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} /> overlays
          </label>
        </div>

        <div className="hr" />
        <div className="kv">Viewport: {status?.viewport ? `${status.viewport.width}×${status.viewport.height} dpr=${status.viewport.dpr}` : "-"}</div>
        <div className="kv">Perf: {frame?.perf ? `cap ${frame.perf.captureMs}ms | dom ${frame.perf.domMs}ms | yolo ${frame.perf.inferMs}ms | total ${frame.perf.totalMs}ms` : "-"}</div>


        <div className="hr" />
        <h3 style={{ margin: "8px 0" }}>LLM Agent</h3>
        <div className="small">1) Start stream (so agent has a fresh world-state)  2) Run one step.</div>
        <textarea
          className="input"
          style={{ height: 110, resize: "vertical" }}
          value={agentInstr}
          onChange={(e) => setAgentInstr(e.target.value)}
        />
        <div className="row">
          <button className="btn" onClick={runAgentStep}>Run Agent Step</button>
        </div>
        <pre className="small" style={{ whiteSpace: "pre-wrap" }}>{agentLog}</pre>
        <div className="hr" />
        <div className="small">Tip: click on the stream to send a CDP click at that coordinate.</div>
      </div>

      <div className="viewer">
        <div className="stage"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}>
          {imgSrc ? (
            <img ref={imgRef} src={imgSrc} width={status?.viewport?.width || 1280} height={status?.viewport?.height || 720} />
          ) : (
            <div className="small">No frame yet — press Start.</div>
          )}
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
