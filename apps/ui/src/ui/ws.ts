export type ServerMsg =
  | { type: "status"; connected: boolean; streaming: boolean; fps: number; viewport: { width:number; height:number; dpr:number } }
  | { type: "frame"; payload: any };

export type ClientMsg =
  | { type: "start" }
  | { type: "stop" }
  | { type: "set_fps"; fps: number }
  | { type: "navigate"; url: string }
  | { type: "click"; x: number; y: number }
  | { type: "move"; x: number; y: number }
  | { type: "scroll"; deltaY: number };

export function connect(onMsg: (m: ServerMsg) => void) {
  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = (ev) => { try { onMsg(JSON.parse(ev.data)); } catch {} };
  return { ws, send: (m: ClientMsg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m)) };
}
