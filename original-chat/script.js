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
// 💡 送信中（未確定）の吹き出し要素を一時的に覚える配列
let unconfirmedBubbles = [];

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
          addMessage(msg.text, "me", false); 
        } else {
          addMessage(msg.text, "other", false); 
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
      // 💡 サーバーからメッセージ（＝通信が生きている証拠）が届いたら、
      // 自分が今送ったばかりの「送信中...」のメッセージをすべて一気に「送信完了」にする！
      confirmAllPendingMessages();

      // 💡 サーバー側が発言者を判定する名前（username）を返してくれて、かつそれが自分以外なら左側に出す
      if (data.username && myName && data.username.trim() !== myName.trim()) {
        addMessage(data.text, "other", false);
      } else if (!data.username) {
        // 万が一サーバーが名前を返さない古い仕様の場合、届いたものは相手からのメッセージとして扱う
        addMessage(data.text, "other", false);
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

    // 🚨 【幽霊メッセージの完全排除】
    // サーバーが瞬停して届かなかったメッセージがあれば、即座に「送信失敗」と画面に赤字で明示する！
    unconfirmedBubbles.forEach((item) => {
      item.bubble.style.background = "#ff3b30"; // 吹き出しを赤くする
      if (item.statusEl) {
        item.statusEl.textContent = "❌ 送信失敗（届いていません）";
        item.statusEl.style.color = "#ff3b30";
      }
    });
    unconfirmedBubbles = []; // クリア

    if (myName) {
      addSystem("🔄 通信が一時的に途切れました。自動再接続しています...");
      setTimeout(() => { connectWebSocket(roomName); }, 1000); 
    } else {
      const overlay = document.getElementById("loading-overlay");
      if (overlay) overlay.style.display = "none";
    }
  });
}

// 💡 送信中メッセージを確定させる関数
function confirmAllPendingMessages() {
  unconfirmedBubbles.forEach((item) => {
    item.bubble.style.opacity = "1"; // 明るくする
    if (item.statusEl) item.statusEl.remove(); // 「送信中...」を消す
  });
  unconfirmedBubbles = [];
}

// ==========================================
// 💬 メッセージ表示・送信ロジック
// ==========================================
function addMessage(text, who = "me", isPending = false) {
  const row = document.createElement("div");
  row.className = "message-row " + (who === "me" ? "me" : "other");

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (who === "me" ? "me" : "other");
  
  // 💡 送信中の場合は一時的に薄暗くする
  if (who === "me" && isPending) {
    bubble.style.opacity = "0.6";
  }
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
  const linkedHtml = escapedText.replace(urlRegex, (url) => {
    const linkColor = who === 'me' ? '#ffffff' : '#007aff';
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: ${linkColor}; text-decoration: underline;">${url}</a>`;
  });

  bubble.innerHTML = linkedHtml;
  row.appendChild(bubble);

  let statusEl = null;
  // 💡 送信中テキストの追加
  if (who === "me" && isPending) {
    statusEl = document.createElement("div");
    statusEl.className = "msg-status";
    statusEl.style.fontSize = "10px";
    statusEl.style.color = "#8e8e93";
    statusEl.style.marginTop = "2px";
    statusEl.style.textAlign = "right";
    statusEl.textContent = "送信中...";
    row.appendChild(statusEl);
  }
  
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  // 💡 未確定リストに突っ込むためのオブジェクトを返す
  return { bubble, statusEl };
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

  // ① まず画面に「送信中...」の状態で自分の吹き出しを出す
  const msgItem = addMessage(text, "me", true);
  unconfirmedBubbles.push(msgItem);

  try {
    // ② サーバーへパケットを送信
    ws.send(JSON.stringify({ type: "chat", text }));

    // ③ 💡【物理チェック】
    // ブラウザの送信バッファ（待ちデータ）が0＝「今100%完全に端末からパケットが飛び立った」ら、
    // サーバーが正常な時は一瞬（数ミリ秒）で0になるので、その場合はすぐに「送信中...」を消して確定させる！
    setTimeout(() => {
      if (ws && ws.bufferedAmount === 0 && ws.readyState === WebSocket.OPEN) {
        // 瞬停中でなければ、ここで即座にパッと明るくなって送信完了になります！
        msgItem.bubble.style.opacity = "1";
        if (msgItem.statusEl) msgItem.statusEl.remove();
        // リストから除外
        unconfirmedBubbles = unconfirmedBubbles.filter(item => item !== msgItem);
      }
    }, 50);

  } catch (err) {
    // 万が一送信エラーが出たら即座に失敗にする
    msgItem.bubble.style.background = "#ff3b30";
    if (msgItem.statusEl) msgItem.statusEl.textContent = "❌ 送信失敗";
  }
  
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