console.log("client.js loaded");

// ==========================================
// 1. WebSocket 接続設定（本番・ローカル自動切り替え版）
// ==========================================
// GitHub Pages（https）からRender（wss）へ安全に繋ぐための設定です
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const host = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? `${window.location.hostname}:8080` // 自分のPCでテストするとき（ポートはserver.jsと合わせます）
    : "battle-sudoku-server.onrender.com"; // ★Renderで発行されるあなたのドメイン名に後で書き換えます

const ws = new WebSocket(`${protocol}//${host}`);

let myId = null;
let selectedCell = null;
let isLocked = false; // エラー時の操作ロックフラグ

const boardContainer = document.getElementById("board-container");

// 最初の一度だけ盤面のHTML（空のマス）を生成
createBoard();

// ==========================================
// 2. 接続・通信イベント処理
// ==========================================
ws.addEventListener("open", () => {
    console.log("connected to server");
});

// サーバーからの受信処理を1つに集約
ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("recv:", data);

    switch (data.type) {

        case "welcome":
            // 自分の情報を反映
            myId = data.playerId;
            document.getElementById("my-status").textContent = `あなた: ${myId} (IP: ${data.playerIp})`;
            break;

        case "playerJoined":
            // 相手の情報を反映
            if (data.playerId !== myId) {
                document.getElementById("other-status").textContent = `相手: ${data.playerId} (IP: ${data.playerIp})`;
            }
            break;

        case "puzzle":
            // 初期盤面（問題）受信（全マスの色が完全リセットされます）
            drawPuzzle(data.puzzle);
            break;

        case "chat":
            // 送信者が「システム」かどうかをチェックして2番目の引数に渡す
            const isSystem = (data.playerId === "system" || data.playerId === "システム");
            addChatMessage(`${data.playerId}: ${data.text}`, isSystem);
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

        case "penalty":
            // サーバーからエラー（重複・間違い）が返ってきたときの処理
            const errIndex = data.r * 9 + data.c;
            const errCell = document.querySelectorAll(".cell")[errIndex];

            // 1. 操作不可（ロック）状態にする
            isLocked = true;

            // 2. 盤面のすぐ上の専用エリアに警告メッセージを表示
            const errorMsgEl = document.getElementById("error-message");
            if (errorMsgEl) {
                errorMsgEl.textContent = "❌ 重複または間違いです！（5秒間操作不可）";
            }

            // 3. マスを赤く光らせて揺らす
            errCell.classList.add("error-shake");
            
            // 4. 6秒後に元に戻す
            setTimeout(() => {
                errCell.classList.remove("error-shake");
                
                // メッセージを消去して元に戻す
                if (errorMsgEl) {
                    errorMsgEl.textContent = "";
                }

                // 操作不可を解除
                isLocked = false;
            }, 6000); 
            break;

case "gameClear":
            // 1. 自分と相手のスコア（マス数）を計算
            const myScore = data.scores[myId] || 0;
            let otherId = "相手";
            let otherScore = 0;
            Object.keys(data.scores).forEach(id => {
                if (id !== myId) {
                    otherId = id;
                    otherScore = data.scores[id];
                }
            });

            // サーバーから届いた間違い回数を取得（なければ0回）
            const p1Penalties = data.penaltyCounts ? (data.penaltyCounts.P1 || 0) : 0;
            const p2Penalties = data.penaltyCounts ? (data.penaltyCounts.P2 || 0) : 0;

            // 👇 ★【追加】自分が P1 か P2 かによって、間違い回数のラベル表記を「あなた/相手」に変換する
            let myPenalties = 0;
            let otherPenalties = 0;

            if (myId === "P1") {
                // 自分が P1 の場合
                myPenalties = p1Penalties;
                otherPenalties = p2Penalties;
            } else {
                // 自分が P2 の場合
                myPenalties = p2Penalties;
                otherPenalties = p1Penalties;
            }

            // 2. メッセージの本文を組み立て
            let alertText = "";
            if (data.isDraw) {
                alertText = `【ゲーム終了：引き分け】\nあなた: ${myScore}マス / 相手: ${otherScore}マス`;
            } else if (data.winnerId === myId) {
                alertText = `🏆【ゲーム終了：あなたの勝利！】🏆\nあなた: ${myScore}マス / 相手: ${otherScore}マス`;
            } else {
                alertText = `💀【ゲーム終了：あなたの敗北…】💀\nあなた: ${myScore}マス / ${otherId}: ${otherScore}マス`;
            }

            // 👇 ★【修正】P1, P2 表記ではなく「あなた」と「相手」に変換してドッキング
            alertText += `\n\n【お手付き回数】\n`;
            alertText += `あなた の間違い: ${myPenalties} 回\n`;
            alertText += `相手 (${otherId}) の間違い: ${otherPenalties} 回`;

            // 3. 結果のポップアップアラートを表示
            alert(alertText);
            
            // 入力をロック
            isLocked = true;
            break;

            // ======= client.js の switch (data.type) の中に追加 =======

        case "playerLeft":
            // 誰かが退室したという通知をサーバーから受信したとき
            // 退室したのが「自分以外（＝相手）」だったら、画面の表示をリセットする
            if (data.playerId !== myId) {
                const otherStatusEl = document.getElementById("other-status");
                if (otherStatusEl) {
                    otherStatusEl.textContent = "相手: (接続を待っています）";
                }
            }
            break;
    }
});

// ==========================================
// 3. チャット送信・管理処理
// ==========================================
// ボタンクリックとEnterキーの両方で使う、共通の送信処理
function performChatSend() {
    const msg = document.getElementById("chat-input").value;
    if (!msg) return;

    ws.send(JSON.stringify({
        type: "chat",
        text: msg,
        playerId: myId
    }));

    document.getElementById("chat-input").value = "";
}

// 1. 送信ボタンがクリックされたとき
document.getElementById("chat-send").addEventListener("click", () => {
    performChatSend();
});

// 2. 入力欄でEnterキーが押されたとき（日本語変換の誤爆防止付き）
document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (e.isComposing) return; // 日本語入力の確定Enterなら送信しない
    performChatSend();
});

// 3. チャット履歴をクリアボタンが押されたとき
document.getElementById("chat-clear").addEventListener("click", () => {
    const box = document.getElementById("chat-box");
    if (box) {
        box.innerHTML = ""; // チャットログをすべて空っぽにする
        addChatMessage("🧹 チャット履歴をクリアしました。", true); // システム通知を出す
    }
});

// ==========================================
// 4. チャットポップアップ（トースト通知）処理
// ==========================================
function addChatMessage(text, isSystem = false) { 
    const box = document.getElementById("chat-box");
    const div = document.createElement("div");
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;

    // プレイヤー同士のチャットの時だけ、画面上部に3秒間ポップアップを出す
    if (!isSystem) {
        // すでに前のポップアップが出ている場合は古いものを消す
        const oldToast = document.getElementById("chat-popup-toast");
        if (oldToast) oldToast.remove();

        // 新しいポップアップ要素の作成
        const toast = document.createElement("div");
        toast.id = "chat-popup-toast";
        toast.textContent = `💬 ${text}`;

        // 画面全体（body）に貼り付け
        document.body.appendChild(toast);

        // 3秒（3000ミリ秒）経ったら自動消滅
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// ==========================================
// 5. 盤面制御・ゲームロジック
// ==========================================

// 空の9×9盤面を生成（初回一度のみ実行）
function createBoard() {
    boardContainer.innerHTML = ""; // 盤面を初期化
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

// 初期問題の描画（ゲーム開始・リセット時）
function drawPuzzle(puzzle) {
    const cells = document.querySelectorAll(".cell");
    
    // 選択状態とエラーによる操作ロックをリセット
    selectedCell = null;
    isLocked = false; 
    
    // 前の試合のエラーメッセージを消去
    const errorMsgEl = document.getElementById("error-message");
    if (errorMsgEl) errorMsgEl.textContent = "";

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const index = r * 9 + c;
            const cell = cells[index];

            // 前の試合の「数字」と「デザインクラス」を完全に解除
            cell.textContent = "";
            cell.classList.remove("problem", "mine", "other", "selected", "error-shake");

            // 新しいパズルの問題データを流し込む
            if (puzzle[r][c] !== 0) {
                cell.textContent = puzzle[r][c];
                cell.classList.add("problem"); // 問題マス（グレー背景）に設定
            }
        }
    }
}
// ==========================================
// 5. 盤面制御・ゲームロジック
// ==========================================

// マスクリック時のイベント処理（★スマホキーボード召喚を追記★）
boardContainer.addEventListener("click", (e) => {
    if (isLocked) return; // 操作不可（ペナルティ中）ならクリックを無視

    const cell = e.target;
    if (!cell.classList.contains("cell")) return;
    
    // 初期問題、またはすでに誰かが正解しているマスは選択不可
    if (cell.classList.contains("problem") || cell.classList.contains("mine") || cell.classList.contains("other")) return;

    selectedCell = cell;

    // 選択されたマスをハイライト
    document.querySelectorAll(".cell").forEach(c => c.classList.remove("selected"));
    cell.classList.add("selected");

    const r = cell.dataset.r;
    const c = cell.dataset.c;
    console.log(`clicked: r=${r}, c=${c}`);

    // 👇 ★【ここを追加】タップした瞬間に裏の隠し入力欄にフォーカスを当てて、スマホの数字キーボードを開く
    const hiddenInput = document.getElementById("hidden-input");
    if (hiddenInput) {
        hiddenInput.value = ""; // 前の文字をクリア
        hiddenInput.focus();    // キーボードを召喚！
    }

    // サーバーへ選択マスの座標を通知
    ws.send(JSON.stringify({
        type: "cellClick",
        r: Number(r),
        c: Number(c),
        playerId: myId
    }));
});

// PC用：キーボードによる数字入力処理（ここは元のまま残します）
document.addEventListener("keydown", (e) => {
    if (isLocked) return; // 操作不可なら入力を無視
    if (!selectedCell) return;
    
    // チャット入力欄に入力中のときは数字の誤爆を防ぐ
    if (document.activeElement === document.getElementById("chat-input")) return;

    const key = e.key;

    // 1〜9 以外のキー入力は無視
    if (!/^[1-9]$/.test(key)) return;

    const r = Number(selectedCell.dataset.r);
    const c = Number(selectedCell.dataset.c);
    const num = Number(key);

    // サーバーへ入力された数字を送信
    ws.send(JSON.stringify({
        type: "placeNumber",
        r,
        c,
        num,
        playerId: myId
    }));
});

// 👇 ★【ここを新しく追加】スマホ用：画面キーボードからの入力を監視する処理 ★ 👇
document.getElementById("hidden-input").addEventListener("input", (e) => {
    if (isLocked || !selectedCell) return;

    // スマホキーボードで入力された最新の1文字を取得
    const val = e.target.value;
    const key = val.charAt(val.length - 1);

    // 1〜9 の数字じゃなければ無視
    if (!/^[1-9]$/.test(key)) {
        e.target.value = ""; // 変な文字なら消す
        return;
    }

    const r = Number(selectedCell.dataset.r);
    const c = Number(selectedCell.dataset.c);
    const num = Number(key);

    console.log(`スマホキーボード入力: r=${r}, c=${c}, num=${num}`);

    // サーバーへ入力された数字を送信
    ws.send(JSON.stringify({
        type: "placeNumber",
        r,
        c,
        num,
        playerId: myId
    }));

    // 次の入力に備えて、隠し入力欄の中身を空っぽに戻しておく
    e.target.value = "";
});

// リセットボタンクリック時の処理
document.getElementById("reset-btn").addEventListener("click", () => {
    // 選択されている難易度（"easy", "normal", "hard"）を取得
    const selectedDifficulty = document.getElementById("difficulty-select").value;

    if (confirm("盤面をリセットして、新しいゲームを開始しますか？")) {
        ws.send(JSON.stringify({
            type: "requestReset",
            difficulty: selectedDifficulty
        }));
    }
});