console.log("client.js loaded");

// WebSocket 接続
const ws = new WebSocket("ws://localhost:8080");
let myId = null;

// 接続
ws.addEventListener("open", () => {
    console.log("connected to server");
});

ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("recv:", data);

    // プレイヤーID受信
    if (data.type === "welcome") {
        myId = data.playerId;
        document.getElementById("info").textContent = `あなた: ${myId}`;
    }

    // ★ puzzle 受信（ここに入れる）
    if (data.type === "puzzle") {
        drawPuzzle(data.puzzle);
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


function drawPuzzle(puzzle) {
    const cells = document.querySelectorAll(".cell");

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const index = r * 9 + c;
            const cell = cells[index];

            if (puzzle[r][c] === 0) {
                cell.textContent = "";
                cell.classList.remove("problem");
            } else {
                cell.textContent = puzzle[r][c];
                cell.classList.add("problem");
            }
        }
    }
}

// --- マスクリック処理 ---
boardContainer.addEventListener("click", (e) => {
    const cell = e.target;
    if (!cell.classList.contains("cell")) return;

    const r = cell.dataset.r;
    const c = cell.dataset.c;

    console.log(`clicked: r=${r}, c=${c}`);

    // ★ サーバーへ送信
    ws.send(JSON.stringify({
        type: "cellClick",
        r: Number(r),
        c: Number(c),
        playerId: myId
    }));
});

let selectedCell = null;

boardContainer.addEventListener("click", (e) => {
    const cell = e.target;
    if (!cell.classList.contains("cell")) return;

    selectedCell = cell;

    // 選択中のマスをハイライト
    document.querySelectorAll(".cell").forEach(c => c.classList.remove("selected"));
    cell.classList.add("selected");
});

document.addEventListener("keydown", (e) => {
    if (!selectedCell) return;

    const key = e.key;

    // 1〜9 以外は無視
    if (!/^[1-9]$/.test(key)) return;

    const r = Number(selectedCell.dataset.r);
    const c = Number(selectedCell.dataset.c);
    const num = Number(key);

    // サーバーへ送信
    ws.send(JSON.stringify({
        type: "placeNumber",
        r,
        c,
        num,
        playerId: myId
    }));
});

ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("recv:", data);

    // 既存の welcome / puzzle / chat はそのまま

    // ★ 数字配置を受信して反映
    if (data.type === "placeNumber") {
        const index = data.r * 9 + data.c;
        const cell = document.querySelectorAll(".cell")[index];

        cell.textContent = data.num;

        // 自分の手は赤、相手は青
        if (data.playerId === myId) {
            cell.style.color = "red";
        } else {
            cell.style.color = "blue";
        }
    }
});
