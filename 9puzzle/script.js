const puzzle = document.getElementById("puzzle");
const shuffleBtn = document.getElementById("shuffleBtn");
const timerDisplay = document.getElementById("timer");

let currentImage = "1.jpg";
let tiles = [];
let emptyIndex = 8;
let timer = null;
let seconds = 0;
let isShuffling = false;

// タイマー
function startTimer() {
    clearInterval(timer);
    seconds = 0;
    timer = setInterval(() => {
        seconds++;
        const m = String(Math.floor(seconds / 60)).padStart(2, "0");
        const s = String(seconds % 60).padStart(2, "0");
        timerDisplay.textContent = `${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
}

// タイル生成
function createTiles() {
    puzzle.innerHTML = "";
    tiles = [];
    emptyIndex = 8;

    for (let i = 0; i < 9; i++) {
        const tile = document.createElement("div");
        tile.classList.add("tile");
        tile.dataset.index = i;

        if (i === 8) {
            tile.classList.add("empty");
        } else {
            const x = (i % 3) * -80;
            const y = Math.floor(i / 3) * -80;
            tile.style.backgroundImage = `url('img/${currentImage}')`;
            tile.style.backgroundPosition = `${x}px ${y}px`;
        }

        tile.addEventListener("click", () => moveTile(i));
        tiles.push(tile);
        puzzle.appendChild(tile);
    }

    timerDisplay.textContent = "00:00";
}

// 隣接判定
function isAdjacent(i, j) {
    const x1 = i % 3, y1 = Math.floor(i / 3);
    const x2 = j % 3, y2 = Math.floor(j / 3);
    return (Math.abs(x1 - x2) + Math.abs(y1 - y2)) === 1;
}

// タイル入れ替え（背景画像を入れ替えない方式）
function swapTiles(i, j) {
    const temp = tiles[i].dataset.index;
    tiles[i].dataset.index = tiles[j].dataset.index;
    tiles[j].dataset.index = temp;

    updateTile(i);
    updateTile(j);
}

function updateTile(i) {
    const tile = tiles[i];
    const idx = Number(tile.dataset.index);

    if (idx === 8) {
        tile.classList.add("empty");
        tile.style.backgroundImage = "";
    } else {
        tile.classList.remove("empty");
        const x = (idx % 3) * -80;
        const y = Math.floor(idx / 3) * -80;
        tile.style.backgroundImage = `url('img/${currentImage}')`;
        tile.style.backgroundPosition = `${x}px ${y}px`;
    }
}

// タイル移動
function moveTile(i) {
    if (isAdjacent(i, emptyIndex)) {
        swapTiles(i, emptyIndex);
        emptyIndex = i;

        if (!isShuffling && checkClear()) {
            stopTimer();
            alert(`クリア！\nタイム：${timerDisplay.textContent}`);
        }
    }
}

// シャッフル
function shuffle() {
    isShuffling = true;
    startTimer();

    for (let k = 0; k < 200; k++) {
        const neighbors = getNeighbors(emptyIndex);
        const r = neighbors[Math.floor(Math.random() * neighbors.length)];
        moveTile(r);
    }

    isShuffling = false;
}

function getNeighbors(i) {
    const list = [];
    if (i % 3 !== 0) list.push(i - 1);
    if (i % 3 !== 2) list.push(i + 1);
    if (i >= 3) list.push(i - 3);
    if (i < 6) list.push(i + 3);
    return list;
}

// クリア判定
function checkClear() {
    for (let i = 0; i < 8; i++) {
        if (Number(tiles[i].dataset.index) !== i) return false;
    }
    return true;
}

// 画像切替
document.querySelectorAll(".img-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        currentImage = btn.dataset.img;
        createTiles();
    });
});

shuffleBtn.addEventListener("click", shuffle);

createTiles();
