// ===============================
// USDT/JPY（CryptoCompare）
// ===============================

// USDT→JPY の為替レートを保持する変数
let usdtJpy = null;

// CryptoCompare API から USDT/JPY を取得
function getUSDT() {
    fetch("https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=JPY")
        .then(res => res.json())
        .then(data => {
            // JPY レートを保存
            usdtJpy = data.JPY;
        })
        .catch(err => console.log("USDT/JPY エラー:", err));
}

// 10秒ごとに更新
setInterval(getUSDT, 10000);
getUSDT();


// ===============================
// 共通：自動再接続 WebSocket 関数
// ===============================

/*
    createWS(url, onOpen, onMessage, name)

    - 全取引所で共通の WebSocket 接続ロジック
    - 切断時は 3 秒後に自動再接続
    - onOpen: 接続成功時の処理
    - onMessage: メッセージ受信時の処理
*/
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

/*
    - trade ストリームを購読
    - data.p に約定価格（USD）が入っている
*/
createWS(
    "wss://stream.binance.com/ws/btcusdt@trade",
    null,
    (event) => {
        const data = JSON.parse(event.data);
        const priceUsd = parseFloat(data.p); // 約定価格（USD）

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

/*
    - tickers チャンネルを購読
    - data[0].last に最新価格（USD）
*/
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

/*
    - tickers.BTCUSDT を購読
    - data.lastPrice に最新価格（USD）
*/
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

/*
    - lightning_ticker_BTC_JPY を購読
    - message.ltp に最新価格（JPY）
*/
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

/*
    - socket.io 形式の WebSocket
    - "42" で始まるメッセージがデータ
    - ticker_btc_jpy の last が最新価格（JPY）
*/
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

/*
    - trades チャンネルを購読
    - data[0].px に最新約定価格（USD）
*/
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

        if (msg.channel !== "trades") return;

        const trade = msg.data?.[0];
        if (!trade || !trade.px || !usdtJpy) return;

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

/*
    - ticker チャンネルを購読
    - tick.c に最新価格（USD）
*/
createWS(
    "wss://mainnet-gw.sodex.dev/ws/spot",
    (ws) => {
        ws.send(JSON.stringify({
            op: "subscribe",
            params: {
                channel: "ticker",
                symbols: ["vBTC_vUSDC"]
            }
        }));
    },
    (event) => {
        const msg = JSON.parse(event.data);

        if (msg.channel !== "ticker") return;

        const tick = msg.data?.[0];
        if (!tick || !tick.c) return;

        const priceUsd = Number(tick.c);
        if (isNaN(priceUsd)) return;

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

/*
    - fstream.binance.com は Binance Futures（先物）
    - btcusdt@markPrice を購読すると「マーク価格」が取得できる
    - msg.e === "markPriceUpdate" のときだけ最新価格が入っている
*/
createWS(
    "wss://fstream.binance.com/ws",
    (ws) => {
        console.log("Binance Perps 接続成功");

        // マーク価格の購読
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

        const priceUsd = Number(msg.p); // マーク価格（USD）
        if (isNaN(priceUsd)) return;

        // DOM 更新
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

/*
    - OKX の perpetual swap は instId: "BTC-USDT-SWAP"
    - tickers チャンネルで最新価格（last）が取得できる
*/
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

        // tickers チャンネル以外は無視
        if (!msg.arg || msg.arg.channel !== "tickers") return;

        const tick = msg.data?.[0];
        if (!tick || !tick.last) return;

        const priceUsd = Number(tick.last); // 最新価格（USD）
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

/*
    - Bybit linear perpetual（USDT建て）は v5/public/linear
    - tickers.BTCUSDT を購読すると lastPrice が取得できる
*/
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

        const priceUsd = Number(tick.lastPrice); // 最新価格（USD）
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

/*
    - Hyperliquid の Perps は "allMids" を購読する
    - 全銘柄の mid price がまとめて返ってくる
    - mids["BTC"] に BTC の mid price（USD）が入っている
*/
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

            // allMids 以外は無視
            if (msg.channel !== "allMids") return;

            const mids = msg.data?.mids;
            if (!mids) return;

            // BTC の mid price
            const price = Number(mids["BTC"]);
            if (!price) return;

            // DOM 更新
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

/*
    - SoDEX Perps は /ws/perps
    - ticker チャンネルで tick.c に最新価格（USD）
    - symbol は Whitepaper の正式名称 "BTC-USD"
*/
createWS(
    "wss://mainnet-gw.sodex.dev/ws/perps",
    (ws) => {
        console.log("SoDEX Perps 接続成功");

        ws.send(JSON.stringify({
            op: "subscribe",
            params: {
                channel: "ticker",
                symbols: ["BTC-USD"]   // 正式名称
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

        const priceUsd = Number(tick.c); // 最新価格（USD）
        if (isNaN(priceUsd)) return;

        // USD のみ表示（SoDEX Perps は USDC 建て）
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
