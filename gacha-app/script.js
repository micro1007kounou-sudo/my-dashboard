// ガチャの中身
const gachaPool = [
  { name: "スライム",       rarity: "N",  img: "images/pic_1.jpg" },
  { name: "コウモリ",       rarity: "N",  img: "images/pic_2.jpg" },
  { name: "ゴブリン",       rarity: "N",  img: "images/pic_3.jpg" },
  { name: "どろねんど",     rarity: "N",  img: "images/pic_4.jpg" },
  { name: "ちびオーク",     rarity: "N",  img: "images/pic_5.jpg" },
  { name: "かげねずみ",     rarity: "N",  img: "images/pic_6.jpg" },
  { name: "ちびドラ",       rarity: "N",  img: "images/pic_7.jpg" },
  { name: "もりスピリット", rarity: "N",  img: "images/pic_8.jpg" },
  { name: "スケルトン",     rarity: "N",  img: "images/pic_9.jpg" },

  { name: "オーク",         rarity: "R",  img: "images/pic_10.jpg" },
  { name: "リザード",       rarity: "R",  img: "images/pic_11.jpg" },
  { name: "ウルフ",         rarity: "R",  img: "images/pic_12.jpg" },
  { name: "ソルジャー",     rarity: "R",  img: "images/pic_13.jpg" },
  { name: "アーチャー",     rarity: "R",  img: "images/pic_14.jpg" },
  { name: "シャーマン",     rarity: "R",  img: "images/pic_15.jpg" },

  { name: "ミノタウロス",   rarity: "SR", img: "images/pic_16.jpg" },
  { name: "サーペント",     rarity: "SR", img: "images/pic_17.jpg" },
  { name: "ゴーレム",       rarity: "SR", img: "images/pic_18.jpg" },
  { name: "キマイラ",       rarity: "SR", img: "images/pic_19.jpg" },

  { name: "ドラゴン",       rarity: "SSR", img: "images/pic_20.jpg" },
];

// 要素取得
const gachaButton = document.getElementById("gachaButton");
const result = document.getElementById("result");
const logArea = document.getElementById("logArea");

// ログ追加
function addLog(htmlText) {
  const now = new Date();
  const time = now.toLocaleTimeString();
  logArea.innerHTML += `[${time}] ${htmlText}<br>`;
  logArea.scrollTop = logArea.scrollHeight;
}

// フラッシュ演出（色と時間を指定）
function flash(color, duration) {
  const flash = document.getElementById("flashEffect");
  flash.style.background = color;
  flash.style.opacity = 0.8;

  setTimeout(() => {
    flash.style.opacity = 0;
  }, duration);
}

function pullGacha() {
  const selected = gachaPool[Math.floor(Math.random() * gachaPool.length)];
  // ▼ ガチャ連打防止：ボタンを無効化
  gachaButton.disabled = true;
  // 結果を一旦消す（押した瞬間に見えないようにする）
  result.innerHTML = "";

  // レア度ごとのフラッシュ設定
  let flashColor = "white";
  let flashDuration = 500;

  if (selected.rarity === "SSR") {
    flashColor = "gold";
    flashDuration = 1600;
    spawnParticles(); // ← これを追加
  } else if (selected.rarity === "SR") {
    flashColor = "deepskyblue";
    flashDuration = 800;
  }

  // フラッシュ開始
  flash(flashColor, flashDuration);

  // フラッシュ終了後に結果を表示
  setTimeout(() => {
    // 結果表示の色
    let color = "black";
    if (selected.rarity === "SSR") color = "gold";
    else if (selected.rarity === "SR") color = "deepskyblue";

    result.innerHTML = `
      <p style="color:${color}; font-weight:bold;">
        ${selected.rarity}：${selected.name}
      </p>
      <img src="${selected.img}" alt="${selected.name}">
    `;

    // ログ色
    let logColor = "black";
    if (selected.rarity === "SSR") logColor = "gold";
    else if (selected.rarity === "SR") logColor = "deepskyblue";

    addLog(`<span style="color:${logColor}">${selected.rarity}：${selected.name}</span>`);
    // ▼ フラッシュが終わったのでボタンを再び有効化
    gachaButton.disabled = false;
  }, flashDuration); // ← フラッシュが終わるタイミングで表示
}
function spawnParticles() {
  const container = document.getElementById("particleContainer");

  for (let i = 0; i < 40; i++) {
    const p = document.createElement("div");
    p.classList.add("particle");

    // ランダム位置
    p.style.left = Math.random() * window.innerWidth + "px";
    p.style.top = Math.random() * window.innerHeight + "px";

    // ランダムサイズ
    const size = 4 + Math.random() * 6;
    p.style.width = size + "px";
    p.style.height = size + "px";

    // ランダム遅延
    p.style.animationDelay = (Math.random() * 0.5) + "s";

    container.appendChild(p);

    // アニメ終了後に削除
    setTimeout(() => {
      p.remove();
    }, 2000);
  }
}


// ボタンにイベント付与
gachaButton.addEventListener("click", pullGacha);
