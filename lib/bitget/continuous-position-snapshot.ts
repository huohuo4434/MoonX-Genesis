import { createHmac } from "node:crypto";

// One-shot read subscription. No order operations, no persisted credentials.
// https://www.bitget.com/api-doc/uta/guide
// https://www.bitget.com/api-doc/uta/websocket/private/Positions-Channel
export async function confirmEmptyUtaPositionSnapshot(input: {
  apiKey: string; secretKey: string; passphrase: string; clockOffsetMs: number;
}, factory: (url: string) => WebSocket = url => new WebSocket(url)): Promise<void> {
  if (typeof input.clockOffsetMs !== "number" || !Number.isFinite(input.clockOffsetMs)) throw new Error("EXCHANGE_UNKNOWN");
  const started = Date.now() + input.clockOffsetMs;
  if (!Number.isFinite(started)) throw new Error("EXCHANGE_UNKNOWN");
  return new Promise((resolve, reject) => {
    const socket = factory("wss://ws.bitget.com/v3/ws/private");
    let done = false, authenticated = false, phase = "CONNECT";
    const finish = (code?: string) => {
      if (done) return;
      done = true; clearTimeout(timer);
      try { socket.close(); } catch { /* Never leak transport errors. */ }
      if (code) { console.warn("[continuous-position-proof]", { phase, code }); reject(new Error(code)); } else resolve();
    };
    const timer = setTimeout(() => finish("EXCHANGE_UNKNOWN"), 8000);
    socket.addEventListener("error", () => finish("EXCHANGE_UNKNOWN"));
    socket.addEventListener("close", () => finish("EXCHANGE_UNKNOWN"));
    socket.addEventListener("open", () => {
      if (done) return;
      phase = "LOGIN";
      try {
        const timestamp = String(Date.now() + input.clockOffsetMs);
        const sign = createHmac("sha256", input.secretKey).update(timestamp + "GET/user/verify").digest("base64");
        socket.send(JSON.stringify({ op: "login", args: [{ apiKey: input.apiKey, passphrase: input.passphrase, timestamp, sign }] }));
      }
      catch { finish("EXCHANGE_UNKNOWN"); }
    });
    socket.addEventListener("message", event => {
      if (done) return;
      try {
        const message = JSON.parse(String(event.data));
        if (message.event === "error") return finish("EXCHANGE_UNKNOWN");
        if (message.event === "login") {
          if (message.code !== "0" || authenticated) return finish("EXCHANGE_UNKNOWN");
          authenticated = true;
          phase = "SNAPSHOT";
          socket.send(JSON.stringify({ op: "subscribe", args: [{ instType: "UTA", topic: "position" }] }));
          return;
        }
        if (message.event === "subscribe") return; // ACK is not an empty snapshot.
        if (!authenticated || message.arg?.instType !== "UTA" || message.arg?.topic !== "position"
          || message.action !== "snapshot" || !Array.isArray(message.data)) { phase = "INVALID_SNAPSHOT"; return finish("EXCHANGE_UNKNOWN"); }
        const timestamp = typeof message.ts === "number" ? message.ts : NaN;
        const current = Date.now() + input.clockOffsetMs;
        if (!Number.isFinite(timestamp) || timestamp < started - 1000 || timestamp > current + 1000 || current - timestamp > 8000) { phase = "SNAPSHOT_TIME"; return finish("EXCHANGE_UNKNOWN"); }
        finish(message.data.length === 0 ? undefined : "EXCHANGE_NOT_EMPTY");
      } catch { finish("EXCHANGE_UNKNOWN"); }
    });
  });
}
