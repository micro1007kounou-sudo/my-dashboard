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

// --- 配列をガチガチに混ぜる関数（追加） ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- シャッフルボタンのクリックイベント（修正） ---
shuffleBtn.addEventListener("click", () => {
  resetAll(false); // カードの選択状態などをクリア
  step = 2; 
  updateStatus(); 
  updateButtons();

  // 1. HTML上のカード（グリッド）を揺らす演出
  const cards = document.querySelectorAll(".grid-card");
  cards.forEach(c => c.classList.add("shuffling"));
  setTimeout(() => cards.forEach(c => c.classList.remove("shuffling")), 1000);

  // 2. ★超重要：裏側のカードデータの並び順をシャッフルする★
  const tarotKeys = Object.keys(tarot); // ["愚者", "魔術師", ...]
  const shuffledKeys = shuffleArray(tarotKeys); // ランダムに混ぜる

  // 3. シャッフルされた新しい順番で、グリッド（手札）のデータを再割り当てする
  cards.forEach((cardDiv, index) => {
    const newCardName = shuffledKeys[index];
    cardDiv.dataset.cardName = newCardName; // 新しいカード名を仕込む
    cardDiv.classList.remove("selected");   // 念のため選択を外す
  });
});

// --- 配置ボタンのクリックイベント（修正） ---
placeBtn.addEventListener("click", () => {
  if (step !== 3) return;

  selectedCards.forEach((name, i) => {
    const cardIndex = Object.keys(tarot).indexOf(name);
    const fileName = cardFiles[cardIndex];
    
    // 【修正】HTML/CSSのID名「node1, node2...」に合わせる
    const targetEl = document.getElementById(`node${i + 1}`);
    const roleName = positions[i + 1]; 

    if (targetEl) {
      // 先ほどCSSで整えたクラス名（role-label, spread-label）に綺麗に統一
      targetEl.innerHTML = `
        <div class="card-wrapper">
          <div class="role-label">${roleName}</div>
          <img src="cards/${fileName}" alt="${name}" class="tarot-img">
          <div class="spread-label">${name}</div>
        </div>
      `;
    }
  });

  // 表示アニメーション
  spreadContainer.style.display = "block";
  setTimeout(() => { spreadContainer.style.opacity = "1"; }, 10);
  
  // ステップ更新
  step = 4; 
  updateStatus(); 
  updateButtons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
function buildPrompt() {
  // value（id）ではなく、選択されている項目の「テキスト（日本語名）」を取得する
  const themeLabel = themeSelect.options[themeSelect.selectedIndex].text;
  const themeValue = themeSelect.value;
  
  let text = `あなたは相談者の心に寄り添う、思慮深く熟練したタロット占い師です。\n`;
  text += `今回の鑑定テーマは【${themeLabel}】です。単なる記号的な解釈ではなく、相談者の人生の物語を読み解くように深く鑑定してください。\n\n`;
  
  // --- 具体的な相談状況に応じた深掘り指示 ---
  if (themeValue === "love_no_partner") {
    text += "相談者は現在特定のパートナーがおらず、新しい良縁を求めています。今の停滞の原因がどこにあるのか、運命の歯車を回すために必要な「心の持ち方」や「具体的な行動」を重点的に提示してください。\n";
  } else if (themeValue === "love_with_partner") {
    text += "相談者には現在パートナーがいます。二人の間にある表面化していない課題や、絆を再確認し、より深い愛へ昇華させるためのアドバイスを重視してください。\n";
  } else if (themeValue === "love_unrequited") {
    text += "相談者は今、片思いをしています。相手の深層心理にある相談者への印象や、二人の関係が動く「転換点」はいつどこにあるのかを詳細に分析してください。\n";
  } else if (themeValue === "work") {
    text += "仕事におけるチャンスや課題、人間関係、あるいは今後のキャリアの進展について焦点を当ててください。\n";
  } else if (themeValue === "money") {
    text += "収支のバランス、投資や貯蓄のタイミング、経済的な豊かさを引き寄せるためのヒントに焦点を当ててください。\n";
  } else if (themeValue === "interpersonal") {
    text += "周囲の人々との調和や、コミュニケーションの改善点、信頼関係の構築について焦点を当ててください。\n";
  }
  else if (themeValue === "love_reconciliation") {
  text += "相談者は復縁を望んでいます。相手の現在の気持ち、再接近の可能性、復縁を成功させるために必要な行動や心構えを重点的に読み解いてください。\n";
}
else if (themeValue === "love_steal") {
  text += "相談者は略奪愛の状況にあります。相手の本心、現状の関係性の力学、成就の可能性、そして相談者が傷つかないための注意点を慎重に読み解いてください。\n";
}
else if (themeValue === "work_general") {
  text += "相談者は仕事全般の運勢について知りたいと考えています。現在の状況、今後の展開、職場環境、人間関係、そしてキャリア全体の流れを重点的に読み解いてください。\n";
}
else if (themeValue === "work_change") {
  text += "相談者は転職を検討しています。適職、転職のタイミング、成功の鍵、注意すべき点、そして今後のキャリアの方向性について重点的に分析してください。\n";
}
else if (themeValue === "money_general") {
  text += "相談者は金運全体の流れを知りたいと考えています。収支のバランス、今後の運気の波、改善すべき点、そして豊かさを引き寄せるための行動について重点的に読み解いてください。\n";
}
else if (themeValue === "money_gamble") {
  text += "相談者はギャンブル運について知りたいと考えています。勝負運の流れ、リスクの見極め、勝ちやすいタイミング、そして注意すべき点を慎重に読み解いてください。\n";
}
else if (themeValue === "money_lottery") {
  text += "相談者は宝くじ運について知りたいと考えています。当たりやすい時期、運気の波、購入のタイミング、そして引き寄せのヒントを重点的に分析してください。\n";
}else if (themeValue === "study") {
  text += "相談者は学業や試験運について知りたいと考えています。集中力、結果、努力の方向性、そして成果を最大化するための具体的な対策を重点的に読み解いてください。\n";
}
else if (themeValue === "life_path") {
  text += "相談者は人生の方向性や生き方について悩んでいます。使命、転機、選択すべき道、そして心が納得する未来へ進むためのヒントを重点的に分析してください。\n";
}
else if (themeValue === "travel") {
  text += "相談者は旅行運について知りたいと考えています。行くべき場所、最適なタイミング、旅先で得られる気づきや注意点を読み解いてください。\n";
}
else if (themeValue === "lost_item") {
  text += "相談者は探し物をしています。見つかる時期、場所のヒント、探し方のポイント、そして心の状態が与える影響について慎重に読み解いてください。\n";
}
else if (themeValue === "free") {
  text += "";
}
if (themeValue === "free") {
  text += "\n【相談内容（自由に編集してください）】\n";
  text += "ここに相談内容を自由に書いてください。\n\n";
}

  text += "\n【鑑定の指針】\n";
  text += "・6枚のカードが織りなす「因果関係」と「ストーリー」を語ってください。\n";
  text += "・専門用語を使いすぎず、相談者が明日から何をすればいいか希望を持てる温かい言葉で構成してください。\n\n";
  text += "【ヘキサグラム・スプレッド】\n";
  for (let i = 1; i <= 6; i++) {
    const name = selectedCards[i - 1];
    // カード名と、もしあればその基本キーワードを添える
    text += `${positions[i]}：${name}${tarot[name] ? `（意味：${tarot[name]}）` : ""}\n`;
  }
  
  text += "\n相談者の心に深く響く、至高の鑑定をお願いいたします。";
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
  
  // 各ノードのカード表示をクリア
  for (let i = 1; i <= 6; i++) {
    const node = document.getElementById(`node${i}`);
    if (node) node.innerHTML = "";
  }

  modal.style.display = "none";
  spreadContainer.style.opacity = "0"; 
  spreadContainer.style.display = "none";

  if (resetStep) {
    step = 1;
    // ★ここにあった themeSelect.selectedIndex = 0;（または themeSelect.value = "総合運";）を削除
    // これだけで、ユーザーが選んだテーマがそのまま維持されます！
  }
  
  updateStatus(); 
  updateButtons();
}

initGrid(); updateStatus(); updateButtons();

// ★ LINEブラウザ対策：テーマ選択の値を確実に反映させる
themeSelect.addEventListener("input", () => {
  themeSelect.blur(); // フォーカスを外して確定させる
});
