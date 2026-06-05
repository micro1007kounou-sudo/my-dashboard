const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

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

wss.on("connection", (ws) => {
    console.log("client connected");

    ws.send(JSON.stringify({ type: "hello", text: "サーバーに接続しました！" }));

    ws.on("message", (msg) => {
        console.log("recv:", msg.toString());
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        });
    });
});

server.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});
