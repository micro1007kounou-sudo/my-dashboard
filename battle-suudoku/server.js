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

// ★ connection は 1 回だけ（ここが最重要）
wss.on("connection", (ws) => {
    const playerId = `P${nextPlayerId++}`;
    ws.playerId = playerId;

    // --- 完成盤面を作る ---
    let board = Array.from({ length: 9 }, () => Array(9).fill(0));
    generateFullBoard(board);

    // --- 空白数を決める ---
    let difficulty = "normal";
    let blanks = 40;
    if (difficulty === "easy") blanks = 30;
    if (difficulty === "normal") blanks = 40;
    if (difficulty === "hard") blanks = 50;

    // --- puzzle を作る ---
    let puzzle = makePuzzle(board, blanks);

    // --- puzzle を送信 ---
    ws.send(JSON.stringify({
        type: "puzzle",
        puzzle: puzzle
    }));

    // --- welcome を送信 ---
    ws.send(JSON.stringify({
        type: "welcome",
        playerId
    }));

    // --- メッセージ処理（チャット・クリックなど） ---
    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        // ★ cellClick のログ（動作確認用）
        if (data.type === "cellClick") {
            console.log(`player ${data.playerId} clicked r=${data.r}, c=${data.c}`);
        }
if (data.type === "placeNumber") {
    console.log(`player ${data.playerId} placed ${data.num} at r=${data.r}, c=${data.c}`);
}

        // 全員にブロードキャスト
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });
});

server.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});

// --- Sudoku 生成ロジック ---
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
