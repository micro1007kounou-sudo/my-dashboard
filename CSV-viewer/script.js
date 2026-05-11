let originalData = []; // CSV読み込み時の元データ（変更しない）
let displayData = [];  // 表示用データ（検索・ソート・編集で変わる）
let sortState = {};

document.getElementById("csvFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function () {
    const lines = reader.result.split("\n").map(row => row.split(","));
    originalData = lines;
    displayData = JSON.parse(JSON.stringify(lines)); // 深いコピー
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
  for (let r = 1; r < data.length; r++) {
    const tr = document.createElement("tr");

    data[r].forEach((cell, c) => {
      const td = document.createElement("td");
      td.textContent = cell;

      // 🔧 ダブルクリックで編集
      td.addEventListener("dblclick", function () {
        editCell(td, r, c);
      });

      tr.appendChild(td);
    });

    table.appendChild(tr);
  }
}

// ✏️ セル編集処理
function editCell(td, rowIndex, colIndex) {
  const oldValue = td.textContent;

  const input = document.createElement("input");
  input.type = "text";
  input.value = oldValue;
  input.style.width = "100%";

  td.textContent = "";
  td.appendChild(input);
  input.focus();

  // Enter or blur で確定
  const finish = () => {
    const newValue = input.value;
    td.textContent = newValue;

    // displayData に反映
    displayData[rowIndex][colIndex] = newValue;
  };

  input.addEventListener("blur", finish);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      input.blur();
    }
  });
}

// 🔍 検索（originalData を対象）
document.getElementById("searchInput").addEventListener("input", function () {
  const keyword = this.value.toLowerCase();

  const filtered = originalData.filter((row, i) => {
    if (i === 0) return true;
    return row.some(col => col.toLowerCase().includes(keyword));
  });

  displayData = JSON.parse(JSON.stringify(filtered));
  renderTable(displayData);
});

// ↕ ソート（displayData のみ）
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
document.getElementById("saveUtf8Btn").addEventListener("click", function () {
  if (!displayData || displayData.length === 0) return;

  const csvContent = displayData.map(row =>
    row.map(cell => {
      if (cell.includes(",")) return `"${cell}"`;
      return cell;
    }).join(",")
  ).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "edited_utf8.csv";
  a.click();

  URL.revokeObjectURL(url);
});
document.getElementById("saveSjisBtn").addEventListener("click", function () {
  if (!displayData || displayData.length === 0) return;

  const csvContent = displayData.map(row =>
    row.map(cell => {
      if (cell.includes(",")) return `"${cell}"`;
      return cell;
    }).join(",")
  ).join("\n");

  // Shift-JIS でエンコード
  const encoder = new TextEncoder("shift-jis");
  const sjisData = encoder.encode(csvContent);

  const blob = new Blob([sjisData], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "edited_sjis.csv";
  a.click();

  URL.revokeObjectURL(url);
});
