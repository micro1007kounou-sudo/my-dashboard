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
// 🔌 WebSocketの接続・通信処理
// ==========================================
function connectWebSocket() {
  const WS_URL = "wss://group-chat-w9fd.onrender.com"; 
  ws = new WebSocket(WS_URL);

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "history") {
      data.messages.forEach((msg) => {
        if (myName && msg.username && msg.username.trim() === myName.trim()) {
          addMessage(msg.text, "me");
        } else {
          addMessage(msg.text, "other", msg.username);
        }
      });
      return;
    }

    if (data.type === "roominfo") {
      const nameListText = data.names.join("、");
      document.getElementById("header-online-count").innerHTML = 
        `<span style="color: #4caf50; font-weight: bold; margin-right: 2px;">●</span>オンライン: ${data.count}人 ( ${nameListText} )`;
      return;
    }

    if (data.type === "system") {
      addSystem(data.text); // 💡 サーバーからのメッセージ（参加・退室通知など）がそのまま出ます
      return;
    }

    if (data.type === "chat") {
      addMessage(data.text, "other", data.username);
      return;
    }
  });

  // 🔌 接続完了時
  ws.addEventListener("open", () => {
    addSystem("🟢 サーバーに接続しました。");
    
    // 💡 クライアント独自の「ロビーに入室しました」メッセージは完全に削除しました
    
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => { overlay.style.display = "none"; }, 500);
    }

    resetDisconnectTimer();
    startHeartbeat();

    ws.send(JSON.stringify({
      type: "join",
      username: myName
    }));
  });

  ws.addEventListener("error", () => {
    console.error("WebSocketエラーが発生しました。");
    stopHeartbeat(); 
  });
  
  // 🚨 切断時
  ws.addEventListener("close", () => {
    stopHeartbeat(); 

    if (myName) {
      addSystem("🔄 通信が一時的に途切れました。自動再接続しています...");
      
      setTimeout(() => {
        connectWebSocket(); 
      }, 1000); 
    } else {
      const overlay = document.getElementById("loading-overlay");
      if (overlay) overlay.style.display = "none";
    }
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
    .replace(/>/g, "&gt;");
    
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
  if (!text) return;

  // 🚨 【超重要ガード】WebSocketが「完全に繋がっている状態（OPEN）」のときだけ送信を許可する！
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("通信が切断されているため、メッセージを送れません。再接続をお待ちください。");
    return;
  }

  // 💡 繋がっていることが確定してから、自分の画面に出してサーバーに送る
  addMessage(text, "me");
  ws.send(JSON.stringify({ type: "chat", text }));
  inputEl.value = "";
  
  resetDisconnectTimer(); 
});

// ==========================================
// 📱 スマホのスリープ復帰対策
// ==========================================
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (myName && (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING)) {
      connectWebSocket(); 
    }
  }
});