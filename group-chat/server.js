const http = require("http");
const fs = require("fs");
const path = require("path"); 
const { WebSocketServer } = require("ws");

// 1. HTTPサーバーの設定（HTML/CSS/JavaScriptをブラウザに返す）
const server = http.createServer((req, res) => {
  let urlPath = req.url === "/" ? "/index.html" : req.url;
  let filePath = path.join(__dirname, urlPath);
  
  const ext = path.extname(filePath).toLowerCase();
  const map = { 
    ".html": "text/html; charset=utf-8", 
    ".css": "text/css; charset=utf-8", 
    ".js": "text/javascript; charset=utf-8" 
  };
  const contentType = map[ext] || "text/plain; charset=utf-8";

  fs.readFile(filePath, (err, content) => {
    if (err) { 
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); 
      res.end("ファイルが見つかりません (404 Not Found)"); 
      return; 
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

// 2. WebSocketサーバーの設定（グループチャット用に拡張）
const wss = new WebSocketServer({ server });

// 🛠️ 部屋分けを無くし、全員が入る1つの「広場（配列）」にします
let participants = [];

// 全員に現在の「オンライン人数」と「参加者名リスト」を伝える共通関数
function broadcastRoomInfo() {
  // 👇 ★【修正】現在参加している全員の名前を配列にまとめます
  const currentNames = participants.map(client => client.name);

  const infoData = JSON.stringify({
    type: "roominfo",
    count: participants.length,
    names: currentNames // 👈 ★これを新しく追加！
  });

  participants.forEach((client) => {
    if (client.ws.readyState === client.ws.OPEN) {
      client.ws.send(infoData);
    }
  });
}

wss.on("connection", (ws) => {
  let currentName = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // 🛠️ フロント側の生存確認（ピンポン）には空で応答して接続維持
      if (data.type === "ping") {
        return; 
      }

      // 【入室処理】
      if (data.type === "join") {
        currentName = data.username;

        // 🛠️ 定員制限は撤去！何人でも配列に追加します
        participants.push({ ws, name: currentName });

        // 自分に歓迎メッセージ
        ws.send(JSON.stringify({ 
          type: "system", 
          text: `グループチャットに入室しました。現在の参加者はあなたを含めて ${participants.length} 人です。` 
        }));

        // 自分以外の全員に、新しい人が入ってきたことを通知
        participants.forEach((client) => {
          if (client.ws !== ws && client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify({ type: "system", text: `${currentName} さんが参加しました！` }));
          }
        });

        // 🛠️ 全員に最新のオンライン人数を通知
        broadcastRoomInfo();
        return;
      }

      // 【チャットメッセージ転送処理】
      if (data.type === "chat") {
        // 🛠️ 誰が送ったメッセージか分かるよう、発言者の「name」を添えて全員（自分以外）に転送
        participants.forEach((client) => {
          if (client.ws !== ws && client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify({ 
              type: "chat", 
              username: currentName, // 👈 誰の名前かをここに入れる！
              text: data.text 
            }));
          }
        });
      }

    } catch (e) {
      console.error("エラー:", e);
    }
  });

  // 【切断処理】
  ws.on("close", () => {
    if (currentName) {
      // 離脱したユーザーを配列から除外
      participants = participants.filter((client) => client.ws !== ws);

      // 残っている全員に、誰かが退室したこととお知らせ
      participants.forEach((client) => {
        if (client.ws.readyState === client.ws.OPEN) {
          client.ws.send(JSON.stringify({ type: "system", text: `${currentName} さんが退室しました。` }));
        }
      });

      // 🛠️ 退出後の最新オンライン人数を全員に再通知
      broadcastRoomInfo();
    }
  });
});

// 3. サーバー起動
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Group Chat Server running on port ${PORT}`);
});