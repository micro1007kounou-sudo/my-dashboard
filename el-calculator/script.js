document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    const vInput = document.getElementById('voltage');
    const iInput = document.getElementById('current');
    const rInput = document.getElementById('resistance');
    const ohmResult = document.getElementById('ohm-result');
    const resistorGrid = document.getElementById('resistor-grid');
    const resistorResult = document.getElementById('resistor-result');

    // ボタン
    const btnOhm = document.getElementById('btn-ohm');
    const btnSeries = document.getElementById('btn-series');
    const btnParallel = document.getElementById('btn-parallel');
    const btnAddResistor = document.getElementById('btn-add-resistor');
    const btnRemoveResistor = document.getElementById('btn-remove-resistor');

    // 抵抗の初期個数と最大値
    let resistorCount = 0;
    const MAX_RESISTORS = 10;

    // 初期状態で2つの入力欄を作成
    createResistorInput();
    createResistorInput();

    // --- イベントリスナー ---
    btnOhm.addEventListener('click', calculateOhm);
    btnSeries.addEventListener('click', calculateSeries);
    btnParallel.addEventListener('click', calculateParallel);
    btnAddResistor.addEventListener('click', () => createResistorInput());
    btnRemoveResistor.addEventListener('click', removeResistorInput);

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

    // 抵抗入力欄の削除
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

    // 有効な抵抗値（数値が入っているもの）を配列で取得する共通関数
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
        // 直列: 単純加算
        const total = resistors.reduce((sum, val) => sum + val, 0);
        showResistorResult(`直列合成抵抗 R = ${total.toFixed(2)} Ω`);
    }

    function calculateParallel() {
        const resistors = getValidResistors();
        if (resistors.length < 2) {
            showResistorResult("数値を2つ以上入力してください。", true);
            return;
        }
        
        // 0のチェック
        if (resistors.includes(0)) {
            showResistorResult("並列接続の計算で抵抗値に0を含めることはできません。", true);
            return;
        }

        // 並列: 逆数の和の逆数 (1 / (1/R1 + 1/R2 + ...))
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

// --- 単位換算の要素取得 ---
    const convertValue = document.getElementById('convert-value');
    const convertUnit = document.getElementById('convert-unit');
    
    const resT = document.getElementById('res-t');
    const resG = document.getElementById('res-g');
    const resM = document.getElementById('res-m');
    const resK = document.getElementById('res-k');
    const resBase = document.getElementById('res-base');
    const resMm = document.getElementById('res-mm');
    const resU = document.getElementById('res-u');
    const resN = document.getElementById('res-n');

    // リアルタイム換算のためのイベントリスナー
    convertValue.addEventListener('input', updateConversion);
    convertUnit.addEventListener('change', updateConversion);

    function updateConversion() {
        const val = parseFloat(convertValue.value);
        
        // 入力が空、または数値じゃない場合は表示をリセット
        if (isNaN(val)) {
            const targets = [resT, resG, resM, resK, resBase, resMm, resU, resN];
            targets.forEach(el => el.innerText = '0');
            return;
        }

        // 現在選択されている単位の乗数（例: kなら3, mなら-3）
        const currentExponent = parseInt(convertUnit.value);

        // 一旦、基本単位（10^0）の数値に変換する
        // 例: 5k(3) なら 5 * 10^3 = 5000
        const baseValue = val * Math.pow(10, currentExponent);

        // 各単位に換算してテキストを更新
        resT.innerText = formatExponentResult(baseValue / Math.pow(10, 12));
        resG.innerText = formatExponentResult(baseValue / Math.pow(10, 9));
        resM.innerText = formatExponentResult(baseValue / Math.pow(10, 6));
        resK.innerText = formatExponentResult(baseValue / Math.pow(10, 3));
        resBase.innerText = formatExponentResult(baseValue);
        resMm.innerText = formatExponentResult(baseValue / Math.pow(10, -3));
        resU.innerText = formatExponentResult(baseValue / Math.pow(10, -6));
        resN.innerText = formatExponentResult(baseValue / Math.pow(10, -9));
    }

    // 小数点以下が長くなりすぎたり、浮動小数点数の誤差が出るのを防ぐフォーマット関数
    function formatExponentResult(num) {
        // 非常に小さい、または大きい数値の誤差を丸める処理（有効桁数10桁程度）
        if (num === 0) return '0';
        
        // 桁数が多すぎる場合の調整（JavaScriptの浮動小数点数対策）
        const fixedNum = parseFloat(num.toPrecision(12));
        
        // 文字列にして、不要な末尾の0を消す
        return fixedNum.toString();
    }