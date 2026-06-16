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

    // --- カラーコードの要素取得 ---
    const ccBandCount = document.getElementById('cc-band-count');
    const ccBand1 = document.getElementById('cc-band1');
    const ccBand2 = document.getElementById('cc-band2');
    const ccBand3 = document.getElementById('cc-band3');
    const ccMultiplier = document.getElementById('cc-multiplier');
    const ccTolerance = document.getElementById('cc-tolerance');

    const vBand1 = document.getElementById('visual-band1');
    const vBand2 = document.getElementById('visual-band2');
    const vBand3 = document.getElementById('visual-band3');
    const vBand4 = document.getElementById('visual-band4');
    const vBand5 = document.getElementById('visual-band5');
    const ccResult = document.getElementById('cc-result');

    const groupBand3 = document.getElementById('group-band3');
    const labelBand3 = document.getElementById('label-band3');

    // ボタン各種
    const btnOhm = document.getElementById('btn-ohm');
    const btnSeries = document.getElementById('btn-series');
    const btnParallel = document.getElementById('btn-parallel');
    const btnAddResistor = document.getElementById('btn-add-resistor');
    const btnRemoveResistor = document.getElementById('btn-remove-resistor');

    let resistorCount = 0;
    const MAX_RESISTORS = 10;

    const prefixes = [
        { name: 'M', display: 'M (メガ)', power: 2 },
        { name: 'k', display: 'k (キロ)', power: 1 },
        { name: '',  display: 'なし (基本)', power: 0 },
        { name: 'm', display: 'm (ミリ)', power: -1 },
        { name: 'μ', display: 'μ (マイクロ)', power: -2 }
    ];
    const BASE_STEP = 1000;

    // --- カラーコードマスタデータ定義 ---
    const colorMaster = {
        digits: [
            { name: '黒 (0)', value: 0, color: '#000000', textLight: true },
            { name: '茶 (1)', value: 1, color: '#9c4d1d', textLight: true },
            { name: '赤 (2)', value: 2, color: '#ef4444', textLight: true },
            { name: '橙 (3)', value: 3, color: '#f97316', textLight: true },
            { name: '黄 (4)', value: 4, color: '#eab308', textLight: false },
            { name: '緑 (5)', value: 5, color: '#22c55e', textLight: true },
            { name: '青 (6)', value: 6, color: '#3b82f6', textLight: true },
            { name: '紫 (7)', value: 7, color: '#a855f7', textLight: true },
            { name: '灰 (8)', value: 8, color: '#64748b', textLight: true },
            { name: '白 (9)', value: 9, color: '#ffffff', textLight: false }
        ],
        multipliers: [
            { name: '黒 (×1)', value: 1, color: '#000000', textLight: true },
            { name: '茶 (×10)', value: 10, color: '#9c4d1d', textLight: true },
            { name: '赤 (×100)', value: 100, color: '#ef4444', textLight: true },
            { name: '橙 (×1k)', value: 1000, color: '#f97316', textLight: true },
            { name: '黄 (×10k)', value: 10000, color: '#eab308', textLight: false },
            { name: '緑 (×100k)', value: 100000, color: '#22c55e', textLight: true },
            { name: '青 (×1M)', value: 1000000, color: '#3b82f6', textLight: true },
            { name: '金 (×0.1)', value: 0.1, color: '#d97706', textLight: true },
            { name: '銀 (×0.01)', value: 0.01, color: '#cbd5e1', textLight: false }
        ],
        tolerances: [
            { name: '茶 (±1%)', value: '±1%', color: '#9c4d1d', textLight: true },
            { name: '赤 (±2%)', value: '±2%', color: '#ef4444', textLight: true },
            { name: '金 (±5%)', value: '±5%', color: '#d97706', textLight: true },
            { name: '銀 (±10%)', value: '±10%', color: '#cbd5e1', textLight: false },
            { name: '無 (±20%)', value: '±20%', color: 'transparent', textLight: false }
        ]
    };

    // 初期化実行
    initUnitSelectOptions(); 
    initColorCodeOptions();
    createResistorInput();
    createResistorInput();
    createResistorInput();
    createResistorInput();
    createResistorInput();
    updateColorCodeUI(); // カラーコード初期計算

    // --- イベントリスナー登録 ---
    unitTypeSelect.addEventListener('change', updateConversion);
    convertValueInput.addEventListener('input', updateConversion);
    convertUnitSelect.addEventListener('change', updateConversion);

    btnOhm.addEventListener('click', calculateOhm);
    btnSeries.addEventListener('click', calculateSeries);
    btnParallel.addEventListener('click', calculateParallel);
    btnAddResistor.addEventListener('click', () => createResistorInput());
    btnRemoveResistor.addEventListener('click', removeResistorInput);

    // カラーコード用イベント
    ccBandCount.addEventListener('change', updateColorCodeUI);
    ccBand1.addEventListener('change', updateColorCodeCalculation);
    ccBand2.addEventListener('change', updateColorCodeCalculation);
    ccBand3.addEventListener('change', updateColorCodeCalculation);
    ccMultiplier.addEventListener('change', updateColorCodeCalculation);
    ccTolerance.addEventListener('change', updateColorCodeCalculation);


    // --- 単位換算のロジック ---
    function initUnitSelectOptions() {
        convertUnitSelect.innerHTML = '';
        prefixes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.power;
            opt.innerText = p.display;
            if(p.power === 0) opt.selected = true;
            convertUnitSelect.appendChild(opt);
        });
    }

    function updateConversion() {
        const val = parseFloat(convertValueInput.value);
        const selectedType = unitTypeSelect.value;
        const currentPower = parseInt(convertUnitSelect.value);

        if (isNaN(val)) {
            convertResultGrid.innerHTML = '<div style="color:#64748b; grid-column: 1/-1; text-align:center;">数値を入力してください</div>';
            return;
        }

        const baseValue = val * Math.pow(BASE_STEP, currentPower);
        convertResultGrid.innerHTML = '';

        prefixes.forEach(p => {
            const convertedVal = baseValue / Math.pow(BASE_STEP, p.power);
            const formattedVal = formatExponentResult(convertedVal);

            let unitSymbol = p.name + selectedType;
            if (unitSymbol === "") unitSymbol = "基本";

            const isHighlight = p.power === currentPower;
            const boxClass = isHighlight ? 'result-box-highlight' : 'result-box';

            const resultBox = document.createElement('div');
            resultBox.className = boxClass;
            resultBox.innerHTML = `<strong>${formattedVal}</strong> ${unitSymbol}`;
            convertResultGrid.appendChild(resultBox);
        });
    }

    function formatExponentResult(num) {
        if (num === 0) return '0';
        const fixedNum = parseFloat(num.toPrecision(14));
        return fixedNum.toString();
    }


    // --- カラーコード計算のロジック ---
    function initColorCodeOptions() {
        populateSelect(ccBand1, colorMaster.digits, 1); // 初期値: 茶(1)
        populateSelect(ccBand2, colorMaster.digits, 0); // 初期値: 黒(0)
        populateSelect(ccBand3, colorMaster.digits, 0); // 初期値: 黒(0)
        populateSelect(ccMultiplier, colorMaster.multipliers, 2); // 初期値: 赤(x100)
        populateSelect(ccTolerance, colorMaster.tolerances, 2); // 初期値: 金(±5%)
    }

    function populateSelect(selectEl, dataArray, defaultIndex) {
        selectEl.innerHTML = '';
        dataArray.forEach((item, idx) => {
            const opt = document.createElement('option');
            opt.value = item.value;
            opt.innerText = item.name;
            opt.style.backgroundColor = item.color;
            opt.style.color = item.textLight ? '#fff' : '#000';
            if (idx === defaultIndex) opt.selected = true;
            selectEl.appendChild(opt);
        });
    }

    function updateColorCodeUI() {
        const is5Band = ccBandCount.value === "5";
        
        if (is5Band) {
            groupBand3.style.display = 'block';
            labelBand3.innerText = "第3バンド";
            vBand3.style.opacity = "1";
            // 5本目のグリッド幅を最適化
            document.querySelector('.cc-select-grid').style.gridTemplateColumns = 'repeat(5, 1fr)';
        } else {
            groupBand3.style.display = 'none';
            vBand3.style.opacity = "0"; // 4本帯のときは真ん中の帯を消す
            document.querySelector('.cc-select-grid').style.gridTemplateColumns = 'repeat(4, 1fr)';
        }
        updateColorCodeCalculation();
    }

    function updateColorCodeCalculation() {
        const is5Band = ccBandCount.value === "5";
        
        const b1Idx = ccBand1.selectedIndex;
        const b2Idx = ccBand2.selectedIndex;
        const b3Idx = ccBand3.selectedIndex;
        const mIdx = ccMultiplier.selectedIndex;
        const tIdx = ccTolerance.selectedIndex;

        const b1 = colorMaster.digits[b1Idx];
        const b2 = colorMaster.digits[b2Idx];
        const b3 = colorMaster.digits[b3Idx];
        const multiplier = colorMaster.multipliers[mIdx];
        const tolerance = colorMaster.tolerances[tIdx];

        // イラストの帯の色を更新
        vBand1.style.backgroundColor = b1.color;
        vBand2.style.backgroundColor = b2.color;
        
        if (is5Band) {
            vBand3.style.backgroundColor = b3.color;
            vBand4.style.backgroundColor = multiplier.color;
            vBand5.style.backgroundColor = tolerance.color;
        } else {
            vBand4.style.backgroundColor = multiplier.color;
            vBand5.style.backgroundColor = tolerance.color;
        }

        // 抵抗値の計算
        let baseNum = 0;
        if (is5Band) {
            baseNum = (b1.value * 100) + (b2.value * 10) + b3.value;
        } else {
            baseNum = (b1.value * 10) + b2.value;
        }
        
        const finalOmega = baseNum * multiplier.value;

        // 単位の自動変換表記 (M, k, Ω)
        let displayStr = "";
        if (finalOmega >= 1000000) {
            displayStr = formatExponentResult(finalOmega / 1000000) + " M";
        } else if (finalOmega >= 1000) {
            displayStr = formatExponentResult(finalOmega / 1000) + " k";
        } else {
            displayStr = formatExponentResult(finalOmega);
        }

        ccResult.innerHTML = `計算結果: <strong>${displayStr} Ω</strong> (許容差: ${tolerance.value})`;
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
            let formattedV = formatExponentResult(resV);
            ohmResult.innerHTML = `電圧 V = ${formattedV} V`;
            vInput.value = formattedV;
        } else if (i === null && v !== null && r !== null) {
            if (r === 0) {
                showOhmError("抵抗に0は入力できません（ゼロ除算）");
                return;
            }
            let resI = v / r;
            let formattedI = formatExponentResult(resI);
            ohmResult.innerHTML = `電流 I = ${formattedI} A`;
            iInput.value = formattedI;
        } else if (r === null && v !== null && i !== null) {
            if (i === 0) {
                showOhmError("電流に0は入力できません（ゼロ除算）");
                return;
            }
            let resR = v / i;
            let formattedR = formatExponentResult(resR);
            ohmResult.innerHTML = `抵抗 R = ${formattedR} Ω`;
            rInput.value = formattedR;
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
        let formattedTotal = formatExponentResult(total);
        showResistorResult(`直列合成抵抗 R = ${formattedTotal} Ω`);
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
            let formattedTotal = formatExponentResult(total);
            showResistorResult(`並列合成抵抗 R = ${formattedTotal} Ω`);
        } catch (e) {
            showResistorResult("計算中にエラーが発生しました。", true);
        }
    }
});