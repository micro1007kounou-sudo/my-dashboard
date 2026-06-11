const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-container");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

let ws;
let myName = "";
let isReconnectMode = false; // 💡 初回入室か自動再接続かをスマートに判別するフラグ

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

  isReconnectMode = false; // 💡 手動での初回入室なのでフラグをリセット
  connectWebSocket();
});

// ==========================================
// 🔌 WebSocketの接続・通信処理（完璧2行メッセージ版）
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
      addSystem(data.text); // 💡 他の人が入ってきた時の「〇〇さんが参加しました」はここから出ます
      return;
    }

    // 💬 通常のチャット受信
    if (data.type === "chat") {
      addMessage(data.text, "other", data.username);
      return;
    }
  });

  // 2. 🔌 接続完了時の処理（2行目のメッセージ）
  ws.addEventListener("open", () => {
    addSystem("🟢 サーバーに接続しました。");
    
    // 💡 初めてロビーに入ったときだけ表示して、自動再接続のときは非表示にする
    if (!isReconnectMode) {
      addSystem("🚪「ロビー」の部屋に入室しました。");
    }
    
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
    console.error("WebSocketエラーが発生しました。");
    stopHeartbeat(); 
  });
  
  // 4. 🚨 切断時（1行目のメッセージ）
  ws.addEventListener("close", () => {
    stopHeartbeat(); 

    // 💡 すでに入室済み（名前がある）なら、ログイン画面に戻さず裏で繋ぎ直す！
    if (myName) {
      addSystem("🔄 通信が一時的に途切れました。自動再接続しています...");
      isReconnectMode = true; // 💡 次のopenイベントは「再接続モード」として動かす
      
      setTimeout(() => {
        // 🚀 保管してある myName をそのまま使って自動で再接続！
        connectWebSocket(); 
      }, 1000); // 1秒後にリトライ
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
  
  // 💡 特殊文字のエスケープ
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
      isReconnectMode = true; // 💡 スリープ復帰も再接続モードとして動かす
      connectWebSocket(); 
    }
  }
});