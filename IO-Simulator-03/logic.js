let currentTarget = "M1";
let logicStore = {};
let mStore = new Array(16).fill(false);
let tStore = Array.from({length: 16}, (_, i) => ({
    id: i + 1, elapsed: 0, setPoint: 1000, done: false
}));

let isRunning = false;
let lastTime = performance.now();
// --- 1. 変数定義エリアに追加 ---
let xpStore = new Array(16).fill(false); // 押しボタン用状態管理

function init() {
    const selector = document.getElementById("target-selector");
    selector.innerHTML = 
        '<optgroup label="M リレー">' + Array.from({length:16}, (_,i)=>`<option value="M${i+1}">M${i+1}</option>`).join('') + '</optgroup>' +
        '<optgroup label="T タイマー">' + Array.from({length:16}, (_,i)=>`<option value="T${i+1}">T${i+1}</option>`).join('') + '</optgroup>' +
        '<optgroup label="Y 出力">' + Array.from({length:16}, (_,i)=>`<option value="Y${i+1}">Y${i+1}</option>`).join('') + '</optgroup>';

// init() 内の inputs のループ部分をこれに差し替え
const inputs = document.getElementById("inputs-x");
for (let i = 1; i <= 16; i++) {
    inputs.innerHTML += `
        <div style="text-align:center; display:inline-block; margin:5px; border:1px solid #eee; padding:2px;">
            <div style="font-weight:bold;">X${i}</div>
            <input type="checkbox" id="X${i}" onchange="updateStatus()"><br>
            <button id="XP${i}" 
                onmousedown="setXP(${i}, true)" 
                onmouseup="setXP(${i}, false)" 
                onmouseleave="setXP(${i}, false)"
                style="width:30px; height:20px; font-size:9px;">PB</button>
        </div>`;
}
    const inputsM = document.getElementById("inputs-m");
    for (let i = 1; i <= 16; i++) inputsM.innerHTML += `<div style="text-align:center;"><div class="led-m" id="M${i}-led"></div><div>M${i}</div></div>`;
    
    const outputs = document.getElementById("outputs-y");
    for (let i = 1; i <= 16; i++) {
        outputs.innerHTML += `<div style="text-align:center;"><div class="led" id="Y${i}-led"></div><div>Y${i}</div></div>`;
        const hidden = document.createElement("input");
        hidden.type = "checkbox"; hidden.id = `Y${i}`; hidden.style.display = "none";
        document.body.appendChild(hidden);
        logicStore[`M${i}`] = []; logicStore[`T${i}`] = []; logicStore[`Y${i}`] = [];
    }

    const timersT = document.getElementById("timers-t");
    for (let i = 1; i <= 16; i++) {
        timersT.innerHTML += `
            <div style="font-size:0.8em; margin:5px; display:inline-block; width: 200px;">
                T${i}: <progress id="T${i}-bar" value="0" max="1000"></progress> 
                <span id="T${i}-text">0ms</span>
            </div>`;
    }

// 新しい3カラムのコンテナにそれぞれ追加する
    const listM = document.getElementById("list-m");
    const listT = document.getElementById("list-t");
    const listY = document.getElementById("list-y");

    for (let i = 1; i <= 16; i++) {
        listM.innerHTML += `<div style="padding:2px; font-size:0.8em;">M${i} = <span id="formula-M${i}">-</span></div>`;
        listT.innerHTML += `<div style="padding:2px; font-size:0.8em;">T${i} = <span id="formula-T${i}">-</span></div>`;
        listY.innerHTML += `<div style="padding:2px; font-size:0.8em;">Y${i} = <span id="formula-Y${i}">-</span></div>`;
    }
    updateStatus();
    loadLogic("M1");
}

function loadLogic(target) {
    currentTarget = target;
    document.getElementById("target-label").innerHTML = `<b>${target} = </b>`;
    const container = document.getElementById("logic-container");
    container.innerHTML = "";
    if (logicStore[target]) logicStore[target].forEach(data => addBlock(data));
}

function addBlock(data = null) {
    const container = document.getElementById("logic-container");
    const div = document.createElement("div");
    div.className = "block";

    const options = 
        Array.from({length:16}, (_,i)=>`<option value="X${i+1}">X${i+1}</option>`).join('') +
        Array.from({length:16}, (_,i)=>`<option value="M${i+1}">M${i+1}</option>`).join('') +
        Array.from({length:16}, (_,i)=>`<option value="T${i+1}">T${i+1}</option>`).join('') +
        Array.from({length:16}, (_,i)=>`<option value="Y${i+1}">Y${i+1}</option>`).join('');
    div.innerHTML = `
        <select class="not-select">
            <option value="">-</option>
            <option value="NOT">NOT</option>
        </select>
        <select class="operand">${options}</select>
        <select class="operator">
            <option value="AND">AND</option>
            <option value="OR">OR</option>
            <option value="END">END</option>
        </select>`;

    if (data) {
        div.querySelector(".not-select").value = data.not;
        div.querySelector(".operand").value = data.operand;
        div.querySelector(".operator").value = data.operator;
    }
    
    container.appendChild(div);
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

// computeLogic関数内の判定部分を、XPにも対応させる
// computeLogic をこのように変更
function computeLogic(target) {
    const blocks = logicStore[target];
    if (!blocks || blocks.length === 0) return false;
    
    // --- 【追加】ここから：入力の合成ロジック ---
    // ロジックを計算する前に、各Xの状態を一時的に確定させる
    let currentX = new Array(16);
    for(let i=0; i<16; i++) {
        // トグル(チェックボックス)の状態 OR 押しボタンの状態
        currentX[i] = document.getElementById(`X${i+1}`).checked || xpStore[i];
    }
    // --- 【追加】ここまで ---

    let result = false; let isEnd = false;
    
    blocks.forEach((b, idx) => {
        if (isEnd) return;
        const opStr = b.operand; 
        const index = parseInt(opStr.substring(1)) - 1;
        let val = false;
        
        // 判定ロジック
        if (opStr.startsWith('X')) {
            // 合成済みの currentX を使う！
            val = currentX[index]; 
        }
        else if (opStr.startsWith('M')) val = mStore[index];
        else if (opStr.startsWith('Y')) val = document.getElementById(opStr).checked;
        else if (opStr.startsWith('T')) val = tStore[index].done;

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

function updateTimers(deltaTime) {
    for (let i = 0; i < 16; i++) {
        const timer = tStore[i];
        if (computeLogic(`T${i + 1}`)) {
            timer.elapsed += deltaTime;
            if (timer.elapsed >= timer.setPoint) { timer.elapsed = timer.setPoint; timer.done = true; }
        } else {
            timer.elapsed = 0; timer.done = false;
        }
    }
}

function simulationLoop(timestamp) {
    if (!isRunning) return;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    calculateAll();
    updateTimers(deltaTime);
    
    for (let i = 1; i <= 16; i++) {
        const bar = document.getElementById(`T${i}-bar`);
        const text = document.getElementById(`T${i}-text`);
        if (bar) bar.value = tStore[i-1].elapsed;
        if (text) text.textContent = Math.floor(tStore[i-1].elapsed) + "ms";
    }
    requestAnimationFrame(simulationLoop);
}

function startSimulation() {
    if (!isRunning) {
        isRunning = true;
        lastTime = performance.now();
        requestAnimationFrame(simulationLoop);
        
        // UI更新：ボタンとステータス表示
        const status = document.getElementById("run-status");
        status.textContent = "● 稼働中";
        status.style.color = "white";
        status.style.backgroundColor = "#4CAF50"; // 稼働中は緑の背景
        
        // 全体の背景を少しだけ青みのあるグレーにして「モード切替」感を出す
        document.body.style.backgroundColor = "#f0f4f8";
    }
}

function stopSimulation() {
    isRunning = false;
    
    // UI更新
    const status = document.getElementById("run-status");
    status.textContent = "● 停止中";
    status.style.color = "red";
    status.style.backgroundColor = "#eee"; // 停止中は元のグレーへ
    
    // 背景を白に戻す
    document.body.style.backgroundColor = "#ffffff";
}

function updateStatus() {
    const calcStats = (prefix, dataArray = null, isTimer = false) => {
        let bin = "", val = 0;
        for (let i = 16; i >= 1; i--) {
            let bit = 0;
            if (isTimer) {
                bit = tStore[i-1].done ? 1 : 0;
            } else if (prefix === "X") {
                // 【ここを修正】チェックボックス または 押しボタン のどちらかがONなら1
                bit = (document.getElementById(`X${i}`).checked || xpStore[i-1]) ? 1 : 0;
            } else {
                bit = dataArray ? (dataArray[i-1] ? 1 : 0) : (document.getElementById(prefix + i)?.checked ? 1 : 0);
            }
            bin += bit; val = (val << 1) | bit;
        }
        return `${prefix}: ${bin.match(/.{1,4}/g).join(" ")} (Hex: 0x${val.toString(16).toUpperCase().padStart(4, '0')} | Dec: ${val})`;
    };

    document.getElementById("status-x").textContent = calcStats("X");
    document.getElementById("status-m").textContent = calcStats("M", mStore);
    document.getElementById("status-t").textContent = calcStats("T", null, true); 
    document.getElementById("status-y").textContent = calcStats("Y");
}

function clearCurrentLogic() {
    if (!confirm(`${currentTarget} のロジックをすべて削除しますか？`)) return;
    logicStore[currentTarget] = [];
    document.getElementById("logic-container").innerHTML = "";
    document.getElementById(`formula-${currentTarget}`).textContent = "-";
}

function confirmClearAll() { if (confirm("全てリセットしますか？")) location.reload(); }
function exportLogicJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logicStore));
    const a = document.createElement('a'); a.href = dataStr; a.download = "io_simulator_data.json"; a.click();
}
function importLogicJSON(e) {
    const r = new FileReader();
    r.onload = (evt) => {
        const imported = JSON.parse(evt.target.result);
        const normalized = {};
        ['M','T','Y'].forEach(prefix => {
            for (let i = 1; i <= 16; i++) {
                normalized[`${prefix}${i}`] = imported[`${prefix}${i}`] || [];
            }
        });
        logicStore = normalized;
        loadLogic(currentTarget);
        alert("JSONインポート完了");
    };
    r.readAsText(e.target.files[0]);
}
function exportLogicCSV() {
    const lines = ['target,not,operand,operator'];
    Object.keys(logicStore).sort().forEach(target => {
        const blocks = logicStore[target] || [];
        blocks.forEach(block => {
            lines.push(`${target},${block.not || ''},${block.operand},${block.operator}`);
        });
    });
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
    const a = document.createElement('a'); a.href = dataStr; a.download = 'io_simulator_data.csv'; a.click();
}
function importLogicCSV(e) {
    const r = new FileReader();
    r.onload = (evt) => {
        const text = evt.target.result;
        const rows = text.trim().split(/\r?\n/).map(row => row.trim()).filter(row => row.length > 0);
        if (rows.length === 0) {
            alert('CSVが空です');
            return;
        }
        const header = rows[0].split(',').map(h => h.trim().toLowerCase());
        if (header.length < 4 || header[0] !== 'target' || header[1] !== 'not' || header[2] !== 'operand' || header[3] !== 'operator') {
            alert('CSVヘッダが不正です。target,not,operand,operator の形式で読み込んでください');
            return;
        }
        const normalized = {};
        ['M','T','Y'].forEach(prefix => {
            for (let i = 1; i <= 16; i++) {
                normalized[`${prefix}${i}`] = [];
            }
        });
        rows.slice(1).forEach(row => {
            const columns = row.split(',');
            if (columns.length < 4) return;
            const target = columns[0].trim();
            if (!target) return;
            normalized[target] = normalized[target] || [];
            normalized[target].push({
                not: columns[1].trim(),
                operand: columns[2].trim(),
                operator: columns[3].trim()
            });
        });
        logicStore = normalized;
        loadLogic(currentTarget);
        alert('CSVインポート完了');
    };
    r.readAsText(e.target.files[0]);
}
function resetInputs() {
    for (let i = 1; i <= 16; i++) {
        const xInput = document.getElementById(`X${i}`);
        if (xInput) xInput.checked = false;
        // PBボタンもリセット
        xpStore[i-1] = false;
        document.getElementById(`XP${i}`).style.backgroundColor = "";
        document.getElementById(`XP${i}`).style.color = "black";
    }
    updateStatus();
}
function masterReset() {
    stopSimulation(); // 停止
    resetInputs();    // 入力クリア
    
    // 1. 内部状態クリア (データ)
    mStore.fill(false);
    tStore.forEach(t => { t.elapsed = 0; t.done = false; });
    
    // 2. LEDの表示を強制OFF (ここが抜けていました)
    for (let i = 1; i <= 16; i++) {
        // MリレーのLEDを消灯
        document.getElementById(`M${i}-led`).className = "led-m";
        // 出力YのLEDを消灯
        document.getElementById(`Y${i}-led`).className = "led";
        // 出力YのチェックボックスをOFF
        document.getElementById(`Y${i}`).checked = false;
    }
    
    // 3. UI表示の更新
    updateStatus();
    for (let i = 1; i <= 16; i++) {
        const bar = document.getElementById(`T${i}-bar`);
        const text = document.getElementById(`T${i}-text`);
        if (bar) bar.value = 0;
        if (text) text.textContent = "0ms";
    }
}

function setXP(i, state) {
    xpStore[i-1] = state;
    const btn = document.getElementById(`XP${i}`);
    btn.style.backgroundColor = state ? "#4CAF50" : "";
    btn.style.color = state ? "white" : "black";
    
    // 【重要】状態が変わったことをステータスバーと論理演算に反映させる
    updateStatus(); 
    if (isRunning) calculateAll();
}


init();