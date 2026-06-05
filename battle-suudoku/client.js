console.log("client.js loaded");


// 9×9 の盤面を作る（対戦版）
function createBoard() {
    const container = document.getElementById("board-container");
    container.innerHTML = ""; // 初期化

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {

            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.r = r;
            cell.dataset.c = c;

            // クリックで数字入力（後で WebSocket 送信に置き換える）
            cell.addEventListener("click", () => {
                handleCellClick(r, c);
            });

            container.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    const value = prompt("数字を入力 (1-9)");
    if (!value) return;

    const num = Number(value);
    if (num < 1 || num > 9) return;

    // ★ 今は仮でクライアント側に直接反映（後で削除）
    const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    cell.textContent = num;
}

console.log("client.js loaded");

// WebSocket 接続
const ws = new WebSocket("ws://localhost:8080");
let myId = null;

ws.addEventListener("open", () => {
    console.log("connected to server");
});

ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("recv:", data);

    if (data.type === "welcome") {
        myId = data.playerId;
        document.getElementById("info").textContent = `あなた: ${myId}`;
    }

    // テスト：サーバーからのメッセージをチャット欄に表示
    if (data.type === "chat") {
        addChatMessage(data.message);
    }
});

document.getElementById("chat-send").addEventListener("click", () => {
    const msg = document.getElementById("chat-input").value;
    if (!msg) return;

    ws.send(JSON.stringify({
        type: "chat",
        message: msg,
        playerId: myId
    }));

    document.getElementById("chat-input").value = "";
});

function addChatMessage(text) {
    const box = document.getElementById("chat-box");
    const div = document.createElement("div");
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}
