const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
// 📄 server.js の最上部（ライブラリ読み込みの下など）
const TIMEOUT_LIMIT = 2 * 60 * 60 * 1000; // 2時間をミリ秒に変換 (7200000ms)
// セキュリティ: 許可するオリジンを環境変数で指定可能（カンマ区切り）
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
// 簡易レートリミッタ設定
const RATE_LIMIT_WINDOW_MS = 10 * 1000; // 集計ウィンドウ（ミリ秒）
const RATE_LIMIT_MAX = 20; // ウィンドウ内の最大メッセージ数
const RATE_LIMIT_PENALTY_MS = 5 * 1000; // 違反時の一時ブロック時間
const RATE_LIMIT_MAX_VIOLATIONS = 5; // 繰り返し違反で強制切断

// ==========================================
// 1. サーバーポート設定（本番・ローカル自動対応）
// ==========================================
// Render環境なら提供されるポートを使い、自分のPCなら8080番を使います
const PORT = process.env.PORT || 8080;

// HTTP サーバー（ローカルテストのファイル読み込み用・本番でもお守りとして機能します）
const server = http.createServer((req, res) => {
    try {
        // ベースディレクトリ（このサーバーを起動したディレクトリ）に限定して配信する
        const baseDir = path.resolve('.');

        // 危険なパスを正規化して基底より外なら拒否する
        let reqPath = req.url || '/';
        if (reqPath === '/') reqPath = '/index.html';

        // クエリやハッシュを排除
        reqPath = reqPath.split('?')[0].split('#')[0];

        const resolvedPath = path.resolve(path.join(baseDir, '.' + reqPath));
        if (!resolvedPath.startsWith(baseDir + path.sep) && resolvedPath !== baseDir) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        // 拡張子によって Content-Type を設定
        const ext = path.extname(resolvedPath).toLowerCase();
        const map = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        };

        // ディレクトリだったら index.html を探す
        let servePath = resolvedPath;
        if (fs.existsSync(servePath) && fs.statSync(servePath).isDirectory()) {
            servePath = path.join(servePath, 'index.html');
        }

        if (!fs.existsSync(servePath)) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        const content = fs.readFileSync(servePath);
        res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
        res.end(content);
    } catch (err) {
        res.writeHead(500);
        res.end('Server error');
    }
});

// WebSocket サーバーの紐づけ
const wss = new WebSocket.Server({ server });


// ==========================================
// 2. 盤面データのグローバル管理
// ==========================================
let solutionBoard = Array.from({ length: 9 }, () => Array(9).fill(0)); // 正解の盤面
generateFullBoard(solutionBoard); // 正解を自動生成（※ロジックは後半部分に連動）

let initialPuzzle = makePuzzle(solutionBoard, 40); // 初期問題（中級：空白40マスで初期化）

// 現在のリアルタイム盤面の状態（誰がどの数字を埋めたかを記憶）
// 構造: { num: 数字, owner: プレイヤーID }
let currentBoard = Array.from({ length: 9 }, () => 
    Array(9).fill(null).map(() => ({ num: 0, owner: "system" }))
);

// 初期盤面の数字を現在のリアルタイム状態に同期
for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
        if (initialPuzzle[r][c] !== 0) {
            currentBoard[r][c] = { num: initialPuzzle[r][c], owner: "system" };
        }
    }
}
// 👇 【追加】プレイヤーごとの間違い回数を記録するオブジェクト
let penaltyCounts = { P1: 0, P2: 0 };


// ==========================================
// 3. プレイヤー接続時のメイン処理（2時間自動キック融合版）
// ==========================================
wss.on("connection", (ws, req) => {

    // ─── 👇 【修正】2時間タイマーの管理ポケットと延長関数 ───
    ws.timeoutTimer = null;

    function resetTimeout() {
        if (ws.timeoutTimer) clearTimeout(ws.timeoutTimer); // 既存のタイマーをリセット

        // 新しく2時間（2 * 60 * 60 * 1000 ミリ秒）のカウントダウンをスタート
        ws.timeoutTimer = setTimeout(() => {
            console.log(`[自動キック] 2時間無操作のため、${ws.playerId || '未確定プレイヤー'} を強制切断します`);
            try {
                // クライアントのチャット欄に通知を送る
                ws.send(JSON.stringify({ 
                    type: "chat", 
                    playerId: "システム", 
                    text: "🚨 2時間操作がなかったため、自動的に接続が切断されました。" 
                }));
            } catch (e) { /* すでに切断されている場合は無視 */ }
            
            ws.close(); // 接続を強制遮断
        }, 2 * 60 * 60 * 1000); // 👈 【変更】TIMEOUT_LIMIT から「2時間（ミリ秒）」に直接書き換え
    }

    // 入室した瞬間から、最初の2時間のカウントダウンを開始
    resetTimeout();
    // ─── 👆 【修正ここまで】 ───

    // レートリミッタ用の初期化
    ws.msgTimestamps = [];
    ws.rateViolations = 0;
    ws.isRateLimited = false;


    // 👇 ★【リロード対策版】満員チェックロジックに書き換え ★ 👇
    // 実際に「通信が完全に開いている（OPEN）プレイヤー」の数を数える
    let activePlayers = 0;
    wss.clients.forEach(client => {
        // 自分自身（まだ処理中の新しい接続）以外の、すでに動いているクライアントを数える
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            activePlayers++;
        }
    });

    // すでに2人のアクティブなプレイヤーがいる場合は、3人目として弾く
    if (activePlayers >= 2) {
        console.log(`接続拒否: 満員です（現在のアクティブ人数: ${activePlayers}人）`);
        
        ws.send(JSON.stringify({
            type: "chat",
            playerId: "システム",
            text: "🚨 現在他のプレイヤーが対戦中です。満員のため接続できません。"
        }));
        
        setTimeout(() => {
            if (ws.timeoutTimer) clearTimeout(ws.timeoutTimer); // 弾かれた場合はタイマーを消去
            ws.close();
        }, 1000);
        return; 
    }

    // 👇 ★【追加】常に P1 または P2 の空いている方を割り当てるロジック ★ 👇
    // 現在接続中のプレイヤーのIDを調べる
    let hasP1 = false;
    let hasP2 = false;
    wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            if (client.playerId === "P1") hasP1 = true;
            if (client.playerId === "P2") hasP2 = true;
        }
    });

    // 空いている方を割り当てる（両方いなければP1）
    const playerId = !hasP1 ? "P1" : "P2";
    ws.playerId = playerId;
    // 👆 ★【ここまで】★ 👆


    // --- 安全なIPアドレスの取得 ---
    let ip = "不明なIP";
    try {
        // 👇 ★ここから書き換え★ Renderの玄関口サーバーが渡してくれる本物のIPをチェック
        if (req && req.headers && req.headers["x-forwarded-for"]) {
            // カンマ区切りで複数入っていることがあるので、先頭（一番最初の送信元）を取得
            ip = req.headers["x-forwarded-for"].split(",")[0].trim();
        } else if (req && req.socket && req.socket.remoteAddress) {
            // ローカル環境（自分のPC）などの場合は今まで通りここを通る
            ip = req.socket.remoteAddress;
        }

        // IPv6射影アドレス（::ffff:192.168.x.x）からIPv4部分を抽出
        if (ip.includes("::ffff:")) {
            ip = ip.split("::ffff:")[1];
        } else if (ip === "::1" || ip === "127.0.0.1") {
            ip = "127.0.0.1 (Local)";
        }
        // 👆 ★ここまで★
        
    } catch (err) {
        console.error("IP取得エラー:", err);
    }
    ws.playerIp = ip;

    console.log(`ユーザー接続: ${playerId} (IP: ${ip})`);

    // オリジン制限: 環境変数で許可ドメインが設定されている場合は拒否する
    try {
        const origin = req && req.headers && (req.headers.origin || req.headers.Origin);
        if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
            console.warn(`接続拒否: 許可されていないOrigin ${origin}`);
            try { ws.send(JSON.stringify({ type: 'chat', playerId: 'システム', text: '接続元ドメインが許可されていません' })); } catch (e) {}
            ws.close(1008, 'Origin not allowed');
            return;
        }
    } catch (e) { /* チェックに失敗しても続行 */ }

    // --- 各プレイヤーへの初期データ通知 ---
    
    // 接続した本人に welcome を送信（IDとIPを通知）
    ws.send(JSON.stringify({
        type: "welcome",
        playerId: playerId,
        playerIp: ip
    }));

    // 他の全員に、新しいプレイヤーの参加を通知
    broadcast({
        type: "playerJoined",
        playerId: playerId,
        playerIp: ip
    });

    // 新しく入った人に、すでに接続している先輩プレイヤーの情報を教えて同期
    wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: "playerJoined",
                playerId: client.playerId,
                playerIp: client.playerIp
            }));
        }
    });

    // 現在の「パズル初期問題」を送信
    ws.send(JSON.stringify({
        type: "puzzle",
        puzzle: initialPuzzle
    }));

    // 途中参加の場合のため、現在すでに埋まっている盤面状況を完全同期
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

    // --- 受信メッセージの個別イベント処理 ---
    ws.on("message", (message) => {
        
        // ─── 👇 【追加】メッセージが届いたら20分タイマーをリフレッシュする ───
        resetTimeout();

        // 簡易レートリミット: 一時ブロック中なら無視
        if (ws.isRateLimited) {
            return;
        }

        try {
            const now = Date.now();
            // 古いタイムスタンプを落とす
            ws.msgTimestamps = ws.msgTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
            ws.msgTimestamps.push(now);
            if (ws.msgTimestamps.length > RATE_LIMIT_MAX) {
                ws.rateViolations++;
                ws.isRateLimited = true;
                try {
                    ws.send(JSON.stringify({ type: 'chat', playerId: 'システム', text: `🚫 レート制限: ${RATE_LIMIT_WINDOW_MS/1000}秒ごとに${RATE_LIMIT_MAX}件までです。${RATE_LIMIT_PENALTY_MS/1000}秒ブロックします。` }));
                } catch (e) {}
                // 一時解除タイマー
                setTimeout(() => { ws.isRateLimited = false; }, RATE_LIMIT_PENALTY_MS);

                // 繰り返し違反している場合は強制切断
                if (ws.rateViolations >= RATE_LIMIT_MAX_VIOLATIONS) {
                    try { ws.send(JSON.stringify({ type: 'chat', playerId: 'システム', text: '接続を切断します（過度の送信）' })); } catch(e){}
                    try { ws.close(4008, 'rate limit exceeded'); } catch(e){}
                }
                return;
            }
        } catch (e) {
            // レート処理でエラーが発生してもメッセージ処理本体は継続
            console.error('rate limiter error', e);
        }

        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
        }

        // Basic input validation helper
        function isIntInRange(v, min, max) {
            return Number.isInteger(v) && v >= min && v <= max;
        }

        // チャットは長さ制限を設ける
        if (data && data.type === 'chat') {
            if (typeof data.text !== 'string') return;
            // 500文字を超える場合は切り詰める
            if (data.text.length > 500) data.text = data.text.slice(0, 500);
        }

// ◆ 数字入力の同期と正誤判定（お手付きカウント融合版）
        if (data.type === "placeNumber") {
            const r = Number(data.r);
            const c = Number(data.c);
            const num = Number(data.num);

            // バリデーション: 座標と数字の範囲をチェック
            if (!isIntInRange(r, 0, 8) || !isIntInRange(c, 0, 8) || !isIntInRange(num, 1, 9)) return;

            // 初期問題マスなら処理を拒否
            if (initialPuzzle[r][c] !== 0) return;
            
            // 👇 ★すでに誰かが正解しているマス（0以外）なら、2回目の処理を無視するガード
            if (currentBoard[r][c].num !== 0) return;
            
            // 送られた数字が正解と一致している場合
            if (solutionBoard[r][c] === num) {
                currentBoard[r][c] = { num: num, owner: ws.playerId };
                
                // 正解した数字を全員に即時同期
                broadcast({
                    type: "placeNumber",
                    r: r,
                    c: c,
                    num: num,
                    playerId: ws.playerId
                });

                // 全マスの埋まり具合と、各プレイヤーの獲得マス数を集計
                let isGameCleared = true;
                const scores = {}; 

                for (let i = 0; i < 9; i++) {
                    for (let j = 0; j < 9; j++) {
                        const cell = currentBoard[i][j];
                        if (cell.num === 0) {
                            isGameCleared = false; // 空白が1つでもあれば未終了
                        } else if (cell.owner !== "system") {
                            scores[cell.owner] = (scores[cell.owner] || 0) + 1;
                        }
                    }
                }

                // すべて埋まったら勝敗を判定
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
                            isDraw = true; 
                        }
                    }

                    // 全員にゲームクリアと勝敗結果を通知
                    broadcast({
                        type: "gameClear",
                        scores: scores,
                        winnerId: winnerId,
                        isDraw: isDraw,
                        // 👇 お互いの最終的な間違い回数を一緒に全員へ送る！
                        penaltyCounts: penaltyCounts 
                    });

                    // チャット欄へシステムアナウンス
                    let resultText = "🎉 ゲーム終了！ ";
                    if (isDraw) {
                        resultText += "引き分けです！";
                    } else {
                        resultText += `勝者: ${winnerId}！`;
                    }
                    
                    broadcast({
                        type: "chat",
                        playerId: "システム",
                        text: resultText
                    });
                }

            } else {
                // ❌ 送られた数字が間違っていた場合
                
                // 👇 【2倍防止ガード】
                // 本人がすでにペナルティロック中（ws.isPenalized）であれば、
                // スマホ等のチャタリング（2回連続送信）とみなしてカウントアップも通知も完全に無視する
                if (ws.isPenalized) return;

                // ロック状態をONにする
                ws.isPenalized = true;

                // 間違えたプレイヤー(P1またはP2)の間違いカウントを1増やす
                if (ws.playerId === "P1" || ws.playerId === "P2") {
                    penaltyCounts[ws.playerId]++;
                }

                // 間違っていた場合は本人にペナルティ（ロック）を通知
                ws.send(JSON.stringify({
                    type: "penalty",
                    r: r,
                    c: c
                }));

                // クライアント側のロック時間（5〜6秒）に合わせて、サーバー側の多重カウントガードも自動解除する
                setTimeout(() => {
                    ws.isPenalized = false;
                }, 5500);
            }
            return;
        }

        // ◆ チャットメッセージの全員転送
        if (data.type === "chat") {
            broadcast({
                type: "chat",
                playerId: ws.playerId,
                text: data.text
            });
            return;
        }

        // ◆ 「新しい盤面で開始」リセット処理
        if (data.type === "requestReset") {
            console.log(`盤面リセットが要求されました（難易度: ${data.difficulty}）`);
            // 👇 間違いカウントもゼロにリセット
            penaltyCounts = { P1: 0, P2: 0 };
            
            solutionBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
            generateFullBoard(solutionBoard);

            let blanks = 40;
            let difficultyName = "中級";

            // 各難易度に応じた空白マス数の割り振り
            if (data.difficulty === "sudden_death") {
                blanks = 1;
                difficultyName = "⚡早押し勝負 (空白1マス)";
            } else if (data.difficulty === "super_easy") {
                blanks = 5;
                difficultyName = "超初級 (空白5マス)";
            } else if (data.difficulty === "easy") {
                blanks = 30;
                difficultyName = "初級 (空白30).";
            } else if (data.difficulty === "normal") {
                blanks = 40;
                difficultyName = "中級 (空白40マス)";
            } else if (data.difficulty === "hard") {
                blanks = 50;
                difficultyName = "上級 (空白50マス)";
            }

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

            // 新しい問題を全員に配布
            broadcast({
                type: "puzzle",
                puzzle: initialPuzzle,
                // 👇 【追加】リセットボタンから配信された時だけの目印（フラグ）
                isNewGame: true
            });

            // リセットした人をシステムチャットで通知
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
        
        // ─── 👇 【追加】自分で切断したら、動いている20分タイマーを完全消去 ───
        if (ws.timeoutTimer) clearTimeout(ws.timeoutTimer);

        // 1. チャット欄へ退室アナウンスを流す
        broadcast({
            type: "chat",
            playerId: "システム",
            text: `❌ ${ws.playerId} が退室しました。`
        });

        // 👇 ★【ここを追加】画面の「相手：〇〇」を消すための合図を全員に送る ★ 👇
        broadcast({
            type: "playerLeft",
            playerId: ws.playerId
        });
    });
});

// ==========================================
// 4. 全員へ一斉送信するためのヘルパー関数
// ==========================================
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(data));
            } catch (e) {
                // 送信に失敗したクライアントはログを取り切断する
                console.error('broadcast send error, closing client', e);
                try { client.terminate(); } catch (ee) {}
            }
        }
    });
}

// ==========================================
// 5. サーバーの起動設定（Render対応）
// ==========================================
// 固定の「8080」ではなく、前半で自動判別させた変数「PORT」で起動します
server.listen(PORT, () => {
    console.log(`Server running at port: ${PORT}`);
});

// ==========================================
// 6. 数独（Sudoku）自動生成ロジック
// ==========================================

// バックトラッキングによる正解盤面の自動生成
function generateFullBoard(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                shuffle(nums);
                for (let num of nums) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        if (generateFullBoard(board)) return true;
                        board[r][c] = 0; // 失敗したら戻す（バックトラック）
                    }
                }
                return false;
            }
        }
    }
    return true;
}

// 行・列・3×3ブロック内に重複がないかチェックするバリデーション
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

// 配列をランダムに並び替える（フィッシャー・イェーツのシャッフル）
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// 正解盤面から指定された数だけ穴をあけて「問題」を作る
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