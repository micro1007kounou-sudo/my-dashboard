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

// ===============================
// SoDEX Spot（vBTC_vUSDC）
// ===============================
createWS(
    "wss://mainnet-gw.sodex.dev/ws/spot",
    (ws) => {
        console.log("SoDEX Spot 接続成功");

        ws.send(JSON.stringify({
            op: "subscribe",
            params: {
                channel: "ticker",
                symbols: ["vBTC_vUSDC"]
            }
        }));

        console.log("SoDEX Spot 購読送信: vBTC_vUSDC");
    },
    (event) => {
        const msg = JSON.parse(event.data);

        // ticker チャンネルのみ処理
        if (msg.channel !== "ticker") return;

        const tick = msg.data?.[0];
        if (!tick || !tick.c) return;

        const priceUsd = Number(tick.c);
        if (isNaN(priceUsd)) return;

        // 円換算
        const priceJpy = Math.round(priceUsd * usdtJpy);

        document.getElementById("sodex_spot").textContent =
            priceJpy.toLocaleString();

        document.getElementById("sodex_spot_usd").textContent =
            "($" + priceUsd.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + ")";
    },
    "SoDEX Spot"
);


// ===============================
// Binance Perps（BTCUSDT 永久）
// ===============================
createWS(
    "wss://fstream.binance.com/ws",
    (ws) => {
        console.log("Binance Perps 接続成功");

        ws.send(JSON.stringify({
            method: "SUBSCRIBE",
            params: ["btcusdt@markPrice"],
            id: 1
        }));

        console.log("Binance Perps 購読送信: btcusdt@markPrice");
    },
    (event) => {
        const msg = JSON.parse(event.data);

        // mark price update のみ処理
        if (msg.e !== "markPriceUpdate") return;

        const priceUsd = Number(msg.p);
        if (isNaN(priceUsd)) return;

        document.getElementById("binance_perp").textContent =
            "$" + priceUsd.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
    },
    "Binance Perps"
);

// ===============================
// OKX Perps（BTC-USDT-SWAP）
// ===============================
createWS(
    "wss://ws.okx.com/ws/v5/public",
    (ws) => {
        console.log("OKX Perps 接続成功");

        ws.send(JSON.stringify({
            op: "subscribe",
            args: [
                {
                    channel: "tickers",
                    instId: "BTC-USDT-SWAP"
                }
            ]
        }));

        console.log("OKX Perps 購読送信: BTC-USDT-SWAP");
    },
    (event) => {
        const msg = JSON.parse(event.data);

        if (!msg.arg || msg.arg.channel !== "tickers") return;

        const tick = msg.data?.[0];
        if (!tick || !tick.last) return;

        const priceUsd = Number(tick.last);
        if (isNaN(priceUsd)) return;

        document.getElementById("okx_perp").textContent =
            "$" + priceUsd.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
    },
    "OKX Perps"
);

// ===============================
// Bybit Perps（BTCUSDT 永久）
// ===============================
createWS(
    "wss://stream.bybit.com/v5/public/linear",
    (ws) => {
        console.log("Bybit Perps 接続成功");

        ws.send(JSON.stringify({
            op: "subscribe",
            args: ["tickers.BTCUSDT"]
        }));

        console.log("Bybit Perps 購読送信: tickers.BTCUSDT");
    },
    (event) => {
        const msg = JSON.parse(event.data);

        // tickers チャンネルのみ処理
        if (!msg.topic || msg.topic !== "tickers.BTCUSDT") return;

        const tick = msg.data;
        if (!tick || !tick.lastPrice) return;

        const priceUsd = Number(tick.lastPrice);
        if (isNaN(priceUsd)) return;

        document.getElementById("bybit_perp").textContent =
            "$" + priceUsd.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
    },
    "Bybit Perps"
);

// ===============================
// Hyperliquid Perps（BTC-PERP）
// ===============================
createWS(
    "wss://api.hyperliquid.xyz/ws",

    // --- onOpen ---
    (ws) => {
        console.log("Hyperliquid Perps 接続成功");

        ws.send(JSON.stringify({
            method: "subscribe",
            subscription: {
                type: "allMids"
            }
        }));

        console.log("Hyperliquid Perps 購読送信: allMids");
    },

    // --- onMessage ---
    (event) => {
        try {
            const msg = JSON.parse(event.data);

            // 他取引所と同じように channel でフィルタ
            if (msg.channel !== "allMids") return;

            const mids = msg.data?.mids;
            if (!mids) return;

            // BTC の mid price
            const price = Number(mids["BTC"]);
            if (!price) return;

            // DOM 更新（他取引所と同じパターン）
            const el = document.getElementById("hyper_perp");
            if (el) {
                el.textContent = "$" + price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }

        } catch (err) {
            console.error("Hyperliquid Parsing Error:", err);
        }
    },

    "Hyperliquid Perps"
);

// ===============================
// SoDEX Perps（BTC-USD）
// ===============================
createWS(
    "wss://mainnet-gw.sodex.dev/ws/perps",
    (ws) => {
        console.log("SoDEX Perps 接続成功");

        ws.send(JSON.stringify({
            op: "subscribe",
            params: {
                channel: "ticker",
                symbols: ["BTC-USD"]   // ← Whitepaper の正式名称
            }
        }));

        console.log("SoDEX Perps 購読送信: BTC-USD");
    },
    (event) => {
        const msg = JSON.parse(event.data);

        // ticker チャンネルのみ処理
        if (msg.channel !== "ticker") return;

        const tick = msg.data?.[0];
        if (!tick || !tick.c) return;

        const priceUsd = Number(tick.c);
        if (isNaN(priceUsd)) return;

        // USD のみ表示
        const el = document.getElementById("sodex_perp");
        if (el) {
            el.textContent =
                "$" + priceUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
        }
    },
    "SoDEX Perps"
);
