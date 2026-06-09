const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("usernameInput");
const roomInput = document.getElementById("roomInput");
const joinBtn = document.getElementById("joinBtn");

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

let ws;
let myName = "";

// 入室ボタンを押したとき
joinBtn.addEventListener("click", () => {
  myName = usernameInput.value.trim();
  const roomName = roomInput.value.trim();

  if (!myName || !roomName) {
    alert("名前と合言葉を入力してください。");
    return;
  }

  // 画面切り替え
  loginScreen.style.display = "none";
  chatScreen.style.display = "block";
  document.getElementById("selfName").textContent = myName;
  document.getElementById("roomName").textContent = roomName;

  // WebSocket接続（オンライン対応のURL自動判定）
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
// RenderのサーバーURLを直球で指定する（末尾に / は付けない）
const WS_URL = "wss://orijinal-chat.onrender.com"; 
ws = new WebSocket(WS_URL);

  // 接続完了時に名前と合言葉を送信
  ws.addEventListener("open", () => {
    addSystem("サーバーに接続しました。認証中...");
    ws.send(JSON.stringify({
      type: "join",
      username: myName,
      room: roomName
    }));
  });

  // メッセージ受信処理
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "roominfo") {
      document.getElementById("otherName").textContent = data.otherName || "未接続";
      return;
    }

    if (data.type === "system") {
      addSystem(data.text);
      return;
    }

    if (data.type === "chat") {
      addMessage(data.text, "other");
      return;
    }
  });

  ws.addEventListener("error", () => {
    addSystem("エラーが発生したか、接続が拒否されました。");
  });
  
  ws.addEventListener("close", () => {
    addSystem("サーバーとの接続が切れました。");
  });
});

// メッセージ表示・送信ロジック（基本ロジックはそのまま）
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

sendBtn.addEventListener("click", () => {
  const text = inputEl.value.trim();
  if (!text || !ws) return;

  addMessage(text, "me");
  ws.send(JSON.stringify({ type: "chat", text }));
  inputEl.value = "";
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});