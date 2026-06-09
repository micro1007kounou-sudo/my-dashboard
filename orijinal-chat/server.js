console.log("server.js が実行されました");
// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// 変更前: const PORT = 3000;
// 変更後: サーバーが指定するポート、なければ 3000 を使う
const PORT = process.env.PORT || 3000;

// ───────────────────────────────
// 静的ファイル配信（index.html / style.css / script.js）
// ───────────────────────────────
const server = http.createServer((req, res) => {
  let filePath = "." + req.url;
  if (filePath === "./") filePath = "./index.html";

  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
  };

  const contentType = map[ext] || "text/plain; charset=utf-8";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

// ───────────────────────────────
// WebSocket サーバー（2人専用）
// ───────────────────────────────
const wss = new WebSocket.Server({ server });

const clients = [];

function getIpFromReq(req) {
  const addr = req.socket.remoteAddress || "";
  if (addr.startsWith("::ffff:")) {
    return addr.replace("::ffff:", "");
  }
  return addr;
}

function broadcastIpInfo() {
  clients.forEach((client, idx) => {
    const selfIp = client.ip;
    const other = clients.find((_, i) => i !== idx);
    const otherIp = other ? other.ip : null;

    client.ws.send(JSON.stringify({
      type: "ipinfo",
      selfIp,
      otherIp,
    }));
  });
}

function sendToOther(senderWs, data) {
  const other = clients.find(c => c.ws !== senderWs);
  if (other && other.ws.readyState === WebSocket.OPEN) {
    other.ws.send(data);
  }
}

wss.on("connection", (ws, req) => {
  const ip = getIpFromReq(req);

  if (clients.length >= 2) {
    ws.send(JSON.stringify({
      type: "system",
      text: "このチャットは 2 人専用です。すでに満室です。",
    }));
    ws.close();
    return;
  }

  const client = { ws, ip };
  clients.push(client);

  ws.send(JSON.stringify({
    type: "system",
    text: "接続しました。あなたのIPは " + ip + " です。",
  }));

  broadcastIpInfo();

ws.on("message", (message) => {
  // messageはBuffer型で届くことがあるため、文字列（UTF-8）に変換
  const messageStr = message.toString();

  // サーバー側で中身を加工する必要はないので、そのまま相手に転送する
  sendToOther(ws, messageStr);
});
  ws.on("close", () => {
    const idx = clients.indexOf(client);
    if (idx !== -1) clients.splice(idx, 1);
    broadcastIpInfo();
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
