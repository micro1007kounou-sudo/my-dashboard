console.log("client.js loaded");

// WebSocket 接続
// ====== client.js の 2行目を以下に書き換え ======

// アクセス元のURLからIPアドレス（ホスト名）を自動取得してWebSocketのURLを組み立てる
const ws = new WebSocket(`ws://${window.location.hostname}:8080`);
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
            // 初期盤面（問題）受信（この中で全マスの色が完全リセットされます）
            drawPuzzle(data.puzzle);
            break;

// ======= client.js: switch文の中の case "chat": を以下のように修正 =======

        case "chat":
            // 送信者が「システム」かどうかをチェックして2番目の引数に渡す（true または false）
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
            
            // 4. 6秒後（6000ミリ秒後）に元に戻す
            setTimeout(() => {
                errCell.classList.remove("error-shake");
                
                // メッセージを消去して元に戻す
                if (errorMsgEl) {
                    errorMsgEl.textContent = "";
                }

                // 操作不可を解除
                isLocked = false;5
            }, 6000); 
            break;
        // ======= client.js: switch文の中に追加 =======

// ======= client.js: switch文の中の case "gameClear": を以下に差し替え =======

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

            // 2. メッセージの本文を組み立て
            let alertText = "";
            if (data.isDraw) {
                alertText = `【ゲーム終了：引き分け】\nあなた: ${myScore}マス / 相手: ${otherScore}マス`;
            } else if (data.winnerId === myId) {
                alertText = `🏆【ゲーム終了：あなたの勝利！】🏆\nあなた: ${myScore}マス / 相手: ${otherScore}マス`;
            } else {
                alertText = `💀【ゲーム終了：あなたの敗北…】💀\nあなた: ${myScore}マス / ${otherId}: ${otherScore}マス`;
            }

            // ★ 3. リセットのときと同じ、浮き上がるメッセージボックス（アラート）を表示！
            alert(alertText);
            
            // 入力をロック
            isLocked = true;
            break; 
    }
});
// ーーー チャット送信処理 ーーー

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

// 2. 入力欄でEnterキーが押されたとき（誤爆防止付き）
document.getElementById("chat-input").addEventListener("keydown", (e) => {
    // Enterキー以外の入力なら何もしない
    if (e.key !== "Enter") return;

    // 日本語入力の「変換を確定するためのEnter」なら送信せずに無視する
    if (e.isComposing) return;

    // 確定した状態でEnterが押されたら送信を実行
    performChatSend();
});
// ====== client.js の チャット送信処理のすぐ下に追加 ======

// 3. チャット履歴をクリアボタンが押されたとき
document.getElementById("chat-clear").addEventListener("click", () => {
    const box = document.getElementById("chat-box");
    if (box) {
        box.innerHTML = ""; // チャットログの文字（HTML）をすべて空っぽにする
        addChatMessage("🧹 チャット履歴をクリアしました。", true); // 分かりやすいように通知
    }
});
// ======= client.js: addChatMessage 関数を以下のように修正 =======

// ======= client.js: addChatMessage 関数を以下に丸ごと差し替え =======

function addChatMessage(text, isSystem = false) { 
    const box = document.getElementById("chat-box");
    const div = document.createElement("div");
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;

    // ─── ★ ここからポップアップの処理 ───
    
    // システム以外の「プレイヤー同士のチャット」の時だけポップアップを出す
    if (!isSystem) {
        // すでに前のポップアップが出ている場合は古いものを消す
        const oldToast = document.getElementById("chat-popup-toast");
        if (oldToast) oldToast.remove();

        // 新しいポップアップ用の要素を作る
        const toast = document.createElement("div");
        toast.id = "chat-popup-toast";
        toast.textContent = `💬 ${text}`;

        // 画面全体（body）に貼り付ける（これで確実に表示されます！）
        document.body.appendChild(toast);

        // 2秒で自動消滅するようにしました！
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
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
    
    // 選択状態（selected）も引き継がせないようにリセット
    selectedCell = null;
    isLocked = false; // ★ ここを追加！新しいゲーム開始時にロックを解除する
    // 新しいゲームが始まったら、古いエラーメッセージも消しておく
    const errorMsgEl = document.getElementById("error-message");
    if (errorMsgEl) errorMsgEl.textContent = "";

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const index = r * 9 + c;
            const cell = cells[index];

            // 新しい数字を入れる前に、前の試合の「数字」と「すべての色クラス」を完全に剥ぎ取る
            cell.textContent = "";
            cell.classList.remove("problem", "mine", "other", "selected", "error-shake");

            // その上で、今回の新しいパズルのデータを流し込む
            if (puzzle[r][c] !== 0) {
                cell.textContent = puzzle[r][c];
                cell.classList.add("problem"); // 新しい問題マス化（グレー）
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

// リセットボタンが押されたら難易度を添えてサーバーへ通知
document.getElementById("reset-btn").addEventListener("click", () => {

    // セレクトボックスから選択されている難易度（"easy", "normal", "hard"）を取得
    const selectedDifficulty = document.getElementById("difficulty-select").value;

    if (confirm("盤面をリセットして、新しいゲームを開始しますか？")) {
        ws.send(JSON.stringify({
            type: "requestReset",
            difficulty: selectedDifficulty
        }));
    }
});