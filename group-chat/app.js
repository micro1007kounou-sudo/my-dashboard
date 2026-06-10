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

  ws.addEventListener("open", () => {
    addSystem("サーバーに接続しました。入室中...");
    
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

  // 📥 サーバーからのデータ受信処理
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    // ✨【修正】迷子になっていた過去ログ処理を、メッセージイベントの中に正しく格納！
    if (data.type === "history") {
      data.messages.forEach((msg) => {
        if (msg.username === myName) {
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
      document.getElementById("header-online-count").textContent = 
        "● オンライン: " + data.count + "人 ( " + nameListText + " )";
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
  }); // 👈 ここで message のイベント処理が綺麗に終わる

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
  
  // 🔗【URLリンク化処理】
  // 1. 文字列の中のURLを検出する正規表現
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // 2. 悪いコードの混入を防ぐために特殊文字を安全にエスケープ
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  // 3. URLの部分だけを <a> タグに置き換える（自分と相手でリンクの文字色を調整）
  const linkedHtml = escapedText.replace(urlRegex, (url) => {
    const linkColor = who === 'me' ? '#ffffff' : '#007aff';
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: ${linkColor}; text-decoration: underline;">${url}</a>`;
  });

  // 4. textContent の代わりに innerHTML を使ってリンクとして画面に流し込む
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