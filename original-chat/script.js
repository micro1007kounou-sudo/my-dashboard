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

// タイマーをリセットして数え直す関数
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

// ユーザーの「操作」を検知するイベント登録
["click", "keydown", "touchstart", "scroll"].forEach((eventType) => {
  document.addEventListener(eventType, resetDisconnectTimer);
});

// サーバーの勝手な切断を防ぐための「生存確認」の仕組み
function startHeartbeat() {
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" })); 
    }
  }, 30000); // 30秒ごと
}

// 切断されたらピンポンのタイマーを止める関数
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

  // サーバー起動待ちのグレーアウトを表示
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    overlay.style.opacity = "1";
  }

  // 画面切り替え
  loginScreen.style.display = "none";
  chatScreen.style.display = "block";
  document.getElementById("selfName").textContent = myName;
  document.getElementById("roomName").textContent = roomName;

  // 🔌 WebSocketの接続を開始
  connectWebSocket(roomName);
});

// ==========================================
// 🔌 WebSocketの接続・通信処理（最強・自動再接続版）
// ==========================================
function connectWebSocket(roomName) {
  const WS_URL = "wss://orijinal-chat.onrender.com"; 
  ws = new WebSocket(WS_URL);

  // 1. 📥 【最優先】まず最初にメッセージ受信の準備を完璧に終わらせる！
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    // 🕒 過去ログが一気に届いたときの処理
    if (data.type === "history") {
      data.messages.forEach((msg) => {
        if (myName && msg.username && msg.username.trim() === myName.trim()) {
          addMessage(msg.text, "me");     // 過去の自分の発言 ➡️ 右側（青）
        } else {
          addMessage(msg.text, "other");  // 相手の発言 ➡️ 左側（グレー）
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
    
    if (data.type === "chat") {
      addMessage(data.text, "other");
      return;
    }
  });

  // 2. 🔌 接続完了時の処理（網を張り終えた後に、入室届を出す！）
  ws.addEventListener("open", () => {
    addSystem("サーバーに接続しました。認証中...");
    
    // サーバーが目覚めたのでグレーアウトを消し去る
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => { overlay.style.display = "none"; }, 500);
    }

    // ここで初めて安全にタイマーとピンポンを開始
    resetDisconnectTimer();
    startHeartbeat();

    // 🚀 受信の準備が100%できているので、満を持してサーバーにjoinを送る！
    ws.send(JSON.stringify({
      type: "join",
      username: myName,
      room: roomName
    }));
  });

  // 3. エラー発生時
  ws.addEventListener("error", () => {
    console.error("WebSocketエラーが発生しました。");
    stopHeartbeat(); 
  });
  
  // 4. 🚨 切断時（★ここを自動再接続にアップデート！）
  ws.addEventListener("close", () => {
    stopHeartbeat(); 

    // 💡 すでに入室済み（名前がある）なら、ログイン画面に戻さず裏で繋ぎ直す！
    if (myName) {
      addSystem("通信が一時的に途切れました。自動再接続しています...");
      
      setTimeout(() => {
        // 🚀 保管してある roomName を使って、自動で再接続を実行！
        connectWebSocket(roomName); 
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
function addMessage(text, who = "me") {
  const row = document.createElement("div");
  row.className = "message-row " + (who === "me" ? "me" : "other");

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (who === "me" ? "me" : "other");
  
  // 🔗【URLリンク化処理】
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // 特殊文字をエスケープして安全性を確保
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  // URLをリンク用のaタグに変換
  const linkedHtml = escapedText.replace(urlRegex, (url) => {
    const linkColor = who === 'me' ? '#ffffff' : '#007aff';
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: ${linkColor}; text-decoration: underline;">${url}</a>`;
  });

  // HTMLとして吹き出しに流し込む
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
  
  // メッセージを送ったので無操作タイマーをリセット
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
      const roomName = roomInput.value.trim();
      connectWebSocket(roomName); // 再接続を実行
    }
  }
});