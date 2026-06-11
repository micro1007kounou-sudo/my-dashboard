const http = require("http");
const fs = require("fs");
const path = require("path"); // 階層問題を解決するためのモジュール
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

// 2. WebSocketサーバーの設定（チャットのリアルタイム通信）
const wss = new WebSocketServer({ server });

// 部屋ごとの接続と過去ログを管理するオブジェクト
const rooms = {};

wss.on("connection", (ws) => {
  let currentRoom = null;
  let currentName = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // ✨【3分切断防止】ピンポンが来たら、即座に「pong」を返して接続を維持
      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return; 
      }

      // 【入室処理】
      if (data.type === "join") {
        currentRoom = data.room;
        currentName = data.username;

        if (!rooms[currentRoom]) {
          rooms[currentRoom] = {
            members: [],
            history: [] // ✨部屋ごとの過去ログ置き場
          };
        }

        // 定員2人のチェック
        if (rooms[currentRoom].members.length >= 2) {
          ws.send(JSON.stringify({ type: "system", text: "この部屋は満室（2人）です。入室できません。" }));
          ws.close();
          return;
        }

        // 部屋のメンバーリストに参加
        rooms[currentRoom].members.push({ ws, name: currentName });

        // 自分に歓迎メッセージ
        ws.send(JSON.stringify({ type: "system", text: `${currentRoom} の部屋に入室しました。` }));

        // ✨入室してきた本人に、この部屋に溜まっている過去ログ（最新50件）を一括送信！
        const roomData = rooms[currentRoom];
        if (roomData.history.length > 0) {
          ws.send(JSON.stringify({
            type: "history",
            messages: roomData.history // 内訳: [{username, text}, ...]
          }));
        }

        // お互いの名前を確認して通知
        const members = roomData.members;
        if (members.length === 1) {
          ws.send(JSON.stringify({ type: "roominfo", otherName: "未接続" }));
        } else if (members.length === 2) {
          const user1 = members[0];
          const user2 = members[1];

          user1.ws.send(JSON.stringify({ type: "roominfo", otherName: user2.name }));
          user2.ws.send(JSON.stringify({ type: "roominfo", otherName: user1.name }));

          user1.ws.send(JSON.stringify({ type: "system", text: `${user2.name} さんが参加しました！` }));
          user2.ws.send(JSON.stringify({ type: "system", text: `${user1.name} さんと接続されました！` }));
        }
        return;
      }

      // 【チャットメッセージ転送処理】
      if (data.type === "chat" && currentRoom) {
        const roomData = rooms[currentRoom];
        if (roomData) {
          // ✨誰が何を発言したかを、部屋の過去ログ配列に記録する
          roomData.history.push({ username: currentName, text: data.text });

          // 過去ログが溜まりすぎないよう、最新50件を超えたら古いものを自動削除
          if (roomData.history.length > 50) {
            roomData.history.shift();
          }

          // 💡【修正：オウム返し仕様】
          // 自分も含めた「全員」にメッセージを転送します。
          // 誰の発言か区別できるように、usernameに発言者の名前を載せて送ります。
          roomData.members.forEach((client) => {
            client.ws.send(JSON.stringify({ 
              type: "chat", 
              username: currentName, 
              text: data.text 
            }));
          });
        }
      }

    } catch (e) {
      console.error("エラー:", e);
    }
  });

  // 【切断処理】
  ws.on("close", () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].members = rooms[currentRoom].members.filter((client) => client.ws !== ws);

      if (rooms[currentRoom].members.length === 0) {
        delete rooms[currentRoom];
      } else {
        const remainingClient = rooms[currentRoom].members[0];
        remainingClient.ws.send(JSON.stringify({ type: "roominfo", otherName: "未接続" }));
        remainingClient.ws.send(JSON.stringify({ type: "system", text: `${currentName} さんが退室しました。` }));
      }
    }
  });
});

// 3. サーバー起動
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});