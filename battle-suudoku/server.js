const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

let nextPlayerId = 1;

wss.on("connection", (ws) => {
    const playerId = `P${nextPlayerId++}`;
    ws.playerId = playerId;

    console.log("connected:", playerId);

    // 初期メッセージ
    ws.send(JSON.stringify({
        type: "welcome",
        playerId
    }));

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);
        console.log("recv:", data);

        // 全員にそのまま返す（テスト用）
        broadcast(data);
    });

    ws.on("close", () => {
        console.log("disconnected:", playerId);
    });
});

function broadcast(obj) {
    const msg = JSON.stringify(obj);
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) {
            c.send(msg);
        }
    });
}

console.log("WebSocket server started on ws://localhost:8080");
