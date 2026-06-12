document.addEventListener('DOMContentLoaded', () => {
    // --- 単位換算の要素取得 ---
    const unitTypeSelect = document.getElementById('unit-type');
    const convertValueInput = document.getElementById('convert-value');
    const convertUnitSelect = document.getElementById('convert-unit');
    const convertResultGrid = document.getElementById('convert-result-grid');

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

    // --- 単位換算用のマスターデータ定義 ---
    const unitData = {
        si: {
            baseStep: 1000,
            prefixes: [
                { name: 'G', power: 3 },
                { name: 'M', power: 2 },
                { name: 'k', power: 1 },
                { name: '',  power: 0 }, // 基本単位
                { name: 'm', power: -1 },
                { name: 'μ', power: -2 },
                { name: 'n', power: -3 }
            ]
        },
        it: {
            baseStep: 1024,
            prefixes: [
                { name: 'TB', power: 4 },
                { name: 'GB', power: 3 },
                { name: 'MB', power: 2 },
                { name: 'KB', power: 1 },
                { name: 'B',  power: 0 }
            ]
        }
    };

    // 初期化実行
    updateUnitSelectOptions(); 
    createResistorInput();
    createResistorInput();

    // --- イベントリスナー登録 ---
    unitTypeSelect.addEventListener('change', () => {
        updateUnitSelectOptions();
        updateConversion();
    });
    convertValueInput.addEventListener('input', updateConversion);
    convertUnitSelect.addEventListener('change', updateConversion);

    btnOhm.addEventListener('click', calculateOhm);
    btnSeries.addEventListener('click', calculateSeries);
    btnParallel.addEventListener('click', calculateParallel);
    btnAddResistor.addEventListener('click', () => createResistorInput());
    btnRemoveResistor.addEventListener('click', removeResistorInput);


    // --- 単位換算のロジック ---
    
    // 選択された種類(VやBなど)に応じて、「元の単位」ドロップダウンを再構築する
    function updateUnitSelectOptions() {
        const selectedType = unitTypeSelect.value; // V, A, W, Ω, B
        const selectedOption = unitTypeSelect.options[unitTypeSelect.selectedIndex];
        const mode = selectedOption.getAttribute('data-mode'); // si または it
        
        convertUnitSelect.innerHTML = ''; // 一旦クリア

        const data = unitData[mode];
        data.prefixes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.power;
            
            if (mode === 'si') {
                // 電気系: 例「k (kV)」
                const labelName = p.name ? `${p.name} (${p.name}${selectedType})` : `なし (${selectedType})`;
                opt.innerText = labelName;
                if(p.power === 0) opt.selected = true; // 基本単位をデフォルトに
            } else {
                // IT系: 例「MB」
                opt.innerText = p.name;
                if(p.power === 0) opt.selected = true; // Bをデフォルトに
            }
            convertUnitSelect.appendChild(opt);
        });
    }

    function updateConversion() {
        const val = parseFloat(convertValueInput.value);
        const selectedType = unitTypeSelect.value;
        const selectedOption = unitTypeSelect.options[unitTypeSelect.selectedIndex];
        const mode = selectedOption.getAttribute('data-mode');
        const currentPower = parseInt(convertUnitSelect.value);

        // 入力が無ければ結果表示をクリア
        if (isNaN(val)) {
            convertResultGrid.innerHTML = '<div style="color:#64748b; grid-column: 1/-1; text-align:center;">数値を入力してください</div>';
            return;
        }

        const data = unitData[mode];
        const step = data.baseStep;

        // 一旦すべての基準となる「基本値(power=0、つまりVやA、Bそのもの)」を計算する
        // 例: 1.5 kV = 1.5 * (1000^1) = 1500 V
        const baseValue = val * Math.pow(step, currentPower);

        convertResultGrid.innerHTML = ''; // グリッド内をクリアして再構築

        // 各単位の枠をループして結果を生成
        data.prefixes.forEach(p => {
            // 基本値から各単位へ換算
            // 例: 1500 V から M(power=2) へ換算 -> 1500 / (1000^2) = 0.0015 MV
            const convertedVal = baseValue / Math.pow(step, p.power);
            const formattedVal = formatExponentResult(convertedVal);

            // 単位記号の組み立て (電気系なら kV、IT系ならそのまま MB)
            const unitSymbol = mode === 'si' ? `${p.name}${selectedType}` : p.name;

            // 元々の入力単位と同じならハイライト用のクラスを付与
            const isHighlight = p.power === currentPower;
            const boxClass = isHighlight ? 'result-box-highlight' : 'result-box';

            const resultBox = document.createElement('div');
            resultBox.className = boxClass;
            resultBox.innerHTML = `<strong>${unitSymbol}:</strong><span>${formattedVal}</span>`;
            
            convertResultGrid.appendChild(resultBox);
        });
    }

    function formatExponentResult(num) {
        if (num === 0) return '0';
        // 浮動小数点誤差を丸める（有効桁数12桁）
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