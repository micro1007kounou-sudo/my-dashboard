function getWeather() {
    const url =
  "https://api.open-meteo.com/v1/forecast?latitude=35.0116&longitude=135.7681&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,precipitation,rain,weather_code";
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const temp = data.current.temperature_2m;
            const humidity = data.current.relative_humidity_2m;
            const wind = data.current.wind_speed_10m;
            const windDir = data.current.wind_direction_10m;
            const windDirName = getWindDirectionName(windDir);
            const pressure = data.current.surface_pressure;
            const precip = data.current.precipitation;
            const code = data.current.weather_code;
   
            const description = getWeatherDescription(code);

            document.getElementById("temp").innerText = temp;
            document.getElementById("humidity").innerText = humidity;
            document.getElementById("wind").innerText = wind;
            document.getElementById("windDir").innerText = windDir;
            document.getElementById("pressure").innerText = pressure;
            document.getElementById("precip").innerText = precip;  
            document.getElementById("code").innerText = description;
            document.getElementById("windDir").innerText = windDirName; 

            // ★ 更新時刻を表示
            const now = new Date();
            const timeString = now.toLocaleString("ja-JP"); 
            document.getElementById("updated").innerText = timeString;


        })
        .catch(error => {
            console.error("エラー:", error);
        });

}
      getWeather();
setInterval(getWeather, 30000); // 30秒ごとに更新


function getWeatherDescription(code) {
    const weatherCodes = {
        0: "快晴",
        1: "晴れ",
        2: "薄曇り",
        3: "曇り",
        45: "霧",
        48: "霧氷",
        51: "霧雨（弱）",
        53: "霧雨（中）",
        55: "霧雨（強）",
        61: "雨（弱）",
        63: "雨（中）",
        65: "雨（強）",
        71: "雪（弱）",
        73: "雪（中）",
        75: "雪（強）",
        95: "雷雨",
        96: "雷雨（弱い雹）",
        99: "雷雨（強い雹）"
    };

    return weatherCodes[code] || "不明";
}

function getWindDirectionName(deg) {
    if (deg >= 337.5 || deg < 22.5) return "北";
    if (deg >= 22.5 && deg < 67.5) return "北東";
    if (deg >= 67.5 && deg < 112.5) return "東";
    if (deg >= 112.5 && deg < 157.5) return "南東";
    if (deg >= 157.5 && deg < 202.5) return "南";
    if (deg >= 202.5 && deg < 247.5) return "南西";
    if (deg >= 247.5 && deg < 292.5) return "西";
    if (deg >= 292.5 && deg < 337.5) return "北西";
    return "不明";
}


function getUSDT() {
    fetch("https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=JPY")
        .then(res => res.json())
        .then(data => {
            const price = data.JPY;
            document.getElementById("usdt").innerText = price.toFixed(3);

            // ドル換算に必要
            window.usdtJpy = price;
        })
        .catch(err => console.error("USDT/JPY エラー:", err));
}




// ビットコイン
function getBTC() {
    fetch("https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=JPY")
        .then(res => res.json())
        .then(data => {
            const price = data.JPY;
            document.getElementById("btc").innerText = price.toLocaleString();
        })
        .catch(err => console.error("BTC/JPY エラー:", err));
}


function getGold() {
    fetch("https://min-api.cryptocompare.com/data/price?fsym=PAXG&tsyms=JPY")
        .then(res => res.json())
        .then(data => {
            const xauJpy = data.JPY;       // 1オンスの円価格
            const gramPrice = xauJpy / 31.1035;  // 1g に換算
            document.getElementById("gold").innerText = gramPrice.toFixed(2);
        })
        .catch(err => console.error("PAXG エラー:", err));
}

let step = 0;

// --- 初回だけ10秒ずつずらして実行 ---
setTimeout(() => {
    getUSDT();   // 5秒
}, 5000);

setTimeout(() => {
    getBTC();    // 10秒
}, 10000);

setTimeout(() => {
    getGold();   // 15秒
}, 15000);


// --- その後は各APIを60秒ごとに独立して更新 ---
setInterval(() => {
    getUSDT();
}, 60000); // USDTは60秒周期

setInterval(() => {
    getBTC();
}, 60000); // BTCも60秒周期

setInterval(() => {
    getGold();
}, 60000); // PAXGも60秒周期

function getNHKNews() {
    const url = "https://www3.nhk.or.jp/rss/news/cat0.xml?_=1";

    fetch(url)
        .then(res => res.text())
        .then(str => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(str, "text/xml");
            const items = xml.querySelectorAll("item");

            const newsList = document.getElementById("news-list");
            newsList.innerHTML = "";

            for (let i = 0; i < 5; i++) {
                const item = items[i];
                if (!item) continue;

                const title = item.querySelector("title").textContent;
                const link = item.querySelector("link").textContent;

                const li = document.createElement("li");
                li.innerHTML = `<a href="${link}" target="_blank">${title}</a>`;
                newsList.appendChild(li);
            }
        })
        .catch(err => console.error("NHKニュース取得エラー:", err));
}

getNHKNews();
setInterval(getNHKNews, 30000);
