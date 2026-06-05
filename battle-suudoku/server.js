const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// HTTP サーバー
const server = http.createServer((req, res) => {
    let filePath = "." + req.url;

    // ★ ここを index.html に固定する（重要）
    if (filePath === "./") filePath = "./index.html";

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

    ws.send(JSON.stringify({
        type: "welcome",
        playerId
    }));

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });
});

server.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});
