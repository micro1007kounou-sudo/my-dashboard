let currentTarget = "M1";
let logicStore = {};
let mStore = new Array(16).fill(false);
let tStore = Array.from({length: 16}, (_, i) => ({
    id: i + 1, elapsed: 0, setPoint: 1000, done: false
}));

let isRunning = false;
let lastTime = performance.now();

function init() {
    const selector = document.getElementById("target-selector");
    selector.innerHTML = 
        '<optgroup label="M リレー">' + Array.from({length:16}, (_,i)=>`<option value="M${i+1}">M${i+1}</option>`).join('') + '</optgroup>' +
        '<optgroup label="T タイマー">' + Array.from({length:16}, (_,i)=>`<option value="T${i+1}">T${i+1}</option>`).join('') + '</optgroup>' +
        '<optgroup label="Y 出力">' + Array.from({length:16}, (_,i)=>`<option value="Y${i+1}">Y${i+1}</option>`).join('') + '</optgroup>';

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

    const list = document.getElementById("logic-list");
    for (let i = 1; i <= 16; i++) list.innerHTML += `<div style="padding:2px; font-size:0.9em;">M${i} = <span id="formula-M${i}">-</span></div>`;
    for (let i = 1; i <= 16; i++) list.innerHTML += `<div style="padding:2px; font-size:0.9em;">Y${i} = <span id="formula-Y${i}">-</span></div>`;
    for (let i = 1; i <= 16; i++) list.innerHTML += `<div style="padding:2px; font-size:0.9em;">T${i} = <span id="formula-T${i}">-</span></div>`;
    
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
    const div = document.createElement("div");
    div.className = "block";
    const options = Array.from({length:16}, (_,i)=>`<option>X${i+1}</option>`).join('') +
                    Array.from({length:16}, (_,i)=>`<option>M${i+1}</option>`).join('') +
                    Array.from({length:16}, (_,i)=>`<option>T${i+1}</option>`).join('') +
                    Array.from({length:16}, (_,i)=>`<option>Y${i+1}</option>`).join('');
    
    div.innerHTML = `<select class="not-select"><option value="">-</option><option value="NOT">NOT</option></select>
                     <select class="operand">${options}</select>
                     <select class="operator"><option value="AND">AND</option><option value="OR">OR</option><option value="END">END</option></select>`;
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
        if (prefix === 'T') val = tStore[index].done;

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
        
        // UI更新
        document.getElementById("run-status").textContent = "● 稼働中";
        document.getElementById("run-status").style.color = "#4CAF50";
    }
}
// 追加：停止関数
function stopSimulation() {
    isRunning = false;
    
    // UI更新
    document.getElementById("run-status").textContent = "● 停止中";
    document.getElementById("run-status").style.color = "red";
}

function updateStatus() {
    // 既存の calcStats はそのままにして、中身だけ強化します
    const calcStats = (prefix, dataArray = null, isTimer = false) => {
        let bin = "", val = 0;
        for (let i = 16; i >= 1; i--) {
            // タイマーの場合は tStore[i-1].done を参照、それ以外はチェックボックスまたは配列
            let bit = 0;
            if (isTimer) {
                bit = tStore[i-1].done ? 1 : 0;
            } else {
                bit = dataArray ? (dataArray[i-1] ? 1 : 0) : (document.getElementById(prefix + i)?.checked ? 1 : 0);
            }
            bin += bit; val = (val << 1) | bit;
        }
        return `${prefix}: ${bin.match(/.{1,4}/g).join(" ")} (Hex: 0x${val.toString(16).toUpperCase().padStart(4, '0')} | Dec: ${val})`;
    };

    document.getElementById("status-x").textContent = calcStats("X");
    document.getElementById("status-m").textContent = calcStats("M", mStore);
    // 【追加】タイマー用ステータス（T1-T16の完了フラグを表示）
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
function exportLogic() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logicStore));
    const a = document.createElement('a'); a.href = dataStr; a.download = "io_simulator_data.json"; a.click();
}
function importLogic(e) {
    const r = new FileReader();
    r.onload = (e) => {
        logicStore = JSON.parse(e.target.result);
        loadLogic("M1");
        alert("インポート完了");
    };
    r.readAsText(e.target.files[0]);
}
function resetInputs() {
    for (let i = 1; i <= 16; i++) {
        const xInput = document.getElementById(`X${i}`);
        if (xInput) xInput.checked = false;
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

init();