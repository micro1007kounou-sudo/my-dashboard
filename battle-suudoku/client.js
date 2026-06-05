console.log("client.js loaded");

// WebSocket 接続
const ws = new WebSocket("ws://localhost:8080");
let myId = null;
let selectedCell = null;
let isLocked = false; // ★エラー時の操作ロックフラグ

const boardContainer = document.getElementById("board-container");

// 最初の一度だけ盤面のHTML（空のマス）を生成
createBoard();

// ーーー 接続・通信イベント ーーー
ws.addEventListener("open", () => {
    console.log("connected to server");
});

// 受信処理を1つに集約
ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("recv:", data);

    switch (data.type) {


        case "welcome":
            // 自分の情報を反映
            myId = data.playerId;
            // HTMLの「my-status」の文字を書き換える
            document.getElementById("my-status").textContent = `あなた: ${myId} (IP: ${data.playerIp})`;
            break;

        case "playerJoined":
            // 相手の情報を反映
            if (data.playerId !== myId) {
                // HTMLの「other-status」の文字を書き換える
                document.getElementById("other-status").textContent = `相手: ${data.playerId} (IP: ${data.playerIp})`;
            }
            break;
        case "puzzle":
            // 初期盤面（問題）受信
            drawPuzzle(data.puzzle);
            break;

        case "chat":
            // チャット受信
            addChatMessage(`${data.playerId}: ${data.text}`);
            break;

        case "placeNumber":
            // 正解の数字配置を受信して反映
            const index = data.r * 9 + data.c;
            const cell = document.querySelectorAll(".cell")[index];

            // すでに問題マス（変更不可）なら処理しない
            if (cell.classList.contains("problem")) return;

            cell.textContent = data.num;

            // 前についていた陣取り・エラークラスをリセット
            cell.classList.remove("mine", "other", "error-shake");

            // 自分の手なら「mine（赤背景）」、相手なら「other（青背景）」を付与
            if (data.playerId === myId) {
                cell.classList.add("mine");
            } else {
                cell.classList.add("other");
            }
            break;

        case "inputError":
            // サーバーからエラー（重複・間違い）が返ってきたときの処理
            const errIndex = data.r * 9 + data.c;
            const errCell = document.querySelectorAll(".cell")[errIndex];

            // 1. 操作不可（ロック）状態にする
            isLocked = true;

            // 2. 画面上のinfo欄にメッセージを表示
            const infoEl = document.getElementById("info");
            const originalText = infoEl.textContent; // 元の「あなた: P1」などを保存
            infoEl.textContent = "❌ 重複または間違いです！（5秒間操作不可）";
            infoEl.style.color = "red";
            infoEl.style.fontWeight = "bold";

            // 3. マスを赤く光らせて揺らす
            errCell.classList.add("error-shake");
            
            // 4. 5秒後（5000ミリ秒後）に元に戻す
            setTimeout(() => {
                errCell.classList.remove("error-shake");
                
                // メッセージとスタイルを元に戻す
                infoEl.textContent = originalText;
                infoEl.style.color = "";
                infoEl.style.fontWeight = "";

                // 操作不可を解除
                isLocked = false;
            }, 5000); 
            break;
    }
});

// ーーー チャット送信処理 ーーー
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

function addChatMessage(text) {
    const box = document.getElementById("chat-box");
    const div = document.createElement("div");
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

// ーーー 盤面制御ロジック ーーー

// 空の9×9盤面を生成
function createBoard() {
    boardContainer.innerHTML = ""; // 念のため初期化
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

// 初期問題の描画
function drawPuzzle(puzzle) {
    const cells = document.querySelectorAll(".cell");

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const index = r * 9 + c;
            const cell = cells[index];

            if (puzzle[r][c] === 0) {
                cell.textContent = "";
                cell.classList.remove("problem", "mine", "other", "error-shake");
            } else {
                cell.textContent = puzzle[r][c];
                cell.classList.add("problem");
            }
        }
    }
}

// マスクリック処理
boardContainer.addEventListener("click", (e) => {
    if (isLocked) return; // ★操作不可ならクリックを無視

    const cell = e.target;
    if (!cell.classList.contains("cell")) return;
    
    // 初期問題のマス、またはすでに誰かが正解しているマスは選択させない
    if (cell.classList.contains("problem") || cell.classList.contains("mine") || cell.classList.contains("other")) return;

    selectedCell = cell;

    // 選択中のマスをハイライト
    document.querySelectorAll(".cell").forEach(c => c.classList.remove("selected"));
    cell.classList.add("selected");

    const r = cell.dataset.r;
    const c = cell.dataset.c;
    console.log(`clicked: r=${r}, c=${c}`);

    // サーバーへクリック通知
    ws.send(JSON.stringify({
        type: "cellClick",
        r: Number(r),
        c: Number(c),
        playerId: myId
    }));
});

// キーボード入力処理
document.addEventListener("keydown", (e) => {
    if (isLocked) return; // ★操作不可なら入力を無視
    if (!selectedCell) return;
    
    // チャット入力欄にフォーカスがある時は数字入力を無視する（誤爆防止）
    if (document.activeElement === document.getElementById("chat-input")) return;

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

// ====== client.js の一番最後にあるリセットボタンの処理を差し替え ======

// リセットボタンが押されたら難易度を添えてサーバーへ通知
document.getElementById("reset-btn").addEventListener("click", () => {
    if (isLocked) return; 

    // セレクトボックスから選択されている難易度（"easy", "normal", "hard"）を取得
    const selectedDifficulty = document.getElementById("difficulty-select").value;

    if (confirm("盤面をリセットして、新しいゲームを開始しますか？")) {
        ws.send(JSON.stringify({
            type: "requestReset",
            difficulty: selectedDifficulty // ★難易度をサーバーに送る
        }));
    }
});