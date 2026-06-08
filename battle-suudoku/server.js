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

// =================================================================
// プレイヤー接続時のメイン処理（ここから丸ごと差し替えてください）
// =================================================================
wss.on("connection", (ws, req) => {
    const playerId = `P${nextPlayerId++}`;
    ws.playerId = playerId;

    // --- 1. 安全なIPアドレスの取得 ---
    let ip = "不明なIP";
    try {
        if (req && req.socket && req.socket.remoteAddress) {
            ip = req.socket.remoteAddress;
            // IPv6射影アドレス（::ffff:192.168.x.x）からIPv4部分を抽出
            if (ip.includes("::ffff:")) {
                ip = ip.split("::ffff:")[1];
            } else if (ip === "::1") {
                ip = "127.0.0.1 (Local)";
            }
        }
    } catch (err) {
        console.error("IP取得エラー:", err);
    }
    ws.playerIp = ip; // サーバー側で記憶

    console.log(`ユーザー接続: ${playerId} (IP: ${ip})`);

    // --- 2. 各プレイヤーへの初期通知 ---
    
    // A. 接続した本人に welcome を送信（IDとIPを伝える）
    ws.send(JSON.stringify({
        type: "welcome",
        playerId: playerId,
        playerIp: ip
    }));

    // B. 他の全員に、新しいプレイヤーの参加（とIP）を通知
    broadcast({
        type: "playerJoined",
        playerId: playerId,
        playerIp: ip
    });

    // C. 新しく入った人に、すでに接続している先輩プレイヤーのIPを教えてあげる
    wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: "playerJoined",
                playerId: client.playerId,
                playerIp: client.playerIp
            }));
        }
    });

    // D. 現在の「パズル問題」を送信
    ws.send(JSON.stringify({
        type: "puzzle",
        puzzle: initialPuzzle
    }));

    // E. 途中参加の場合のため、現在の盤面状況（誰がどこを埋めたか）を同期
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (currentBoard[r][c].num !== 0 && currentBoard[r][c].owner !== "system") {
                ws.send(JSON.stringify({
                    type: "placeNumber",
                    r: r,
                    c: c,
                    num: currentBoard[r][c].num,
                    playerId: currentBoard[r][c].owner
                }));
            }
        }
    }

    // --- 3. 受信メッセージの処理（個別イベント） ---
    ws.on("message", (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
        }

        // server.js の「placeNumber」の処理部分を以下に差し替え

        // ◆ 数字入力の同期と正誤判定
        // ======= server.js: data.type === "placeNumber" の中身を以下に差し替え =======

        if (data.type === "placeNumber") {
            const r = data.r;
            const c = data.c;
            const num = data.num;

            if (initialPuzzle[r][c] !== 0) return;

            if (solutionBoard[r][c] === num) {
                currentBoard[r][c] = { num: num, owner: ws.playerId };
                
                // 1. 正解した数字を全員に同期
                broadcast({
                    type: "placeNumber",
                    r: r,
                    c: c,
                    num: num,
                    playerId: ws.playerId
                });

                // 2. 全マスの埋まり具合と、各プレイヤーの獲得マス数を集計
                let isGameCleared = true;
                const scores = {}; // 各プレイヤーのマス数を入れる箱

                for (let i = 0; i < 9; i++) {
                    for (let j = 0; j < 9; j++) {
                        const cell = currentBoard[i][j];
                        if (cell.num === 0) {
                            isGameCleared = false; // 空白が1つでもあれば未終了
                        } else if (cell.owner !== "system") {
                            // プレイヤーが埋めたマスをカウント
                            scores[cell.owner] = (scores[cell.owner] || 0) + 1;
                        }
                    }
                }

                // 3. すべて埋まったら勝敗を判定して通知
                if (isGameCleared) {
                    const players = Object.keys(scores);
                    let winnerId = null;
                    let isDraw = false;

                    if (players.length === 1) {
                        winnerId = players[0];
                    } else if (players.length > 1) {
                        const p1 = players[0];
                        const p2 = players[1];
                        const s1 = scores[p1] || 0;
                        const s2 = scores[p2] || 0;

                        if (s1 > s2) {
                            winnerId = p1;
                        } else if (s2 > s1) {
                            winnerId = p2;
                        } else {
                            isDraw = true; // 同点
                        }
                    }

                    // 全員に結果を通知
                    broadcast({
                        type: "gameClear",
                        scores: scores,
                        winnerId: winnerId,
                        isDraw: isDraw
                    });

                    // チャット欄へアナウンス
                    let resultText = "🎉 ゲーム終了！ ";
                    if (isDraw) {
                        resultText += "引き分けです！";
                  
                    }
                    
                    broadcast({
                        type: "chat",
                        playerId: "システム",
                        text: resultText
                    });
                }

            } else {
                ws.send(JSON.stringify({
                    type: "penalty",
                    r: r,
                    c: c
                }));
            }
            return;
        }

        // ◆ チャットメッセージの転送
        if (data.type === "chat") {
            broadcast({
                type: "chat",
                playerId: ws.playerId,
                text: data.text
            });
            return;
        }

        // ◆ 「新しい盤面で開始」ボタンの処理
// ======= server.js: data.type === "requestReset" の中の条件分岐を以下に修正 =======

        if (data.type === "requestReset") {
            console.log(`盤面リセットが要求されました（難易度: ${data.difficulty}）`);
            solutionBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
            generateFullBoard(solutionBoard);

            let blanks = 40;
            let difficultyName = "中級";

            // ★ ここに「super_easy」の判定を新しく割り込ませます
            if (data.difficulty === "sudden_death") {
                blanks = 1;
                difficultyName = "⚡早押し勝負 (空白1マス)";
            } else if (data.difficulty === "super_easy") {
                blanks = 5;
                difficultyName = "超初級 (空白5マス)";
            } else if (data.difficulty === "easy") {
                blanks = 30;
                difficultyName = "初級 (空白30マス)";
            } else if (data.difficulty === "normal") {
                blanks = 40;
                difficultyName = "中級 (空白40マス)";
            } else if (data.difficulty === "hard") {
                blanks = 50;
                difficultyName = "上級 (空白50マス)";
            }
            // ...（この後に続く initialPuzzle = makePuzzle(...) などの処理はそのまま）

            initialPuzzle = makePuzzle(solutionBoard, blanks);

            currentBoard = Array.from({ length: 9 }, () => 
                Array(9).fill(null).map(() => ({ num: 0, owner: "system" }))
            );

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (initialPuzzle[r][c] !== 0) {
                        currentBoard[r][c] = { num: initialPuzzle[r][c], owner: "system" };
                    }
                }
            }

            broadcast({
                type: "puzzle",
                puzzle: initialPuzzle
            });

            broadcast({
                type: "chat",
                playerId: "システム",
                text: `🔄 ${ws.playerId} が【${difficultyName}】で盤面をリセット！`
            });
            
            return;
        }
    });

    // --- 4. 切断時の処理 ---
    ws.on("close", () => {
        console.log(`ユーザー切断: ${ws.playerId}`);
        broadcast({
            type: "chat",
            playerId: "システム",
            text: `❌ ${ws.playerId} が退室しました。`
        });
    });
});
// =================================================================
// 接続処理ブロック 終わり
// =================================================================
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