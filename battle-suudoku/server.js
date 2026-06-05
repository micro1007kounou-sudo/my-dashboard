const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// HTTP サーバー（battle.html / css / js を配信）
const server = http.createServer((req, res) => {
    let filePath = "." + req.url;
    if (filePath === "./") filePath = "./battle.html";

    const ext = path.extname(filePath);
    const map = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript"
    };

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not found");
        } else {
            res.writeHead(200, { "Content-Type": map[ext] || "text/plain" });
            res.end(data);
        }
    });
});

// WebSocket サーバー
const wss = new WebSocket.Server({ server });

let nextPlayerId = 1;

wss.on("connection", (ws) => {
    const playerId = `P${nextPlayerId++}`;
    ws.playerId = playerId;

    console.log("connected:", playerId);

    // 初回メッセージ
    ws.send(JSON.stringify({
        type: "welcome",
        playerId
    }));

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);
        console.log("recv:", data);

        // 全員にブロードキャスト
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });

    ws.on("close", () => {
        console.log("disconnected:", playerId);
    });
});

server.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});
