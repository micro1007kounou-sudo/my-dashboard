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
// 💡 送信中（承認待ち）のメッセージを一時保管するリスト
let pendingMessages = new Map();

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
    
    // 💬 リアルタイムのチャット受信
    if (data.type === "chat") {
      // 💡 もし自分が送信したメッセージ（IDが一致するもの）が返ってきたら
      if (data.msgId && pendingMessages.has(data.msgId)) {
        const bubbleEl = pendingMessages.get(data.msgId);
        bubbleEl.style.opacity = "1"; // 💡 薄暗さを解除して「送信完了」を証明！
        const statusEl = bubbleEl.parentNode.querySelector(".msg-status");
        if (statusEl) statusEl.remove(); // 「送信中...」の文字を消す
        pendingMessages.delete(data.msgId); // 保管庫から削除
        return;
      }

      // 💡 サーバーから「名前付き」で跳ね返ってきた場合、名前が自分以外なら相手の発言
      if (data.username && myName && data.username.trim() !== myName.trim()) {
        addMessage(data.text, "other");
        return;
      }
      
      // 💡 万が一サーバーが名前を返さず、かつ自分のIDでもないものは純粋に相手からのメッセージ
      if (!data.msgId) {
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

    // 🚨 切断されたら、まだ送信完了していないメッセージを「送信失敗」にする
    pendingMessages.forEach((bubbleEl) => {
      bubbleEl.style.background = "#ff3b30"; // 赤色にする
      const statusEl = bubbleEl.parentNode.querySelector(".msg-status");
      if (statusEl) statusEl.textContent = "❌ 送信失敗（未到達）";
    });
    pendingMessages.clear();

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
function addMessage(text, who = "me", msgId = null) {
  const row = document.createElement("div");
  row.className = "message-row " + (who === "me" ? "me" : "other");

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (who === "me" ? "me" : "other");
  
  // 💡 自分が送信中のものは、確認が取れるまで一時的に薄暗く（opacity 0.5）しておく
  if (who === "me" && msgId) {
    bubble.style.opacity = "0.5";
    bubble.style.transition = "opacity 0.2s ease";
  }
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
  const linkedHtml = escapedText.replace(urlRegex, (url) => {
    const linkColor = who === 'me' ? '#ffffff' : '#007aff';
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: ${linkColor}; text-decoration: underline;">${url}</a>`;
  });

  bubble.innerHTML = linkedHtml;
  row.appendChild(bubble);

  // 💡 送信中テキストの追加
  if (who === "me" && msgId) {
    const status = document.createElement("div");
    status.className = "msg-status";
    status.style.fontSize = "10px";
    status.style.color = "#8e8e93";
    status.style.marginTop = "2px";
    status.style.textAlign = "right";
    status.textContent = "送信中...";
    row.appendChild(status);
  }
  
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return bubble; // 💡 後から状態を変えられるように要素を返す
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

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("通信が切断されているため、メッセージを送れません。再接続をお待ちください。");
    return;
  }

  // 💡 クライアント側で一意のメッセージIDを生成（時間＋乱数）
  const msgId = "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

  // 💡 画面に「送信中状態」で表示し、要素を保管庫（Map）に記憶させる
  const bubbleElement = addMessage(text, "me", msgId);
  pendingMessages.set(msgId, bubbleElement);

  // 💡 メッセージIDを乗せてサーバーへ送信
  ws.send(JSON.stringify({ type: "chat", text, msgId }));
  
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