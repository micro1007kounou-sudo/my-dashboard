const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

// 静的ファイル配信（ここはそのまま）
const server = http.createServer((req, res) => {
  let filePath = "." + req.url;
  if (filePath === "./") filePath = "./index.html";
  const ext = path.extname(filePath).toLowerCase();
  const map = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
  const contentType = map[ext] || "text/plain; charset=utf-8";
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

const wss = new WebSocket.Server({ server });
let clients = []; // 全接続管理

// 同じ部屋の相手に送信する関数
function sendToOtherInRoom(senderClient, dataStr) {
  const other = clients.find(c => c.room === senderClient.room && c.ws !== senderClient.ws);
  if (other && other.ws.readyState === WebSocket.OPEN) {
    other.ws.send(dataStr);
  }
}

// 部屋のユーザー名情報を同期する関数
function broadcastRoomInfo(roomName) {
  const roomMembers = clients.filter(c => c.room === roomName);
  roomMembers.forEach((client) => {
    const other = roomMembers.find(c => c.ws !== client.ws);
    const otherName = other ? other.username : null;
    client.ws.send(JSON.stringify({ type: "roominfo", otherName }));
  });
}

wss.on("connection", (ws) => {
  let currentClient = { ws, room: null, username: null };
  clients.push(currentClient);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      // 入室＆認証ロジック
      if (data.type === "join") {
        // 同じ合言葉の部屋に何人いるか数える
        const currentRoomCount = clients.filter(c => c.room === data.room).length;
        
        // すでに2人いたら満室としてはじく
        if (currentRoomCount >= 2) {
          ws.send(JSON.stringify({ type: "system", text: "この合言葉の部屋はすでに満室（2人専用）です。" }));
          ws.close();
          return;
        }

        currentClient.username = data.username;
        currentClient.room = data.room;

        ws.send(JSON.stringify({ type: "system", text: `部屋に入室しました。相手の接続を待っています…` }));
        sendToOtherInRoom(currentClient, JSON.stringify({ type: "system", text: `${data.username} さんが入室しました。` }));
        
        broadcastRoomInfo(data.room);
        return;
      }

      // チャットメッセージ
      if (data.type === "chat") {
        sendToOtherInRoom(currentClient, JSON.stringify({ type: "chat", text: data.text }));
      }
    } catch (e) {
      console.error(e);
    }
  });

  // 切断時
  ws.on("close", () => {
    const savedRoom = currentClient.room;
    const savedUsername = currentClient.username;

    clients = clients.filter(c => c.ws !== ws); // リストから削除

    if (savedRoom) {
      sendToOtherInRoom(currentClient, JSON.stringify({ type: "system", text: `${savedUsername} さんが退室しました。` }));
      broadcastRoomInfo(savedRoom);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});