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

  // 👇 ★【追加】入室ボタンが押されたので、ここで初めてサーバー起動待ちのグレーアウトを表示する！
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    overlay.style.opacity = "1";
  }

  // 画面切り替え（チャット画面を表示）
  loginScreen.style.display = "none";
  chatScreen.style.display = "block";
  document.getElementById("selfName").textContent = myName;
  document.getElementById("roomName").textContent = roomName;

  // WebSocket接続（RenderのサーバーURLを直球で指定）
  const WS_URL = "wss://orijinal-chat.onrender.com"; 
  ws = new WebSocket(WS_URL);

  // 接続完了時に名前と合言葉を送信
  ws.addEventListener("open", () => {
    addSystem("サーバーに接続しました。認証中...");
    
    // 👇 ★【修正】サーバーが目覚めてWebSocketがつながったので、グレーアウトを完全に消し去る！
    if (overlay) {
      overlay.style.opacity = "0";             // ふわっと透明にして
      setTimeout(() => {
        overlay.style.display = "none";        // 0.5秒後に非表示にする
      }, 500);
    }

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

  // 接続エラーが起きたときはグレーアウトを消してあげる（ずっとぐるぐるするのを防ぐ）
  ws.addEventListener("error", () => {
    addSystem("エラーが発生したか、接続が拒否されました。");
    if (overlay) overlay.style.display = "none";
  });
  
  ws.addEventListener("close", () => {
    addSystem("サーバーとの接続が切れました。");
    if (overlay) overlay.style.display = "none";
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
// 👇 ★【追加】メッセージを送ったのでタイマーをリセット
  resetDisconnectTimer(); 
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ==========================================
// 🕒 20分無操作で自動退室するシステム
// ==========================================
let disconnectTimer = null;
const INACTIVE_LIMIT = 20 * 60 * 1000; // 20分（ミリ秒換算）

// タイマーをリセットして数え直す関数
function resetDisconnectTimer() {
  // すでに動いているタイマーがあれば一旦クリア
  if (disconnectTimer) clearTimeout(disconnectTimer);

  // チャット中（wsが接続中）のときだけタイマーを作動させる
  if (ws && ws.readyState === WebSocket.OPEN) {
    disconnectTimer = setTimeout(() => {
      addSystem("20分間操作がなかったため、自動的に退室しました。");
      ws.close(); // WebSocketを強制切断（これでサーバー側も退室処理になる）
      
      // 画面を最初のログイン画面に戻す
      setTimeout(() => {
        location.reload(); // 画面をリロードして安全に初期化
      }, 3000); // メッセージを読めるように3秒待ってからリロード
    }, INACTIVE_LIMIT);
  }
}

// ユーザーの「操作」を検知するイベント（画面タップ、キー入力、スクロールなど）
["click", "keydown", "touchstart", "scroll"].forEach((eventType) => {
  document.addEventListener(eventType, resetDisconnectTimer);
});