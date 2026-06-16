let currentTarget = "Y1";
let logicStore = {};

function init() {
    const inputs = document.getElementById("inputs-x");
    for (let i = 1; i <= 16; i++) inputs.innerHTML += `<div style="text-align:center;"><input type="checkbox" id="X${i}" onchange="updateStatus()"><div>X${i}</div></div>`;
    
    const outputs = document.getElementById("outputs-y");
    for (let i = 1; i <= 16; i++) {
        outputs.innerHTML += `<div style="text-align:center;"><div class="led" id="Y${i}-led"></div><div>Y${i}</div></div>`;
        const hidden = document.createElement("input");
        hidden.type = "checkbox"; hidden.id = `Y${i}`; hidden.style.display = "none";
        document.body.appendChild(hidden);
        logicStore[`Y${i}`] = [];
    }
    
    const list = document.getElementById("logic-list");
    for (let i = 1; i <= 16; i++) list.innerHTML += `<div style="padding:4px;">Y${i} = <span id="formula-Y${i}">-</span></div>`;
    
    updateStatus();
}

function loadLogic(target) {
    currentTarget = target;
    document.getElementById("target-label").innerHTML = `<b>${target} = </b>`;
    const container = document.getElementById("logic-container");
    container.innerHTML = "";
    logicStore[target].forEach(data => addBlock(data));
}

function addBlock(data = null) {
    const div = document.createElement("div");
    div.className = "block";
    div.innerHTML = `
        <select class="not-select"><option value="">-</option><option value="NOT">NOT</option></select>
        <select class="operand">${Array.from({length:16}, (_,i)=>`<option>X${i+1}</option>`).join('')}</select>
        <select class="operator"><option value="AND">AND</option><option value="OR">OR</option><option value="END">END</option></select>
    `;
    if (data) {
        div.querySelector(".not-select").value = data.not;
        div.querySelector(".operand").value = data.operand;
        div.querySelector(".operator").value = data.operator;
    }
    document.getElementById("logic-container").appendChild(div);
}

function removeBlock() {
    const container = document.getElementById("logic-container");
    if (container.children.length > 0) container.removeChild(container.lastElementChild);
}

function writeToStore() {
    // 画面上のブロックを全取得
    const blockElements = document.querySelectorAll("#logic-container .block");
    
    // データ保存用に抽出
    logicStore[currentTarget] = Array.from(blockElements).map(b => ({
        not: b.querySelector(".not-select").value,
        operand: b.querySelector(".operand").value,
        operator: b.querySelector(".operator").value
    }));
    
    // 表示用：ブロックを左から順に文字列結合
    // NOT/AND/OR を小文字に変換
    let formula = Array.from(blockElements).map(b => {
        const not = b.querySelector(".not-select").value.toLowerCase();
        const op = b.querySelector(".operand").value;
        const logic = b.querySelector(".operator").value.toLowerCase();
        
        // END は表示しないため、除外または変換
        if (logic === "end") return (not ? not + " " : "") + op;
        return (not ? not + " " : "") + op + " " + logic;
    }).join(" ");
    
    
    document.getElementById(`formula-${currentTarget}`).textContent = formula || "-";
}
function calculateAll() {
    for (let i = 1; i <= 16; i++) {
        const blocks = logicStore[`Y${i}`];
        if (blocks.length === 0) continue;
        let result = false; let isEnd = false;
        blocks.forEach((b, idx) => {
            if (isEnd) return;
            const val = document.getElementById(b.operand).checked ^ (b.not === "NOT");
            if (idx === 0) result = !!val;
            else result = (blocks[idx-1].operator === "AND") ? (result && !!val) : (result || !!val);
            if (b.operator === "END") isEnd = true;
        });
        document.getElementById(`Y${i}-led`).className = "led " + (result ? "on" : "");
        document.getElementById(`Y${i}`).checked = result;
    }
    updateStatus();
}

function updateStatus() {
    const calcStats = (prefix) => {
        let bin = "", val = 0;
        for (let i = 16; i >= 1; i--) {
            const el = document.getElementById(prefix + i);
            const bit = (el && el.checked ? 1 : 0);
            bin += bit; val = (val << 1) | bit;
        }
        return `${prefix}: ${bin.match(/.{1,4}/g).join(" ")} (Hex: 0x${val.toString(16).toUpperCase().padStart(4, '0')} | Dec: ${val})`;
    };
    document.getElementById("status-x").textContent = calcStats("X");
    document.getElementById("status-y").textContent = calcStats("Y");
}

function clearAll() { location.reload(); }
init();