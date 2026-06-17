let currentTarget = "Y1";
let logicStore = {};
let xpStore = new Array(16).fill(false);
let isRunning = false;

function init() {
    const inputs = document.getElementById("inputs-x");
    for (let i = 1; i <= 16; i++) {
        inputs.innerHTML += `
            <div style="text-align:center; display:inline-block; margin:5px; border:1px solid #eee; padding:4px;">
                <div style="font-weight:bold;">X${i}</div>
                <input type="checkbox" id="X${i}" onchange="updateStatus()"><br>
                <button id="XP${i}"
                    onmousedown="setXP(${i}, true)"
                    onmouseup="setXP(${i}, false)"
                    onmouseleave="setXP(${i}, false)"
                    style="width:30px; height:24px; font-size:10px; cursor:pointer;">PB</button>
            </div>`;
    }
    
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
function getInputValue(operand) {
    if (!operand.startsWith("X")) return false;
    const index = parseInt(operand.substring(1), 10) - 1;
    return document.getElementById(`X${index+1}`).checked || xpStore[index];
}

function calculateAll() {
    for (let i = 1; i <= 16; i++) {
        const blocks = logicStore[`Y${i}`];
        if (blocks.length === 0) continue;
        let result = false; let isEnd = false;
        blocks.forEach((b, idx) => {
            if (isEnd) return;
            const val = getInputValue(b.operand) ^ (b.not === "NOT");
            if (idx === 0) result = !!val;
            else result = (blocks[idx-1].operator === "AND") ? (result && !!val) : (result || !!val);
            if (b.operator === "END") isEnd = true;
        });
        document.getElementById(`Y${i}-led`).className = "led " + (result ? "on" : "");
        document.getElementById(`Y${i}`).checked = result;
    }
    updateStatus();
}

function setXP(index, pressed) {
    xpStore[index - 1] = pressed;
    updateStatus();
}

function startSimulation() {
    if (!isRunning) {
        isRunning = true;
        document.getElementById("run-status").textContent = "● 稼働中";
        document.getElementById("run-status").style.color = "white";
        document.getElementById("run-status").style.backgroundColor = "#4CAF50";
        calculateAll();
    }
}

function stopSimulation() {
    if (isRunning) {
        isRunning = false;
        document.getElementById("run-status").textContent = "● 停止中";
        document.getElementById("run-status").style.color = "red";
        document.getElementById("run-status").style.backgroundColor = "#eee";
    }
}

function resetContacts() {
    for (let i = 1; i <= 16; i++) {
        document.getElementById(`X${i}`).checked = false;
        document.getElementById(`Y${i}`).checked = false;
        document.getElementById(`Y${i}-led`).className = "led";
        xpStore[i - 1] = false;
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

// 現在の編集対象（Y1等）のロジックをクリアする
function clearCurrentLogic() {
    if (!confirm(`${currentTarget} のロジックをすべて削除しますか？`)) return;

    // logicStoreのデータを空にする
    logicStore[currentTarget] = [];
    
    // コンテナをクリア
    document.getElementById("logic-container").innerHTML = "";
    
    // リストの表示をクリア
    document.getElementById(`formula-${currentTarget}`).textContent = "-";
    
    // LEDもOFFにする
    document.getElementById(`${currentTarget}-led`).className = "led";
    document.getElementById(currentTarget).checked = false;
    
    updateStatus();
}

// --- データ管理機能 (JSON) ---

// 全リセット（確認付き）
function confirmClearAll() {
    if (confirm("全てのロジックと入力をリセットしますか？\n保存していないデータは失われます。")) {
        location.reload();
    }
}

// ロジックをエクスポート
function exportLogic() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logicStore));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "io_simulator_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// ロジックをインポート
function importLogic(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            logicStore = JSON.parse(e.target.result);
            // 読み込んだらY1の画面を初期表示し、式も再描画する
            loadLogic("Y1");
            // 全ての式の表示を更新するために再描画
            Object.keys(logicStore).forEach(target => {
                const blocks = logicStore[target];
                let formula = blocks.map(b => {
                    const not = b.not.toLowerCase();
                    const op = b.operand;
                    const logic = b.operator.toLowerCase();
                    return (logic === "end") ? (not ? not + " " : "") + op : (not ? not + " " : "") + op + " " + logic;
                }).join(" ");
                document.getElementById(`formula-${target}`).textContent = formula || "-";
            });
            alert("ロジックをインポートしました。");
        } catch (err) {
            alert("ファイルの読み込みに失敗しました。正しいJSON形式か確認してください。");
        }
    };
    reader.readAsText(file);
}