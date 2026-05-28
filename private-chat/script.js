const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

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

// テスト用：相手のメッセージ
function addOther(text) {
  addMessage(text, "other");
}

sendBtn.addEventListener("click", () => {
  const text = inputEl.value.trim();
  if (!text) return;
  addMessage(text, "me");
  inputEl.value = "";
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ---- UI モック用の初期表示 ----
document.getElementById("selfIp").textContent = "192.168.0.12";
document.getElementById("otherIp").textContent = "未接続";

addSystem("相手が入室しました（テスト）");
document.getElementById("otherIp").textContent = "192.168.0.15";

addOther("こんにちは（相手）");
addMessage("OK（自分）", "me");
