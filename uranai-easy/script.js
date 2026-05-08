document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("uranaiBtn");
  const gifBox = document.getElementById("gifBox");
  const result = document.getElementById("result");

  btn.onclick = async () => {
    btn.disabled = true;
    gifBox.style.display = "block";
    result.classList.remove("show");
    result.style.opacity = "0";

    // 外部ファイル読み込み（存在しない場合は空配列扱い）
    const items = await safeLoadList("items.txt");
    const colors = await safeLoadList("colors.txt");
    const messages = await safeLoadList("messages.txt");

    setTimeout(() => {
      gifBox.style.display = "none";
      btn.disabled = false;

      const item = items.length ? items[randomIndex(items.length)] : "ラッキーアイテム";
      const color = colors.length ? colors[randomIndex(colors.length)] : "ピンク";
      const msg = messages.length ? messages[randomIndex(messages.length)] : "今日は良い日になるよ！";
      const score = Math.floor(Math.random() * 100) + 1;

      result.innerHTML = `
        <p><strong>総合運：</strong>${score} 点</p>
        <p><strong>ラッキーアイテム：</strong>${item}</p>
        <p><strong>ラッキーカラー：</strong>${color}</p>
        <p><strong>今日のメッセージ：</strong><br><strong>${msg}</strong></p>
      `;

      result.classList.add("show");

      // GIF終了後にグラフ描画
      drawFortuneGraph();

    }, 1200); // GIF 表示時間（必要に応じて調整）
  };

  async function safeLoadList(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const text = await res.text();
      return text.split("\n").map(v => v.trim()).filter(v => v);
    } catch (e) {
      return [];
    }
  }

  function randomIndex(len) {
    return Math.floor(Math.random() * len);
  }

  // グラフインスタンスをグローバルに保持（再描画時に破棄）
  window.fortuneChart = window.fortuneChart || null;

  function drawFortuneGraph() {
    // 0:00 から 2時間毎の12区切り（最後は 24:00 表示）
    const labels = [...Array.from({ length: 11 }, (_, i) => `${i * 2}:00`), "24:00"];
    const data = Array.from({ length: labels.length }, () => Math.floor(Math.random() * 100) + 1);

    // 既存グラフがあれば破棄
    if (window.fortuneChart instanceof Chart) {
      try { window.fortuneChart.destroy(); } catch (e) { /* ignore */ }
      window.fortuneChart = null;
    }

    const canvas = document.getElementById("fortuneChart");
    const ctx = canvas.getContext("2d");

    // Chart.js の設定
    window.fortuneChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "今日の運勢推移",
          data: data,
          borderColor: "#ff6fb1",
          backgroundColor: "rgba(255,111,177,0.18)",
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#ff6fb1",
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // wrapper のサイズに合わせる
        devicePixelRatio: window.devicePixelRatio || 1,
        animation: {
          duration: 600,
          easing: "easeOutQuart"
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              color: "#444"
            },
            grid: {
              display: false
            }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              color: "#444"
            },
            grid: {
              color: "rgba(200,200,200,0.12)"
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} 点`
            }
          }
        }
      }
    });

    // リサイズ安定化：ウィンドウリサイズ時に Chart の resize を呼ぶ
    // （Chart.js は通常自動で対応するが、念のため）
    if (!window._fortuneResizeHandler) {
      window._fortuneResizeHandler = () => {
        try {
          window.fortuneChart?.resize();
        } catch (e) { /* ignore */ }
      };
      window.addEventListener("resize", window._fortuneResizeHandler);
    }
  }

});
