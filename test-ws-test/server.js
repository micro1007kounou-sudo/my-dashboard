// server.js
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
    console.log("client connected");

    ws.send(JSON.stringify({ type: "hello", text: "サーバーに接続しました！" }));

    ws.on("message", (msg) => {
        console.log("recv:", msg.toString());

        // 受け取ったメッセージを全員に返す
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        });
    });
});

console.log("WebSocket server running on ws://localhost:8080");
