const tarot = {
  "愚者": "自由・冒険・無邪気・新しい旅立ち", "魔術師": "創造・始まり・才能・行動力",
  "女教皇": "直感・静寂・精神性・冷静さ", "女帝": "豊かさ・愛情・育成",
  "皇帝": "支配・安定・責任", "法王": "伝統・助言・精神性",
  "恋人": "選択・愛・関係性", "戦車": "勝利・前進・意志",
  "力": "勇気・忍耐・内なる強さ", "隠者": "探求・内省・孤独",
  "運命の輪": "転機・変化・チャンス", "正義": "公平・バランス・判断",
  "吊るされた男": "犠牲・視点変更・停滞", "死神": "終わり・再生・変化",
  "節制": "調和・節度・バランス", "悪魔": "誘惑・依存・束縛",
  "塔": "崩壊・衝撃・リセット", "星": "希望・癒し・未来",
  "月": "不安・迷い・潜在意識", "太陽": "成功・幸福・活力",
  "審判": "復活・決断・再評価", "世界": "完成・達成・統合"
};

const cardFiles = [
  "00-fool.png", "01-magician.png", "02-highpriestess.png", "03-the-empress.png",
  "04-the-emperor.png", "05-the-hierophant.png", "06-the-lovers.png", "07-the-chariot.png",
  "08-strength.png", "09-the-hermit.png", "10-wheel-offortune.png", "11-justice.png",
  "12-the-hangedman.png", "13-death.png", "14-temperance.png", "15-the-devil.png",
  "16-the-tower.png", "17-the-star.png", "18-the-moon.png", "19-the-sun.png",
  "20-judgement.png", "21-the-world.png"
];

const positions = { 1: "過去", 2: "現在", 3: "未来", 4: "対策", 5: "周囲", 6: "結果" };

const gridContainer = document.getElementById("grid-container");
const spreadContainer = document.getElementById("spread-container");
const shuffleBtn = document.getElementById("shuffle-btn");
const placeBtn = document.getElementById("place-btn");
const promptBtn = document.getElementById("prompt-btn");
const resetBtn = document.getElementById("reset-btn");
const statusEl = document.getElementById("status");
const themeSelect = document.getElementById("tarot-theme");
const modal = document.getElementById("modal");
const promptText = document.getElementById("prompt-text");
const closeModal = document.getElementById("close-modal");
const copyBtn = document.getElementById("copy-btn");

let selectedCards = [];
let step = 1;

function initGrid() {
  gridContainer.innerHTML = "";
  Object.keys(tarot).forEach((name, index) => {
    const div = document.createElement("div");
    div.className = "grid-card";
    div.dataset.cardName = name;
    div.addEventListener("click", onCardClick);
    gridContainer.appendChild(div);
  });
}

function updateStatus() {
  if (step === 1) statusEl.textContent = "① 占うテーマを選んでシャッフルしましょう";
  if (step === 2) statusEl.textContent = "② 気になるカードを6枚選んでください (" + selectedCards.length + "/6)";
  if (step === 3) statusEl.textContent = "③ 配置ボタンを押して結果を並べましょう";
  if (step === 4) statusEl.textContent = "④ プロンプトを表示してAIに相談しましょう";
}

function updateButtons() {
  shuffleBtn.disabled = step !== 1;
  placeBtn.disabled = step !== 3;
  promptBtn.disabled = step !== 4;
  themeSelect.disabled = step !== 1;
}

function onCardClick(e) {
  if (step !== 2) return;
  const div = e.currentTarget;
  if (div.classList.contains("selected")) return;
  if (selectedCards.length >= 6) return;
  div.classList.add("selected");
  selectedCards.push(div.dataset.cardName);
  updateStatus();
  if (selectedCards.length === 6) { step = 3; updateStatus(); updateButtons(); }
}

shuffleBtn.addEventListener("click", () => {
  resetAll(false);
  step = 2; updateStatus(); updateButtons();
  const cards = document.querySelectorAll(".grid-card");
  cards.forEach(c => c.classList.add("shuffling"));
  setTimeout(() => cards.forEach(c => c.classList.remove("shuffling")), 1000);
});

placeBtn.addEventListener("click", () => {
  if (step !== 3) return;
  selectedCards.forEach((name, i) => {
    const cardIndex = Object.keys(tarot).indexOf(name);
    const fileName = cardFiles[cardIndex];
    const targetEl = document.getElementById(`spread${i + 1}`);
    const nodeEl = document.getElementById(`node${i + 1}`); // ノードを取得
    
    // 1. 画像の上の文字を「役割名」にする
    const roleName = positions[i + 1]; 
    targetEl.innerHTML = `
      <div class="card-wrapper">
        <img src="cards/${fileName}" alt="${name}" class="tarot-img">
        <div class="card-name-overlay">${roleName}</div>
      </div>
    `;
    
    // 2. 下のラベルの文字を「カード名」に書き換える
    const labelEl = nodeEl.querySelector(".spread-label");
    if (labelEl) {
      labelEl.textContent = name;
    }
  });
  
  spreadContainer.style.display = "block";
  setTimeout(() => spreadContainer.style.opacity = "1", 10);
  step = 4; updateStatus(); updateButtons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
function buildPrompt() {
  const theme = themeSelect.value;
  let text = `あなたは熟練したタロット占い師です。\n今回は【${theme}】について、以下のヘキサグラムスプレッドから質問者の現状と今後の流れを総合的に読み解いてください。\n`;
  
  if(theme === "恋愛運") text += "特に相手の気持ちや、より良い関係を築くための具体的なアプローチに焦点を当ててください。\n";
  if(theme === "仕事運") text += "仕事におけるチャンスや課題、人間関係、あるいは今後のキャリアの進展について焦点を当ててください。\n";
  if(theme === "金運") text += "収支のバランス、投資や貯蓄のタイミング、経済的な豊かさを引き寄せるためのヒントに焦点を当ててください。\n";
  if(theme === "対人関係") text += "周囲の人々との調和や、コミュニケーションの改善点、信頼関係の構築について焦点を当ててください。\n";
  
  text += "カードの意味を単に説明するのではなく、全体の流れ・因果関係・最終的なメッセージを中心にまとめてください。\n\n【スプレッド】\n";
  for (let i = 1; i <= 6; i++) {
    const name = selectedCards[i - 1];
    text += `${positions[i]}：${name}（意味：${tarot[name]}）\n`;
  }
  text += "\n最後に、質問者への総合アドバイスを1つ書いてください。";
  return text;
}

promptBtn.addEventListener("click", () => {
  promptText.textContent = buildPrompt();
  modal.style.display = "flex";
});

closeModal.addEventListener("click", () => modal.style.display = "none");

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(promptText.textContent);
  copyBtn.textContent = "コピー完了！";
  setTimeout(() => copyBtn.textContent = "プロンプトをコピーする", 1500);
});

resetBtn.addEventListener("click", () => resetAll(true));

function resetAll(resetStep = true) {
  selectedCards = [];
  document.querySelectorAll(".grid-card").forEach(c => c.classList.remove("selected"));
  document.querySelectorAll(".spread-card").forEach(c => {
    c.innerHTML = "";
    c.textContent = "";
  });
  modal.style.display = "none";
  spreadContainer.style.opacity = "0"; spreadContainer.style.display = "none";
  if (resetStep) {
    step = 1;
    themeSelect.value = "総合運";
  }
  updateStatus(); updateButtons();
}

initGrid(); updateStatus(); updateButtons();