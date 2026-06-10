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
let msgHistory = []; // ✨【新規】直近の過去ログを一時保存する箱（最大50件）

// 全員に現在の「オンライン人数」と「参加者名リスト」を伝える共通関数
function broadcastRoomInfo() {
  const currentNames = participants.map(client => client.name);

  const infoData = JSON.stringify({
    type: "roominfo",
    count: participants.length,
    names: currentNames 
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

      // ✨【3分切断防止】ピンポンが来たら、即座に「pong」を返して接続を確実に維持する！
      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return; 
      }

      // 【入室処理】
      if (data.type === "join") {
        currentName = data.username;

        // 定員制限なしで配列に追加
        participants.push({ ws, name: currentName });

        // 自分に歓迎メッセージ
        ws.send(JSON.stringify({ 
          type: "system", 
          text: `グループチャットに入室しました。現在の参加者はあなたを含めて ${participants.length} 人です。` 
        }));

        // ✨【新規】入室してきた本人に、溜まっている過去ログ（最新50件）を一括送信！
        if (msgHistory.length > 0) {
          ws.send(JSON.stringify({
            type: "history",
            messages: msgHistory
          }));
        }

        // 自分以外の全員に、新しい人が入ってきたことを通知
        participants.forEach((client) => {
          if (client.ws !== ws && client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify({ type: "system", text: `${currentName} さんが参加しました！` }));
          }
        });

        // 全員に最新のオンライン人数と名前を通知
        broadcastRoomInfo();
        return;
      }

      // 【チャットメッセージ転送処理】
      if (data.type === "chat") {
        // ✨【新規】送られてきたメッセージを過去ログ配列に追加する
        const newMsg = { username: currentName, text: data.text };
        msgHistory.push(newMsg);

        // ログが溜まりすぎないよう、最新50件を超えたら古いものを自動削除
        if (msgHistory.length > 50) {
          msgHistory.shift(); 
        }

        // 発言者の「name」を添えて全員（自分以外）に転送
        participants.forEach((client) => {
          if (client.ws !== ws && client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify({ 
              type: "chat", 
              username: currentName, 
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

      // ✨【修正＆強化】人数に応じたシステムメッセージの出し分け
      if (participants.length === 0) {
        // 誰もいなくなったら、予定通り過去ログの箱を綺麗に全消去
        msgHistory = [];
      } else if (participants.length === 1) {
        // 👇 ★【新規】残った人が「ちょうど1人」になった場合
        // 最後に残った1人の画面にだけ、特別な警告メッセージを送る
        const lastClient = participants[0];
        if (lastClient.ws.readyState === lastClient.ws.OPEN) {
          // 退室した人のアナウンスも一応送りつつ…
          lastClient.ws.send(JSON.stringify({ 
            type: "system", 
            text: `${currentName} さんが退室しました。` 
          }));
          // ⚠️ 最後の1人になった警告を表示！
          lastClient.ws.send(JSON.stringify({ 
            type: "system", 
            text: "🚨 あなたが最後の1人になりました。ブラウザを閉じるか10時間放置すると、この部屋のログは完全に消去されます。" 
          }));
        }
      } else {
        // まだ2人以上残っている場合は、通常通り退室アナウンスを全員に送る
        participants.forEach((client) => {
          if (client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify({ 
              type: "system", 
              text: `${currentName} さんが退室しました。` 
            }));
          }
        });
      }

      // 退出後の最新オンライン人数を全員に再通知
      broadcastRoomInfo();
    }
  });
});

// 3. サーバー起動
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Group Chat Server running on port ${PORT}`);
});