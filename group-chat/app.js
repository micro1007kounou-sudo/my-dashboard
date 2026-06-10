const loginScreen = document.getElementById("login-screen");
// 前回のHTMLに合わせて id="chat-container" に対応
const chatScreen = document.getElementById("chat-container");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

let ws;
let myName = "";

// ==========================================
// 🕒 20分無操作タイマー ＆ 切断防止（ピンポン）の設定
// ==========================================
let disconnectTimer = null;
let pingInterval = null; 
const INACTIVE_LIMIT = 20 * 60 * 1000; // 20分

function resetDisconnectTimer() {
  if (disconnectTimer) clearTimeout(disconnectTimer);

  if (ws && ws.readyState === WebSocket.OPEN) {
    disconnectTimer = setTimeout(() => {
      addSystem("20分間操作がなかったため、自動的に退室しました。");
      ws.close();
      
      setTimeout(() => {
        location.reload(); 
      }, 3000);
    }, INACTIVE_LIMIT);
  }
}

["click", "keydown", "touchstart", "scroll"].forEach((eventType) => {
  document.addEventListener(eventType, resetDisconnectTimer);
});

function startHeartbeat() {
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" })); 
    }
  }, 30000); 
}

function stopHeartbeat() {
  if (pingInterval) clearInterval(pingInterval);
}

// ==========================================
// 🚀 入室ボタンを押したときの処理
// ==========================================
joinBtn.addEventListener("click", () => {
  myName = usernameInput.value.trim();

  // 🛠️ 合言葉（部屋名）のチェックを外し、名前だけに簡略化！
  if (!myName) {
    alert("名前を入力してください。");
    return;
  }

  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    overlay.style.opacity = "1";
  }

  // 画面切り替え
  loginScreen.style.display = "none";
  chatScreen.style.display = "block";
  
  // ヘッダーの情報を「あなたの名前」に更新
  document.getElementById("header-user-info").textContent = "あなた: " + myName;

  // WebSocket接続（全員同じメインの部屋へ）
  connectWebSocket();
});

// ==========================================
// 🔌 WebSocketの接続・通信処理
// ==========================================
function connectWebSocket() {
  // ⚠️ 接続先URLは必要に応じて調整してください
  const WS_URL = "wss://group-chat-w9fd.onrender.com"; 
  ws = new WebSocket(WS_URL);

  ws.addEventListener("open", () => {
    addSystem("サーバーに接続しました。入室中...");
    
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => { overlay.style.display = "none"; }, 500);
    }

    resetDisconnectTimer();
    startHeartbeat();

    // 🛠️ 合言葉なしで、名前だけを送信して全員同じスペースに入る
    ws.send(JSON.stringify({
      type: "join",
      username: myName
    }));
  });

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    // 🛠️ グループ用：現在のオンライン人数の更新通知を受け取る
    if (data.type === "roominfo") {
      document.getElementById("header-online-count").textContent = "● オンライン: " + data.count + "人";
      return;
    }
    if (data.type === "system") {
      addSystem(data.text);
      return;
    }
    // 🛠️ チャット受信時：誰の発言（data.username）かも一緒に受け取る
    if (data.type === "chat") {
      addMessage(data.text, "other", data.username);
      return;
    }
  });

  ws.addEventListener("error", () => {
    addSystem("エラーが発生したか、接続が拒否されました。");
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.style.display = "none";
    stopHeartbeat(); 
  });
  
  ws.addEventListener("close", () => {
    addSystem("サーバーとの接続が切れました。");
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.style.display = "none";
    stopHeartbeat(); 
  });
}

// ==========================================
// 💬 メッセージ表示・送信ロジック（UI練り直し！）
// ==========================================
function addMessage(text, who = "me", senderName = "") {
  const row = document.createElement("div");
  row.className = "message-row " + (who === "me" ? "me" : "other");

  // 🛠️ グループ用：相手からのメッセージの場合のみ、吹き出しの上に名前を表示
  if (who === "other") {
    const nameEl = document.createElement("div");
    nameEl.className = "message-user-name";
    nameEl.textContent = senderName;
    row.appendChild(nameEl);
  }

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
  // サーバー側が「誰のメッセージか」を識別できるよう、名前も一緒に送るか、
  // サーバー側でセッション管理させます。ここではテキストを送信。
  ws.send(JSON.stringify({ type: "chat", text }));
  inputEl.value = "";
  
  resetDisconnectTimer(); 
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ==========================================
// 📱 スマホのスリープ復帰対策
// ==========================================
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (myName && (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING)) {
      addSystem("スリープからの復帰を検出しました。再接続しています...");
      connectWebSocket(); 
    }
  }
});