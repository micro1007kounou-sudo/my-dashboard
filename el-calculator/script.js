document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    const vInput = document.getElementById('voltage');
    const iInput = document.getElementById('current');
    const rInput = document.getElementById('resistance');
    const ohmResult = document.getElementById('ohm-result');

    const r1Input = document.getElementById('r1');
    const r2Input = document.getElementById('r2');
    const resistorResult = document.getElementById('resistor-result');

    // ボタンの取得
    const btnOhm = document.getElementById('btn-ohm');
    const btnSeries = document.getElementById('btn-series');
    const btnParallel = document.getElementById('btn-parallel');

    // --- イベントリスナーの登録 ---
    btnOhm.addEventListener('click', calculateOhm);
    btnSeries.addEventListener('click', calculateSeries);
    btnParallel.addEventListener('click', calculateParallel);

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
        const r1 = parseFloat(r1Input.value);
        const r2 = parseFloat(r2Input.value);

        if (isNaN(r1) || isNaN(r2)) {
            showResistorResult("R1とR2の両方に数値を入力してください。", true);
            return;
        }
        const total = r1 + r2;
        showResistorResult(`直列合成抵抗 R = ${total.toFixed(2)} Ω`);
    }

    function calculateParallel() {
        const r1 = parseFloat(r1Input.value);
        const r2 = parseFloat(r2Input.value);

        if (isNaN(r1) || isNaN(r2)) {
            showResistorResult("R1とR2の両方に数値を入力してください。", true);
            return;
        }
        if (r1 + r2 === 0) {
            showResistorResult("抵抗値の合計が0になるため計算できません。", true);
            return;
        }
        const total = (r1 * r2) / (r1 + r2);
        showResistorResult(`並列合成抵抗 R = ${total.toFixed(2)} Ω`);
    }
});