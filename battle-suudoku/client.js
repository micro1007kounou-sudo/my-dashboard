console.log("client.js loaded");

// WebSocket 接続
const ws = new WebSocket("ws://localhost:8080");
let myId = null;

// 接続
ws.addEventListener("open", () => {
    console.log("connected to server");
});

// メッセージ受信
ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("recv:", data);

    // プレイヤーID受信
    if (data.type === "welcome") {
        myId = data.playerId;
        document.getElementById("info").textContent = `あなた: ${myId}`;
    }

    // チャット受信
    if (data.type === "chat") {
        addChatMessage(`${data.playerId}: ${data.text}`);
    }
});

// チャット送信
document.getElementById("chat-send").addEventListener("click", () => {
    const msg = document.getElementById("chat-input").value;
    if (!msg) return;

    ws.send(JSON.stringify({
        type: "chat",
        text: msg,
        playerId: myId
    }));

    document.getElementById("chat-input").value = "";
});

// チャット表示
function addChatMessage(text) {
    const box = document.getElementById("chat-box");
    const div = document.createElement("div");
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

// --- 盤面生成（今は空の9×9） ---
const boardContainer = document.getElementById("board-container");

function createBoard() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.textContent = "";
            boardContainer.appendChild(cell);
        }
    }
}

createBoard();
