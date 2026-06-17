let currentTarget = "M1";
let logicStore = {};
let mStore = new Array(16).fill(false); // M1-M16の状態

function init() {
    // 1. セレクトボックスの動的生成
    const selector = document.getElementById("target-selector");
    selector.innerHTML = '<optgroup label="M リレー">' + 
        Array.from({length:16}, (_,i)=>`<option value="M${i+1}">M${i+1}</option>`).join('') +
        '</optgroup><optgroup label="Y 出力">' + 
        Array.from({length:16}, (_,i)=>`<option value="Y${i+1}">Y${i+1}</option>`).join('') +
        '</optgroup>';

    // 2. 入力/M/Yの表示生成
    const inputs = document.getElementById("inputs-x");
    for (let i = 1; i <= 16; i++) inputs.innerHTML += `<div style="text-align:center;"><input type="checkbox" id="X${i}" onchange="updateStatus()"><div>X${i}</div></div>`;
    
    const inputsM = document.getElementById("inputs-m");
    for (let i = 1; i <= 16; i++) inputsM.innerHTML += `<div style="text-align:center;"><div class="led-m" id="M${i}-led"></div><div>M${i}</div></div>`;
    
    const outputs = document.getElementById("outputs-y");
    for (let i = 1; i <= 16; i++) {
        outputs.innerHTML += `<div style="text-align:center;"><div class="led" id="Y${i}-led"></div><div>Y${i}</div></div>`;
        const hidden = document.createElement("input");
        hidden.type = "checkbox"; hidden.id = `Y${i}`; hidden.style.display = "none";
        document.body.appendChild(hidden);
        logicStore[`M${i}`] = [];
        logicStore[`Y${i}`] = [];
    }
    
    // 3. ロジックリストの生成
    const list = document.getElementById("logic-list");
    for (let i = 1; i <= 16; i++) list.innerHTML += `<div style="padding:2px; font-size:0.9em;">M${i} = <span id="formula-M${i}">-</span></div>`;
    for (let i = 1; i <= 16; i++) list.innerHTML += `<div style="padding:2px; font-size:0.9em;">Y${i} = <span id="formula-Y${i}">-</span></div>`;
    
   updateStatus();
    loadLogic("M1"); // ここを追加：起動時にM1を読み込む
}

function loadLogic(target) {
    currentTarget = target;
    document.getElementById("target-label").innerHTML = `<b>${target} = </b>`;
    const container = document.getElementById("logic-container");
    container.innerHTML = "";
    if (logicStore[target]) logicStore[target].forEach(data => addBlock(data));
}

function addBlock(data = null) {
    const div = document.createElement("div");
    div.className = "block";
    // X, M, Yすべてを選択可能に
    const options = Array.from({length:16}, (_,i)=>`<option>X${i+1}</option>`).join('') +
                    Array.from({length:16}, (_,i)=>`<option>M${i+1}</option>`).join('') +
                    Array.from({length:16}, (_,i)=>`<option>Y${i+1}</option>`).join('');
    
    div.innerHTML = `
        <select class="not-select"><option value="">-</option><option value="NOT">NOT</option></select>
        <select class="operand">${options}</select>
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
    const blockElements = document.querySelectorAll("#logic-container .block");
    logicStore[currentTarget] = Array.from(blockElements).map(b => ({
        not: b.querySelector(".not-select").value,
        operand: b.querySelector(".operand").value,
        operator: b.querySelector(".operator").value
    }));
    
    const formula = Array.from(blockElements).map(b => {
        const not = b.querySelector(".not-select").value.toLowerCase();
        const op = b.querySelector(".operand").value;
        const logic = b.querySelector(".operator").value.toLowerCase();
        return (logic === "end") ? (not ? not + " " : "") + op : (not ? not + " " : "") + op + " " + logic;
    }).join(" ");
    document.getElementById(`formula-${currentTarget}`).textContent = formula || "-";
}

function computeLogic(target) {
    const blocks = logicStore[target];
    if (!blocks || blocks.length === 0) return false;
    let result = false; let isEnd = false;
    
    blocks.forEach((b, idx) => {
        if (isEnd) return;
        const prefix = b.operand.charAt(0);
        const index = parseInt(b.operand.substring(1)) - 1;
        
        let val = false;
        if (prefix === 'X') val = document.getElementById(b.operand).checked;
        if (prefix === 'M') val = mStore[index];
        if (prefix === 'Y') val = document.getElementById(b.operand).checked;
        
        val = val ^ (b.not === "NOT");
        if (idx === 0) result = !!val;
        else result = (blocks[idx-1].operator === "AND") ? (result && !!val) : (result || !!val);
        if (b.operator === "END") isEnd = true;
    });
    return result;
}

function calculateAll() {
    for (let i = 1; i <= 16; i++) {
        mStore[i-1] = computeLogic(`M${i}`);
        document.getElementById(`M${i}-led`).className = "led-m " + (mStore[i-1] ? "on" : "");
    }
    for (let i = 1; i <= 16; i++) {
        const result = computeLogic(`Y${i}`);
        document.getElementById(`Y${i}-led`).className = "led " + (result ? "on" : "");
        document.getElementById(`Y${i}`).checked = result;
    }
    updateStatus();
}

function updateStatus() {
    const calcStats = (prefix, dataArray = null) => {
        let bin = "", val = 0;
        for (let i = 16; i >= 1; i--) {
            const bit = dataArray ? (dataArray[i-1] ? 1 : 0) : (document.getElementById(prefix + i)?.checked ? 1 : 0);
            bin += bit; val = (val << 1) | bit;
        }
        return `${prefix}: ${bin.match(/.{1,4}/g).join(" ")} (Hex: 0x${val.toString(16).toUpperCase().padStart(4, '0')} | Dec: ${val})`;
    };
    document.getElementById("status-x").textContent = calcStats("X");
    document.getElementById("status-m").textContent = calcStats("M", mStore);
    document.getElementById("status-y").textContent = calcStats("Y");
}

function clearCurrentLogic() {
    if (!confirm(`${currentTarget} のロジックをすべて削除しますか？`)) return;
    logicStore[currentTarget] = [];
    document.getElementById("logic-container").innerHTML = "";
    document.getElementById(`formula-${currentTarget}`).textContent = "-";
    calculateAll();
}

function confirmClearAll() { if (confirm("全てリセットしますか？")) location.reload(); }

function exportLogic() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logicStore));
    const a = document.createElement('a'); a.href = dataStr; a.download = "io_simulator_data.json"; a.click();
}

function importLogic(e) {
    const r = new FileReader();
    r.onload = (e) => {
        logicStore = JSON.parse(e.target.result);
        loadLogic("M1");
        Object.keys(logicStore).forEach(t => {
            const b = logicStore[t];
            const f = b.map(x => (x.operator.toLowerCase() === "end") ? (x.not ? x.not + " " : "") + x.operand : (x.not ? x.not + " " : "") + x.operand + " " + x.operator.toLowerCase()).join(" ");
            document.getElementById(`formula-${t}`).textContent = f || "-";
        });
        alert("インポート完了");
    };
    r.readAsText(e.target.files[0]);
}

init();