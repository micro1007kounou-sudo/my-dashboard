document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("uranaiBtn");
  const gifBox = document.getElementById("gifBox");
  const result = document.getElementById("result");

btn.onclick = async () => {
  btn.disabled = true;
  gifBox.style.display = "block";
  result.classList.remove("show");
  result.style.opacity = "0";

  // 外部ファイル読み込み
  const items = await loadList("items.txt");
  const colors = await loadList("colors.txt");
  const messages = await loadList("messages.txt");

  setTimeout(() => {
    gifBox.style.display = "none";
    btn.disabled = false;

    const item = items[Math.floor(Math.random()*items.length)];
    const color = colors[Math.floor(Math.random()*colors.length)];
    const msg = messages[Math.floor(Math.random()*messages.length)];
    const score = Math.floor(Math.random() * 100) + 1;


    result.innerHTML = `
      <p>総合運：${score} 点</p>
      <p>ラッキーアイテム：${item}</p>
      <p>ラッキーカラー：${color}</p>
      <p>今日のメッセージ：<br><strong>${msg}</strong></p>
    `;

    result.classList.add("show");
  }, 3000);
};
async function loadList(url) {
  const res = await fetch(url);
  const text = await res.text();
  return text.split("\n").map(v => v.trim()).filter(v => v);
}

});
