let originalData = []; // CSV読み込み時の元データ（絶対に変更しない）
let displayData = [];  // 表示用データ（検索・ソートで変わる）
let sortState = {};

document.getElementById("csvFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    const lines = reader.result.split("\n").map(row => row.split(","));
    originalData = lines;          // 元データ
    displayData = [...lines];      // 表示用データ
    renderTable(displayData);
  };
  reader.readAsText(file);
});

function renderTable(data) {
  const table = document.getElementById("csvTable");
  table.innerHTML = "";

  // ヘッダー
  const headerRow = document.createElement("tr");
  data[0].forEach((col, index) => {
    const th = document.createElement("th");
    th.textContent = col;
    th.addEventListener("click", () => sortColumn(index));
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // データ行
  for (let i = 1; i < data.length; i++) {
    const tr = document.createElement("tr");
    data[i].forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  }
}

// 🔍 検索（常に originalData を対象にする）
document.getElementById("searchInput").addEventListener("input", function () {
  const keyword = this.value.toLowerCase();

  // originalData からフィルタ
  const filtered = originalData.filter((row, i) => {
    if (i === 0) return true; // ヘッダー
    return row.some(col => col.toLowerCase().includes(keyword));
  });

  displayData = filtered; // 表示用データを更新
  renderTable(displayData);
});

// ↕ ソート（displayData のみを並び替える）
function sortColumn(colIndex) {
  const header = displayData[0];
  const body = displayData.slice(1);

  const current = sortState[colIndex] || "asc";

  body.sort((a, b) => {
    const A = a[colIndex];
    const B = b[colIndex];

    const numA = parseFloat(A);
    const numB = parseFloat(B);

    if (!isNaN(numA) && !isNaN(numB)) {
      return current === "asc" ? numA - numB : numB - numA;
    }

    return current === "asc"
      ? A.localeCompare(B)
      : B.localeCompare(A);
  });

  sortState[colIndex] = current === "asc" ? "desc" : "asc";

  displayData = [header, ...body];
  renderTable(displayData);
}
