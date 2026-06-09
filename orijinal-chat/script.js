// ====== WebSocket 接続 URL の自動判定 ======
// 本番（https）なら wss、ローカル（http）なら ws に自動で切り替える
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const WS_URL = `${protocol}//${window.location.host}`; 
const ws = new WebSocket(WS_URL);
// ====== DOM 取得 ======
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

// ====== メッセージ表示関数 ======
function addMessage(text, who = "me") {
  const row = document.createElement("div");
  row.className = "message-row " + (who === "me" ? "me" : "");

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (who === "me" ? "me" : "other");
  bubble.textContent = text;

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystem(text) {
  const div = document.createElement("div");
  div.className = "system-message";
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ====== WebSocket 受信処理 ======
ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  // --- IP 情報更新 ---
  if (data.type === "ipinfo") {
    document.getElementById("selfIp").textContent = data.selfIp;
    document.getElementById("otherIp").textContent = data.otherIp || "未接続";
    return;
  }

  // --- システムメッセージ ---
  if (data.type === "system") {
    addSystem(data.text);
    return;
  }

  // --- 相手からのチャット ---
  if (data.type === "chat") {
    addMessage(data.text, "other");
    return;
  }
});

// ====== 送信処理 ======
sendBtn.addEventListener("click", () => {
  const text = inputEl.value.trim();
  if (!text) return;

  // 自分の画面に表示
  addMessage(text, "me");

  // WebSocket で相手に送信
  ws.send(JSON.stringify({
    type: "chat",
    text
  }));

  inputEl.value = "";
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ====== WebSocket 接続エラー ======
ws.addEventListener("error", () => {
  addSystem("サーバーに接続できませんでした。server.js が起動しているか確認してください。");
});

// ====== WebSocket 接続成功 ======
ws.addEventListener("open", () => {
  addSystem("サーバーに接続しました。");
});