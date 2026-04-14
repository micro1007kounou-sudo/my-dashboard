// ===============================
// USDT/JPY（CryptoCompare）
// 海外取引所のドル価格を円換算するために使用
// ===============================
let usdtJpy = null;

function getUSDT() {
    fetch("https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=JPY")
        .then(res => res.json())
        .then(data => {
            usdtJpy = data.JPY; // USDT → 円
        })
        .catch(err => console.log("USDT/JPY エラー:", err));
}

// 10秒ごとに更新
setInterval(getUSDT, 10000);
getUSDT();



// ===============================
// Binance（BTC/USDT）
// ===============================
console.log("JS 読み込み OK");

const ws = new WebSocket("wss://stream.binance.com/ws/btcusdt@trade");

ws.onopen = () => {
    console.log("Binance 接続成功");
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const priceUsd = parseFloat(data.p); // USDT価格

    if (usdtJpy) {
        const priceJpy = priceUsd * usdtJpy;

        // 円メイン
        document.getElementById("binance").innerText =
            Number(priceJpy).toLocaleString() + " 円";

        // ドルはカッコ内
        document.getElementById("binance_usd").innerText =
            "(" + "$" + Number(priceUsd.toFixed(2)).toLocaleString() + ")";
    }
};



// ===============================
// OKX（BTC-USDT）
// ===============================
const wsOKX = new WebSocket("wss://ws.okx.com/ws/v5/public");

wsOKX.onopen = () => {
    console.log("OKX 接続成功");

    // BTC-USDT の ticker を購読
    wsOKX.send(JSON.stringify({
        op: "subscribe",
        args: [
            { channel: "tickers", instId: "BTC-USDT" }
        ]
    }));
};

wsOKX.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // ticker 以外のメッセージは無視
    if (!data.arg || data.arg.channel !== "tickers") return;
    if (!data.data || !data.data[0]) return;

    const priceUsd = parseFloat(data.data[0].last);

    if (usdtJpy) {
        const priceJpy = priceUsd * usdtJpy;

        document.getElementById("okx").innerText =
            Number(priceJpy).toLocaleString() + " 円";

        document.getElementById("okx_usd").innerText =
            "(" + "$" + Number(priceUsd.toFixed(2)).toLocaleString() + ")";
    }
};

wsOKX.onerror = (err) => console.log("OKX WebSocket エラー:", err);
wsOKX.onclose = () => console.log("OKX WebSocket 切断");



// ===============================
// Bybit（BTCUSDT）
// ===============================
const wsBybit = new WebSocket("wss://stream.bybit.com/v5/public/spot");

wsBybit.onopen = () => {
    console.log("Bybit 接続成功");

    wsBybit.send(JSON.stringify({
        op: "subscribe",
        args: ["tickers.BTCUSDT"]
    }));
};

wsBybit.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // topic が無いメッセージは無視
    if (!data.topic) return;

    // tickers 以外は無視
    if (!data.topic.startsWith("tickers.")) return;

    // lastPrice が無い場合は無視
    if (!data.data || !data.data.lastPrice) return;

    const priceUsd = parseFloat(data.data.lastPrice);

    if (usdtJpy) {
        const priceJpy = priceUsd * usdtJpy;

        document.getElementById("bybit").innerText =
            Number(priceJpy).toLocaleString() + " 円";

        document.getElementById("bybit_usd").innerText =
            "(" + "$" + Number(priceUsd.toFixed(2)).toLocaleString() + ")";
    }
};

wsBybit.onerror = (err) => console.log("Bybit WebSocket エラー:", err);
wsBybit.onclose = () => console.log("Bybit WebSocket 切断");



// ===============================
// bitFlyer（BTC/JPY）
// 国内取引所 → 円がメイン、ドルは換算
// ===============================
const wsBF = new WebSocket("wss://ws.lightstream.bitflyer.com/json-rpc");

wsBF.onopen = () => {
    console.log("bitFlyer 接続成功");

    wsBF.send(JSON.stringify({
        method: "subscribe",
        params: { channel: "lightning_ticker_BTC_JPY" }
    }));
};

wsBF.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (!data.params || !data.params.message) return;

    const priceJpy = data.params.message.ltp;

    // 円メイン
    document.getElementById("bitflyer").innerText =
        Number(priceJpy).toLocaleString();

    // ドル換算
    if (usdtJpy) {
        const priceUsd = priceJpy / usdtJpy;
        document.getElementById("bitflyer_usd").innerText =
            "$" + Number(priceUsd.toFixed(2)).toLocaleString();
    }
};

wsBF.onerror = (err) => console.log("bitFlyer WebSocket エラー:", err);
wsBF.onclose = () => console.log("bitFlyer WebSocket 切断");



// ===============================
// bitbank（BTC/JPY）
// ===============================
const wsBB = new WebSocket("wss://stream.bitbank.cc/socket.io/?EIO=3&transport=websocket");

wsBB.onopen = () => {
    console.log("bitbank 接続成功");

    wsBB.send('42["join-room","ticker_btc_jpy"]');
};

wsBB.onmessage = (event) => {
    const msg = event.data;

    if (!msg.startsWith("42")) return;

    let json;
    try {
        json = JSON.parse(msg.slice(2));
    } catch {
        return;
    }

    const channel = json[0];
    const body = json[1];

    if (channel === "message" && body.room_name === "ticker_btc_jpy") {
        const priceJpy = body.message.data.last;
        document.getElementById("bitbank").innerText = Number(priceJpy).toLocaleString();

        // ★★★ ドル換算を追加 ★★★
if (usdtJpy) {
    const priceUsd = priceJpy / usdtJpy;
    document.getElementById("bitbank_usd").innerText =
        "$" + Number(priceUsd.toFixed(2)).toLocaleString();
}


    }
};


wsBB.onerror = (err) => {
    console.log("bitbank WebSocket エラー:", err);
};

wsBB.onclose = () => {
    console.log("bitbank WebSocket 切断");
};

