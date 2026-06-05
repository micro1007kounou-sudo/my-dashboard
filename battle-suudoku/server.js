const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// HTTP サーバー
const server = http.createServer((req, res) => {
    let filePath = "." + req.url;
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

// ==========================================
// ★ 盤面データをグローバルで管理（接続ごとに初期化させない）
// ==========================================
let solutionBoard = Array.from({ length: 9 }, () => Array(9).fill(0)); // 正解の盤面
generateFullBoard(solutionBoard); // 正解を生成

let initialPuzzle = makePuzzle(solutionBoard, 40); // 初期問題（0が空白）

// 現在のリアルタイム盤面の状態（誰がどの数字を埋めたか、初期問題で初期化）
// 構造: { num: 数字, owner: "P1"などのプレイヤーID }
let currentBoard = Array.from({ length: 9 }, () => 
    Array(9).fill(null).map(() => ({ num: 0, owner: "system" }))
);

// 初期盤面の数字を現在の状態にセット
for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
        if (initialPuzzle[r][c] !== 0) {
            currentBoard[r][c] = { num: initialPuzzle[r][c], owner: "system" };
        }
    }
}

// WebSocket 接続時の処理
wss.on("connection", (ws) => {
    const playerId = `P${nextPlayerId++}`;
    ws.playerId = playerId;

    console.log(`Player connected: ${playerId}`);

    // 1. welcome を送信（IDの通知）
    ws.send(JSON.stringify({
        type: "welcome",
        playerId
    }));

    // 2. 共有の「初期パズル（問題）」を送信
    ws.send(JSON.stringify({
        type: "puzzle",
        puzzle: initialPuzzle
    }));

    // 3. すでにゲームが始まっている場合、現在までに埋まっているマスを同期する
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            // 初期問題以外のマスで、すでに誰かが正解しているマスがあれば通知
            if (currentBoard[r][c].num !== 0 && currentBoard[r][c].owner !== "system") {
                ws.send(JSON.stringify({
                    type: "placeNumber",
                    r,
                    c,
                    num: currentBoard[r][c].num,
                    playerId: currentBoard[r][c].owner
                }));
            }
        }
    }

    // メッセージ処理（チャット・クリックなど）
    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        // 動作確認用ログ
        if (data.type === "cellClick") {
            console.log(`player ${data.playerId} clicked r=${data.r}, c=${data.c}`);
            return; // クリックログは全員に送る必要がないのでここで終了
        }
        // ====== server.js の ws.on("message", ...) 内に追加 ======

        // --- 盤面リセット要求の処理 ---
        if (data.type === "requestReset") {
            console.log(`盤面リセットが要求されました（送信者: ${ws.playerId}, 難易度: ${data.difficulty}）`);

            // 1. 新しい正解盤面を生成
            solutionBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
            generateFullBoard(solutionBoard);

            // 2. 送られてきた難易度に応じて空白数を決定（デフォルトは40）
            let blanks = 40;
            let difficultyName = "中級";

            if (data.difficulty === "easy") {
                blanks = 30;
                difficultyName = "初級 (空白30マス)";
            } else if (data.difficulty === "normal") {
                blanks = 40;
                difficultyName = "中級 (空白40マス)";
            } else if (data.difficulty === "hard") {
                blanks = 50;
                difficultyName = "上級 (空白50マス)";
            }

            // 3. 新しい初期問題を指定された空白数で生成
            initialPuzzle = makePuzzle(solutionBoard, blanks);

            // 4. 現在のリアルタイム盤面（所有者データ）をリセット
            currentBoard = Array.from({ length: 9 }, () => 
                Array(9).fill(null).map(() => ({ num: 0, owner: "system" }))
            );

            // 初期パズルの数字をセット
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (initialPuzzle[r][c] !== 0) {
                        currentBoard[r][c] = { num: initialPuzzle[r][c], owner: "system" };
                    }
                }
            }

            // 5. 全員に新しいパズルを送り、画面を上書きさせる
            broadcast({
                type: "puzzle",
                puzzle: initialPuzzle
            });

            // チャットへのシステム通知にも難易度を表示
            broadcast({
                type: "chat",
                playerId: "システム",
                text: `🔄 ${ws.playerId} が難易度【${difficultyName}】で盤面をリセットしました！`
            });
            
            return;
        }
        // --- 数字が入力された時の処理 ---
        if (data.type === "placeNumber") {
            const { r, c, num, playerId } = data;

            // すでに埋まっているマス、または初期問題のマスなら完全に無視
            if (currentBoard[r][c].num !== 0) return;

            // 【チェック1】数独のルールとして矛盾していないか（重複チェック）
            let tempBoard = currentBoard.map(row => row.map(cell => cell.num));
            if (!isValid(tempBoard, r, c, num)) {
                console.log(`[矛盾入力] ${playerId} try ${num} at r=${r}, c=${c} (重複あり)`);
                
                // 矛盾しているため、本人にだけ「入力失敗」を通知
                ws.send(JSON.stringify({
                    type: "inputError",
                    r,
                    c,
                    reason: "conflict"
                }));
                return;
            }

            // 【チェック2】サーバー側の完成盤面（正解）と一致しているか
            const correctAnswer = solutionBoard[r][c];

            if (num === correctAnswer) {
                console.log(`[正解] ${playerId} placed ${num} at r=${r}, c=${c}`);
                
                // サーバーの現在の状態を更新
                currentBoard[r][c] = { num, owner: playerId };

                // 正解した時だけ、全員にブロードキャスト（陣地獲得！）
                broadcast({
                    type: "placeNumber",
                    r,
                    c,
                    num,
                    playerId
                });
            } else {
                console.log(`[間違い] ${playerId} try ${num} at r=${r}, c=${c} (答えが違う)`);
                
                // 答えが違うため、本人にだけ「入力失敗」を通知
                ws.send(JSON.stringify({
                    type: "inputError",
                    r,
                    c,
                    reason: "wrong"
                }));
            }
            return;
        }

// =========================================================================




        // チャットなどはそのまま全員にブロードキャスト
        broadcast(data);
    });
});

// 全員にデータを送るヘルパー関数
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

server.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});

// --- Sudoku 生成ロジック (変更なし) ---
function generateFullBoard(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                let nums = [1,2,3,4,5,6,7,8,9];
                shuffle(nums);
                for (let num of nums) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        if (generateFullBoard(board)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function isValid(board, r, c, num) {
    for (let i = 0; i < 9; i++) {
        if (board[r][i] === num) return false;
        if (board[i][c] === num) return false;
    }
    let br = Math.floor(r / 3) * 3;
    let bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[br + i][bc + j] === num) return false;
        }
    }
    return true;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function makePuzzle(fullBoard, blanks) {
    let puzzle = JSON.parse(JSON.stringify(fullBoard));
    let count = blanks;
    while (count > 0) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== 0) {
            puzzle[r][c] = 0;
            count--;
        }
    }
    return puzzle;
}