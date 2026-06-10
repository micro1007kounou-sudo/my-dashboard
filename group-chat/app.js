const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-container");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

let ws;
let myName = "";

// ==========================================
// 🕒 無操作タイマー ＆ 切断防止（ピンポン）の設定
// ==========================================
let disconnectTimer = null;
let pingInterval = null; 
const INACTIVE_LIMIT = 10 * 60 * 60 * 1000; // 10時間

function resetDisconnectTimer() {
  // 💡 安全ロック：まだ入室していない（wsが無い）場合はタイマーを動かさない
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  if (disconnectTimer) clearTimeout(disconnectTimer);

  disconnectTimer = setTimeout(() => {
    addSystem("10時間操作がなかったため、自動的に退室しました。");
    ws.close();
    
    setTimeout(() => {
      location.reload(); 
    }, 3000);
  }, INACTIVE_LIMIT);
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

  if (!myName) {
    alert("名前を入力してください。");
    return;
  }

  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    overlay.style.opacity = "1";
  }

  loginScreen.style.display = "none";
  chatScreen.style.display = "block";
  
  document.getElementById("header-user-info").textContent = "あなた: " + myName;

  connectWebSocket();
});

// ==========================================
// 🔌 WebSocketの接続・通信処理（順番並び替え＆大文字小文字対策版）
// ==========================================
function connectWebSocket() {
  const WS_URL = "wss://group-chat-w9fd.onrender.com"; 
  ws = new WebSocket(WS_URL);

  // 1. 📥 【最優先】まず最初にメッセージ受信の網（準備）を100%完成させる！
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    // 🕒 過去ログが一気に届いたときの処理
    if (data.type === "history") {
      data.messages.forEach((msg) => {
        // 前後の空白のズレを安全にカットしてガチ比較
        if (myName && msg.username && msg.username.trim() === myName.trim()) {
          addMessage(msg.text, "me");
        } else {
          addMessage(msg.text, "other", msg.username);
        }
      });
      return;
    }

    // 👥 現在のオンライン人数と名前リストの更新
    if (data.type === "roominfo") {
      const nameListText = data.names.join("、");
      document.getElementById("header-online-count").innerHTML = 
        `<span style="color: #4caf50; font-weight: bold; margin-right: 2px;">●</span>オンライン: ${data.count}人 ( ${nameListText} )`;
      return;
    }

    // ⚙️ システムメッセージ
    if (data.type === "system") {
      addSystem(data.text);
      return;
    }

    // 💬 通常のチャット受信
    if (data.type === "chat") {
      addMessage(data.text, "other", data.username);
      return;
    }
  });

  // 2. 🔌 接続完了時の処理（網を張り終えた後に、満を持して入室届を送信）
  ws.addEventListener("open", () => {
    addSystem("サーバーに接続しました。入室中...");
    
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => { overlay.style.display = "none"; }, 500);
    }

    // ここで初めてタイマーとハートビートを安全に始動
    resetDisconnectTimer();
    startHeartbeat();

    // 🚀 サーバーに入室を知らせる
    ws.send(JSON.stringify({
      type: "join",
      username: myName
    }));
  });

  // 3. エラー発生時
  ws.addEventListener("error", () => {
    addSystem("エラーが発生したか、接続が拒否されました。");
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.style.display = "none";
    stopHeartbeat(); 
  });
  
  // 4. 切断時
  ws.addEventListener("close", () => {
    addSystem("サーバーとの接続が切れました。");
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.style.display = "none";
    stopHeartbeat(); 
  });
}

// ==========================================
// 💬 メッセージ表示・送信ロジック
// ==========================================
function addMessage(text, who = "me", senderName = "") {
  const row = document.createElement("div");
  row.className = "message-row " + (who === "me" ? "me" : "other");

  if (who === "other") {
    const nameEl = document.createElement("div");
    nameEl.className = "message-user-name";
    nameEl.textContent = senderName;
    row.appendChild(nameEl);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (who === "me" ? "me" : "other");
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt bridge;");
    
  const linkedHtml = escapedText.replace(urlRegex, (url) => {
    const linkColor = who === 'me' ? '#ffffff' : '#007aff';
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: ${linkColor}; text-decoration: underline;">${url}</a>`;
  });

  bubble.innerHTML = linkedHtml;
  
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