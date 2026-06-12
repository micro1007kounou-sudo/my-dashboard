document.addEventListener('DOMContentLoaded', () => {
    // --- 単位換算の要素取得 ---
    const convertValue = document.getElementById('convert-value');
    const convertUnit = document.getElementById('convert-unit');
    
    const resG = document.getElementById('res-g');
    const resM = document.getElementById('res-m');
    const resK = document.getElementById('res-k');
    const resBase = document.getElementById('res-base');
    const resMm = document.getElementById('res-mm');
    const resU = document.getElementById('res-u');
    const resN = document.getElementById('res-n');

    // --- オームの法則の要素取得 ---
    const vInput = document.getElementById('voltage');
    const iInput = document.getElementById('current');
    const rInput = document.getElementById('resistance');
    const ohmResult = document.getElementById('ohm-result');

    // --- 合成抵抗の要素取得 ---
    const resistorGrid = document.getElementById('resistor-grid');
    const resistorResult = document.getElementById('resistor-result');

    // ボタン各種
    const btnOhm = document.getElementById('btn-ohm');
    const btnSeries = document.getElementById('btn-series');
    const btnParallel = document.getElementById('btn-parallel');
    const btnAddResistor = document.getElementById('btn-add-resistor');
    const btnRemoveResistor = document.getElementById('btn-remove-resistor');

    // 抵抗の初期個数と最大値
    let resistorCount = 0;
    const MAX_RESISTORS = 10;

    // 初期状態で抵抗枠を2つ作成
    createResistorInput();
    createResistorInput();

    // --- イベントリスナー登録 ---
    convertValue.addEventListener('input', updateConversion);
    convertUnit.addEventListener('change', updateConversion);
    btnOhm.addEventListener('click', calculateOhm);
    btnSeries.addEventListener('click', calculateSeries);
    btnParallel.addEventListener('click', calculateParallel);
    btnAddResistor.addEventListener('click', () => createResistorInput());
    btnRemoveResistor.addEventListener('click', removeResistorInput);

    // --- 単位換算のロジック ---
    function updateConversion() {
        const val = parseFloat(convertValue.value);
        
        if (isNaN(val)) {
            const targets = [resG, resM, resK, resBase, resMm, resU, resN];
            targets.forEach(el => el.innerText = '0');
            return;
        }

        const currentExponent = parseInt(convertUnit.value);
        const baseValue = val * Math.pow(10, currentExponent);

        resG.innerText = formatExponentResult(baseValue / Math.pow(10, 9));
        resM.innerText = formatExponentResult(baseValue / Math.pow(10, 6));
        resK.innerText = formatExponentResult(baseValue / Math.pow(10, 3));
        resBase.innerText = formatExponentResult(baseValue);
        resMm.innerText = formatExponentResult(baseValue / Math.pow(10, -3));
        resU.innerText = formatExponentResult(baseValue / Math.pow(10, -6));
        resN.innerText = formatExponentResult(baseValue / Math.pow(10, -9));
    }

    function formatExponentResult(num) {
        if (num === 0) return '0';
        const fixedNum = parseFloat(num.toPrecision(12));
        return fixedNum.toString();
    }

    // --- 抵抗入力欄の動的生成関数 ---
    function createResistorInput() {
        if (resistorCount >= MAX_RESISTORS) {
            alert(`抵抗は最大 ${MAX_RESISTORS} 個までです。`);
            return;
        }
        resistorCount++;

        const group = document.createElement('div');
        group.className = 'input-group';
        group.id = `r-group-${resistorCount}`;

        const label = document.createElement('label');
        label.innerText = `R${resistorCount} (Ω)`;
        label.setAttribute('for', `r-${resistorCount}`);

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `r-${resistorCount}`;
        input.step = 'any';
        input.placeholder = `R${resistorCount}`;

        group.appendChild(label);
        group.appendChild(input);
        resistorGrid.appendChild(group);
    }

    function removeResistorInput() {
        if (resistorCount <= 1) {
            alert("これ以上削除できません。");
            return;
        }
        const lastGroup = document.getElementById(`r-group-${resistorCount}`);
        if (lastGroup) {
            resistorGrid.removeChild(lastGroup);
            resistorCount--;
        }
    }

    function getValidResistors() {
        const values = [];
        for (let i = 1; i <= resistorCount; i++) {
            const input = document.getElementById(`r-${i}`);
            if (input && input.value !== "") {
                const val = parseFloat(input.value);
                if (!isNaN(val)) {
                    values.push(val);
                }
            }
        }
        return values;
    }

    // --- オームの法則の計算ロジック ---
    function calculateOhm() {
        let v = vInput.value ? parseFloat(vInput.value) : null;
        let i = iInput.value ? parseFloat(iInput.value) : null;
        let r = rInput.value ? parseFloat(rInput.value) : null;

        ohmResult.style.display = 'block';
        ohmResult.classList.remove('error');

        if (v === null && i !== null && r !== null) {
            let resV = i * r;
            ohmResult.innerHTML = `電圧 V = ${resV.toFixed(2)} V`;
            vInput.value = resV.toFixed(2);
        } else if (i === null && v !== null && r !== null) {
            if (r === 0) {
                showOhmError("抵抗に0は入力できません（ゼロ除算）");
                return;
            }
            let resI = v / r;
            ohmResult.innerHTML = `電流 I = ${resI.toFixed(3)} A`;
            iInput.value = resI.toFixed(3);
        } else if (r === null && v !== null && i !== null) {
            if (i === 0) {
                showOhmError("電流に0は入力できません（ゼロ除算）");
                return;
            }
            let resR = v / i;
            ohmResult.innerHTML = `抵抗 R = ${resR.toFixed(2)} Ω`;
            rInput.value = resR.toFixed(2);
        } else {
            showOhmError("3つのうち「2つだけ」を入力してください。");
        }
    }

    function showOhmError(msg) {
        ohmResult.innerHTML = msg;
        ohmResult.classList.add('error');
    }

    // --- 合成抵抗の計算ロジック ---
    function showResistorResult(msg, isError = false) {
        resistorResult.style.display = 'block';
        resistorResult.innerHTML = msg;
        if (isError) {
            resistorResult.classList.add('error');
        } else {
            resistorResult.classList.remove('error');
        }
    }

    function calculateSeries() {
        const resistors = getValidResistors();
        if (resistors.length < 2) {
            showResistorResult("数値を2つ以上入力してください。", true);
            return;
        }
        const total = resistors.reduce((sum, val) => sum + val, 0);
        showResistorResult(`直列合成抵抗 R = ${total.toFixed(2)} Ω`);
    }

    function calculateParallel() {
        const resistors = getValidResistors();
        if (resistors.length < 2) {
            showResistorResult("数値を2つ以上入力してください。", true);
            return;
        }
        if (resistors.includes(0)) {
            showResistorResult("並列接続の計算で抵抗値に0を含めることはできません。", true);
            return;
        }

        try {
            const reciprocalSum = resistors.reduce((sum, val) => sum + (1 / val), 0);
            if (reciprocalSum === 0) {
                showResistorResult("計算エラーが発生しました。", true);
                return;
            }
            const total = 1 / reciprocalSum;
            showResistorResult(`並列合成抵抗 R = ${total.toFixed(2)} Ω`);
        } catch (e) {
            showResistorResult("計算中にエラーが発生しました。", true);
        }
    }
});