const http = require("http");
const fs = require("fs");
const path = require("path"); // 階層問題を解決するためのモジュール
const { WebSocketServer } = require("ws");

// 1. HTTPサーバーの設定（HTML/CSS/JavaScriptをブラウザに返す）
const server = http.createServer((req, res) => {
  // アクセスされたURLに応じて、読み込むファイルを決定
  let urlPath = req.url === "/" ? "/index.html" : req.url;
  
  // 【超重要】__dirname（このserver.jsがあるフォルダ）を基準にファイルの絶対パスを作る
  let filePath = path.join(__dirname, urlPath);
  
  // 拡張子チェック
  const ext = path.extname(filePath).toLowerCase();
  const map = { 
    ".html": "text/html; charset=utf-8", 
    ".css": "text/css; charset=utf-8", 
    ".js": "text/javascript; charset=utf-8" 
  };
  const contentType = map[ext] || "text/plain; charset=utf-8";

  // ファイルを読み込んでブラウザに送る
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

// 部屋ごとの接続を管理するオブジェクト
const rooms = {};

wss.on("connection", (ws) => {
  let currentRoom = null;
  let currentName = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // 【入室処理】
      if (data.type === "join") {
        currentRoom = data.room;
        currentName = data.username;

        if (!rooms[currentRoom]) {
          rooms[currentRoom] = [];
        }

        // 定員2人のチェック
        if (rooms[currentRoom].length >= 2) {
          ws.send(JSON.stringify({ type: "system", text: "この部屋は満室（2人）です。入室できません。" }));
          ws.close();
          return;
        }

        // 部屋に参加
        rooms[currentRoom].push({ ws, name: currentName });

        // 自分に歓迎メッセージ
        ws.send(JSON.stringify({ type: "system", text: `${currentRoom} の部屋に入室しました。` }));

        // お互いの名前を確認して通知
        const members = rooms[currentRoom];
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
        if (rooms[currentRoom]) {
          rooms[currentRoom].forEach((client) => {
            if (client.ws !== ws) {
              client.ws.send(JSON.stringify({ type: "chat", text: data.text }));
            }
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
      rooms[currentRoom] = rooms[currentRoom].filter((client) => client.ws !== ws);

      if (rooms[currentRoom].length === 0) {
        delete rooms[currentRoom];
      } else {
        const remainingClient = rooms[currentRoom][0];
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