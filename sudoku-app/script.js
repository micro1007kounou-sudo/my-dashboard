let autoCheckEnabled = true;


// 9×9 の盤面を作る
function createBoard() {
    const container = document.getElementById("board-container");

    let html = "<table>";

    for (let r = 0; r < 9; r++) {
        html += "<tr>";
        for (let c = 0; c < 9; c++) {
            html += `<td><input type="text" maxlength="1" data-r="${r}" data-c="${c}"></td>`;
        }
        html += "</tr>";
    }

    html += "</table>";

    container.innerHTML = html;
}

// 入力イベントをセット
function setInputEvents() {
    const inputs = document.querySelectorAll("#board-container input");
    inputs.forEach(input => {
        input.addEventListener("input", () => {
            // 数字以外は消す
            input.value = input.value.replace(/[^1-9]/g, "");

            checkConflicts(); // ← 常時矛盾チェック（このあと作る）
        });
    });
}

// ページ読み込み時に実行
createBoard();
setInputEvents();

// 盤面を 2次元配列として取得
function getBoard() {
    const cells = document.querySelectorAll("#board-container input");
    const board = [];
    let row = [];

    cells.forEach((cell, i) => {
        row.push(Number(cell.value) || 0);
        if ((i + 1) % 9 === 0) {
            board.push(row);
            row = [];
        }
    });

    return board;
}

// 矛盾セルを赤くする
function markConflict(r, c) {
    const cell = document.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
    const bg = cell.style.backgroundColor.replace(/\s+/g, "");

    if (bg === "rgb(238,238,238)") return;

    cell.style.backgroundColor = "#ffcccc";
}



// 矛盾チェック
function checkConflicts() {
    const inputs = document.querySelectorAll("#board-container input");

    // 色リセット（問題セルは除外）
    inputs.forEach(cell => {
        const bg = cell.style.backgroundColor.replace(/\s+/g, "");
        if (bg !== "rgb(238,238,238)") {
            cell.style.backgroundColor = "white";
        }
    });

    const board = getBoard();

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {

            const cell = document.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
            const bg = cell.style.backgroundColor.replace(/\s+/g, "");

            // 問題セルは色を変えない
            if (bg === "rgb(238,238,238)") continue;

            const value = board[r][c];
            if (value === 0) continue;

            // 行チェック
            for (let cc = 0; cc < 9; cc++) {
                if (cc !== c && board[r][cc] === value) {
                    markConflict(r, c);
                    markConflict(r, cc);
                }
            }

            // 列チェック
            for (let rr = 0; rr < 9; rr++) {
                if (rr !== r && board[rr][c] === value) {
                    markConflict(r, c);
                    markConflict(rr, c);
                }
            }

            // ブロックチェック
            const br = Math.floor(r / 3) * 3;
            const bc = Math.floor(c / 3) * 3;
            for (let rr = br; rr < br + 3; rr++) {
                for (let cc = bc; cc < bc + 3; cc++) {
                    if ((rr !== r || cc !== c) && board[rr][cc] === value) {
                        markConflict(r, c);
                        markConflict(rr, cc);
                    }
                }
            }
        }
    }
}


function setInputEvents() {
    const inputs = document.querySelectorAll("#board-container input");
    inputs.forEach(input => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^1-9]/g, "");
            checkConflicts();
        });
    });
}

// ------------------------------
// 自動解答（バックトラッキング）
// ------------------------------

// 解けるかどうか判定して、解けたら盤面に反映
function solveSudoku() {
    const board = getBoard();

    if (solve(board)) {
        // 解けた → 盤面に反映
        writeBoard(board);
        checkConflicts(); // 念のため再チェック
        alert("解答を表示しました！");
    } else {
        alert("この問題は解けません。");
    }
}

// バックトラッキング本体
function solve(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {

                for (let num = 1; num <= 9; num++) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;

                        if (solve(board)) {
                            return true;
                        }

                        board[r][c] = 0; // 戻す
                    }
                }

                return false; // どの数字も入らない
            }
        }
    }
    return true; // 全て埋まった
}

// そのマスに num を入れて良いか判定
function isValid(board, r, c, num) {
    // 行
    for (let cc = 0; cc < 9; cc++) {
        if (board[r][cc] === num) return false;
    }

    // 列
    for (let rr = 0; rr < 9; rr++) {
        if (board[rr][c] === num) return false;
    }

    // ブロック
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
            if (board[rr][cc] === num) return false;
        }
    }

    return true;
}

// 盤面に書き戻す
function writeBoard(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
            cell.value = board[r][c] === 0 ? "" : board[r][c];
        }
    }
}

// ボタン動作
document.getElementById("solve").addEventListener("click", solveSudoku);

// ------------------------------
// 全リセット
// ------------------------------
function resetBoardCore() {
    const inputs = document.querySelectorAll("#board-container input");

    inputs.forEach(cell => {
        cell.value = "";
        cell.disabled = false;
        cell.style.backgroundColor = "white";
        cell.style.fontWeight = "normal";
        cell.style.color = "black";
    });

    stopTimer();
    secondsElapsed = 0;
    updateTimer();

    autoCheckEnabled = true;
}



function resetBoard() {
    if (!confirm("全てのセルを空欄にして初期状態に戻します。\nよろしいですか？")) {
        return;
    }
    resetBoardCore();
}
function resetBoardWithoutConfirm() {
    resetBoardCore();
}




document.getElementById("reset").addEventListener("click", resetBoard);

// ------------------------------
// 正解チェック
// ------------------------------
function checkAnswer() {
    const board = getBoard();

    // まず矛盾チェック
    checkConflicts();

    // 矛盾があるか確認
    if (hasConflict()) {
        alert("矛盾があります。修正してください。");
        return;
    }

    // 空欄があるか確認
    const hasEmpty = board.some(row => row.includes(0));

    // 空欄なし → 完成しているので正解判定
if (!hasEmpty) {
    stopTimer();

    autoCheckEnabled = false; // ★ これで連打防止

    const minutes = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
    const seconds = String(secondsElapsed % 60).padStart(2, "0");
    const timeText = `${minutes}:${seconds}`;

    alert(`正解です！\nクリアタイム：${timeText}`);
    return;
}



    // 空欄あり → 解けるかどうか判定
    const copy = JSON.parse(JSON.stringify(board)); // 盤面コピー

    if (solve(copy)) {
        alert("この状態から解けます。（まだ途中です）");
    } else {
        alert("矛盾はありませんが、この状態からは解けません。");
    }
}

// ------------------------------
// 矛盾があるかどうかを返す
// ------------------------------
function hasConflict() {
    const board = getBoard();

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const value = board[r][c];
            if (value === 0) continue;

            // 行
            for (let cc = 0; cc < 9; cc++) {
                if (cc !== c && board[r][cc] === value) return true;
            }

            // 列
            for (let rr = 0; rr < 9; rr++) {
                if (rr !== r && board[rr][c] === value) return true;
            }

            // ブロック
            const br = Math.floor(r / 3) * 3;
            const bc = Math.floor(c / 3) * 3;
            for (let rr = br; rr < br + 3; rr++) {
                for (let cc = bc; cc < bc + 3; cc++) {
                    if ((rr !== r || cc !== c) && board[rr][cc] === value) return true;
                }
            }
        }
    }

    return false;
}

document.getElementById("check").addEventListener("click", checkAnswer);

// ------------------------------
// 問題セルロック（重複あり・解けない状態はロック禁止）
// ------------------------------
function lockProblemCells() {
    const board = getBoard();

    // ① 重複チェック
    checkConflicts();
    if (hasConflict()) {
        alert("矛盾があります。ロックできません。");
        return;
    }

    // ② 解けるかどうかチェック
    const copy = JSON.parse(JSON.stringify(board));
    if (!solve(copy)) {
        alert("この状態では解けません。ロックできません。");
        return;
    }

    // ③ ロック実行
    const inputs = document.querySelectorAll("#board-container input");

    inputs.forEach(cell => {
        if (cell.value !== "") {
            cell.disabled = true;
            cell.style.backgroundColor = "rgb(238, 238, 238)";
            cell.style.fontWeight = "bold";
            cell.style.color = "black";
        } else {
            cell.disabled = false;
            cell.style.backgroundColor = "white";
            cell.style.fontWeight = "normal";
            cell.style.color = "blue";
        }
    });

    // ★ タイマー開始
    resetTimer();
    startTimer();

    alert("問題セルをロックしました。");
}

document.getElementById("lock").addEventListener("click", lockProblemCells);

// ------------------------------
// 完成盤をランダム生成
// ------------------------------
function generateFullBoard() {
    let board = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillBoard(board);
    return board;
}

function fillBoard(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                let nums = shuffle([1,2,3,4,5,6,7,8,9]);
                for (let num of nums) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        if (fillBoard(board)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

// ------------------------------
// 問題生成（マスを削る）
// ------------------------------
function makePuzzle(fullBoard, removeCount = 50) {
    let puzzle = JSON.parse(JSON.stringify(fullBoard));

    let attempts = removeCount;
    while (attempts > 0) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);

        if (puzzle[r][c] !== 0) {
            let backup = puzzle[r][c];
            puzzle[r][c] = 0;

            // 解が一意かチェック
            if (!hasUniqueSolution(puzzle)) {
                puzzle[r][c] = backup; // 戻す
            } else {
                attempts--;
            }
        }
    }

    return puzzle;
}

// 解が一意かどうか判定
function hasUniqueSolution(board) {
    let count = 0;
    let copy = JSON.parse(JSON.stringify(board));

    function solveCount(bd) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (bd[r][c] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (isValid(bd, r, c, num)) {
                            bd[r][c] = num;
                            solveCount(bd);
                            bd[r][c] = 0;
                        }
                    }
                    return;
                }
            }
        }
        count++;
    }

    solveCount(copy);
    return count === 1;
}

// ------------------------------
// 盤面に表示
// ------------------------------
function setBoard(board) {
    const inputs = document.querySelectorAll("#board-container input");
    let index = 0;

    inputs.forEach(cell => {
        const r = Math.floor(index / 9);
        const c = index % 9;

        cell.value = board[r][c] === 0 ? "" : board[r][c];
        index++;

        // ★ 入力イベント追加
        cell.addEventListener("input", () => {
            autoCheckIfFilled();
        });
    });
}


function generatePuzzle() {
    //resetBoard(); // まずリセット

    let full = generateFullBoard(); // 完成盤を作る

    // 入力された空欄数を取得
    let removeCount = Number(document.getElementById("removeCount").value);

    // ★ 範囲外の値を自動補正（1〜50）
    if (isNaN(removeCount) || removeCount < 1) removeCount = 1;
    if (removeCount > 50) removeCount = 50;

    // ★ 補正した値を入力欄にも反映
    document.getElementById("removeCount").value = removeCount;

    let puzzle = makePuzzle(full, removeCount); // 指定数だけ削る

    setBoard(puzzle); // 盤面に反映
    lockProblemCells(); // 問題セルをロック
}



document.getElementById("generate").addEventListener("click", () => {
    if (!confirm("現在の盤面をリセットして新しい問題を生成します。よろしいですか？")) {
        return; // キャンセルなら生成しない
    }

    resetBoardWithoutConfirm(); // 確認なしリセット
    generatePuzzle();           // 新しい問題生成
});



let timerInterval = null;
let secondsElapsed = 0;

// タイマー表示更新
function updateTimer() {
    const minutes = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
    const seconds = String(secondsElapsed % 60).padStart(2, "0");
    document.getElementById("timer").textContent = `${minutes}:${seconds}`;
}

// タイマースタート
function startTimer() {
    if (timerInterval !== null) return; // 二重スタート防止

    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimer();
    }, 1000);
}

// タイマーストップ
function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

// タイマーリセット
function resetTimer() {
    stopTimer();
    secondsElapsed = 0;
    updateTimer();
}

function autoCheckIfFilled() {
    if (!autoCheckEnabled) return; // ★ 正解後は発動しない

    const inputs = document.querySelectorAll("#board-container input");

    for (let cell of inputs) {
        if (cell.value === "") return; // 空欄があれば何もしない
    }

    // 全部埋まった → 正解チェック
    checkAnswer();
}

