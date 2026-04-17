// ===============================
// USDT/JPY（CryptoCompare）
// ===============================
let usdtJpy = null;

function getUSDT() {
    fetch("https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=JPY")
        .then(res => res.json())
        .then(data => {
            usdtJpy = data.JPY;
        })
        .catch(err => console.log("USDT/JPY エラー:", err));
}

setInterval(getUSDT, 10000);
getUSDT();


// ===============================
// 共通：自動再接続 WebSocket 関数
// ===============================
function createWS(url, onOpen, onMessage, name) {
    let ws;

    function connect() {
        ws = new WebSocket(url);

        ws.onopen = () => {
            console.log(name + " 接続成功");
            if (onOpen) onOpen(ws);
        };

        ws.onmessage = (event) => {
            if (onMessage) onMessage(event);
        };

        ws.onerror = (err) => {
            console.log(name + " エラー:", err);
        };

        ws.onclose = () => {
            console.log(name + " 切断 → 3秒後に再接続");
            setTimeout(connect, 3000);
        };
    }

    connect();
}


// ===============================
// Binance（BTC/USDT）
// ===============================
createWS(
    "wss://stream.binance.com/ws/btcusdt@trade",
    null,
    (event) => {
        const data = JSON.parse(event.data);
        const priceUsd = parseFloat(data.p);

        if (usdtJpy) {
            const priceJpy = priceUsd * usdtJpy;

            document.getElementById("binance").innerText =
                Number(priceJpy).toLocaleString() + " 円";

            document.getElementById("binance_usd").innerText =
                "(" + "$" + Number(priceUsd.toFixed(2)).toLocaleString() + ")";
        }
    },
    "Binance"
);


// ===============================
// OKX（BTC-USDT）
// ===============================
createWS(
    "wss://ws.okx.com/ws/v5/public",
    (ws) => {
        ws.send(JSON.stringify({
            op: "subscribe",
            args: [{ channel: "tickers", instId: "BTC-USDT" }]
        }));
    },
    (event) => {
        const data = JSON.parse(event.data);
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
    },
    "OKX"
);


// ===============================
// Bybit（BTCUSDT）
// ===============================
createWS(
    "wss://stream.bybit.com/v5/public/spot",
    (ws) => {
        ws.send(JSON.stringify({
            op: "subscribe",
            args: ["tickers.BTCUSDT"]
        }));
    },
    (event) => {
        const data = JSON.parse(event.data);
        if (!data.topic) return;
        if (!data.topic.startsWith("tickers.")) return;
        if (!data.data || !data.data.lastPrice) return;

        const priceUsd = parseFloat(data.data.lastPrice);

        if (usdtJpy) {
            const priceJpy = priceUsd * usdtJpy;

            document.getElementById("bybit").innerText =
                Number(priceJpy).toLocaleString() + " 円";

            document.getElementById("bybit_usd").innerText =
                "(" + "$" + Number(priceUsd.toFixed(2)).toLocaleString() + ")";
        }
    },
    "Bybit"
);


// ===============================
// bitFlyer（BTC/JPY）
// ===============================
createWS(
    "wss://ws.lightstream.bitflyer.com/json-rpc",
    (ws) => {
        ws.send(JSON.stringify({
            method: "subscribe",
            params: { channel: "lightning_ticker_BTC_JPY" }
        }));
    },
    (event) => {
        const data = JSON.parse(event.data);
        if (!data.params || !data.params.message) return;

        const priceJpy = data.params.message.ltp;

        document.getElementById("bitflyer").innerText =
            Number(priceJpy).toLocaleString();

        if (usdtJpy) {
            const priceUsd = priceJpy / usdtJpy;
            document.getElementById("bitflyer_usd").innerText =
                "$" + Number(priceUsd.toFixed(2)).toLocaleString();
        }
    },
    "bitFlyer"
);


// ===============================
// bitbank（BTC/JPY）
// ===============================
createWS(
    "wss://stream.bitbank.cc/socket.io/?EIO=3&transport=websocket",
    (ws) => {
        ws.send('42["join-room","ticker_btc_jpy"]');
    },
    (event) => {
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
            document.getElementById("bitbank").innerText =
                Number(priceJpy).toLocaleString();

            if (usdtJpy) {
                const priceUsd = priceJpy / usdtJpy;
                document.getElementById("bitbank_usd").innerText =
                    "$" + Number(priceUsd.toFixed(2)).toLocaleString();
            }
        }
    },
    "bitbank"
);

// ===============================
// Hyperliquid（BTC 現物）
// ===============================
createWS(
    "wss://api.hyperliquid.xyz/ws",
    (ws) => {
        ws.send(JSON.stringify({
            method: "subscribe",
            subscription: {
                type: "trades",
                coin: "BTC"
            }
        }));
    },
    (event) => {
        const msg = JSON.parse(event.data);

        // trades 以外は無視
        if (msg.channel !== "trades") return;

        // data は配列なので [0] を読む
        const trade = msg.data?.[0];
        if (!trade || !trade.px || !usdtJpy) return;

        // px は文字列なので数値に変換
        const priceUsd = Number(trade.px);
        if (isNaN(priceUsd)) return;

        const priceJpy = Math.round(priceUsd * usdtJpy);

        document.getElementById("hyperliquid").textContent =
            priceJpy.toLocaleString();

        document.getElementById("hyperliquid_usd").textContent =
    "($" + Number(priceUsd.toFixed(2)).toLocaleString() + ")";


    },
    "Hyperliquid Spot"
);
