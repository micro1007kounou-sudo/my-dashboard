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

// ==========================================
// 🕒 10時間無操作タイマー ＆ 切断防止（ピンポン）の設定
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
  const roomName = roomInput.value.trim();

  if (!myName || !roomName) {
    alert("名前と合言葉を入力してください。");
    return;
  }

  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    overlay.style.opacity = "1";
  }

  loginScreen.style.display = "none";
  chatScreen.style.display = "block";
  document.getElementById("selfName").textContent = myName;
  document.getElementById("roomName").textContent = roomName;

  connectWebSocket(roomName);
});

// ==========================================
// 🔌 WebSocketの接続・通信処理
// ==========================================
function connectWebSocket(roomName) {
  const WS_URL = "wss://orijinal-chat.onrender.com"; 
  ws = new WebSocket(WS_URL);

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "history") {
      data.messages.forEach((msg) => {
        if (myName && msg.username && msg.username.trim() === myName.trim()) {
          addMessage(msg.text, "me"); 
        } else {
          addMessage(msg.text, "other"); 
        }
      });
      return;
    }

    if (data.type === "roominfo") {
      document.getElementById("otherName").textContent = data.otherName || "未接続";
      return;
    }
    
    if (data.type === "system") {
      addSystem(data.text); 
      return;
    }
    
    // 💬 リアルタイムのチャット受信（完全受領方式）
    if (data.type === "chat") {
      // 💡 サーバーから跳ね返ってきた名前が「自分」なら右側、それ以外なら左側に出す！
      if (data.username && myName && data.username.trim() === myName.trim()) {
        addMessage(data.text, "me");
      } else {
        addMessage(data.text, "other");
      }
      return;
    }
  });

  ws.addEventListener("open", () => {
    addSystem("🟢 サーバーに接続しました。");
    
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => { overlay.style.display = "none"; }, 500);
    }

    resetDisconnectTimer();
    startHeartbeat();

    ws.send(JSON.stringify({
      type: "join",
      username: myName,
      room: roomName
    }));
  });

  ws.addEventListener("error", () => {
    console.error("WebSocketエラーが発生しました。");
    stopHeartbeat(); 
  });
  
  ws.addEventListener("close", () => {
    stopHeartbeat(); 

    if (myName) {
      addSystem("🔄 通信が一時的に途切れました。自動再接続しています...");
      setTimeout(() => { connectWebSocket(roomName); }, 1000); 
    } else {
      const overlay = document.getElementById("loading-overlay");
      if (overlay) overlay.style.display = "none";
    }
  });
}

// ==========================================
// 💬 メッセージ表示・送信ロジック
// ==========================================
function addMessage(text, who = "me") {
  const row = document.createElement("div");
  row.className = "message-row " + (who === "me" ? "me" : "other");

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (who === "me" ? "me" : "other");
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
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
// 👇 ★ここから追加（長文のときは送信ストップして警告）
  if (text.length > 500) {
    alert("メッセージが長すぎます（500文字以内）");
    return; 
  }
  // 👆 ★ここまで追加
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("通信が切断されているため、メッセージを送れません。再接続をお待ちください。");
    return;
  }

  // 💡 【超重要】ここではまだ画面にメッセージを出さない！
  // サーバーに無事到達して、オウム返しが戻ってきたときだけ画面に表示される。
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
      const roomName = roomInput.value.trim();
      connectWebSocket(roomName); 
    }
  }
});