// ------------------------------
// 共通：元ファイル名から拡張子を除去
// ------------------------------
function getBaseName(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}
// ------------------------------
// JSON → Excel（XLSX）
// ------------------------------
let jsonData = null;
let originalJsonName = "";

document.getElementById("fileInputJson").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  originalJsonName = getBaseName(file.name);

  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      jsonData = JSON.parse(ev.target.result);

      // JSON → 表形式に変換
      const rows = Array.isArray(jsonData)
        ? jsonData
        : Object.keys(jsonData).map(key => [key, jsonData[key]]);

      // ★ JSON プレビュー（縦長 JSON）
      document.getElementById("previewJson").textContent =
        JSON.stringify(jsonData, null, 2);

      // ★ Excel プレビュー（表形式）
      showTablePreview(rows, "previewJsonToExcel");

      document.getElementById("downloadExcelFromJsonBtn").disabled = false;

    } catch (err) {
      alert("JSON の読み込みに失敗しました");
    }
  };

  reader.readAsText(file, "utf-8");
});


document.getElementById("downloadExcelFromJsonBtn").addEventListener("click", function() {
  const rows = Array.isArray(jsonData)
    ? jsonData
    : Object.keys(jsonData).map(key => [key, jsonData[key]]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  XLSX.writeFile(wb, `${originalJsonName}-cvrt.xlsx`);
});

// ------------------------------
// Excel（XLSX）→ JSON
// ------------------------------
let excelJsonData = [];
let originalExcelNameJson = "";

document.getElementById("fileInputExcelJson").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  originalExcelNameJson = getBaseName(file.name);

  const reader = new FileReader();
  reader.onload = function(ev) {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    excelJsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Excel プレビュー
    showTablePreview(excelJsonData, "previewExcelJson");

    // JSON プレビュー（Excel → JSON）
    const jsonPreview = JSON.stringify(excelJsonData, null, 2);
    document.getElementById("previewJsonFromExcel").textContent = jsonPreview;

    document.getElementById("downloadJsonBtn").disabled = excelJsonData.length === 0;
  };

  reader.readAsArrayBuffer(file);
});

document.getElementById("downloadJsonBtn").addEventListener("click", function() {
  const json = JSON.stringify(excelJsonData, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  downloadFile(blob, `${originalExcelNameJson}-cvrt.json`);
});

// ------------------------------
// 共通：ダウンロード処理
// ------------------------------
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ------------------------------
// 共通：プレビュー表示（表形式）
// ------------------------------
function showTablePreview(data, elementId) {
  const preview = document.getElementById(elementId);
  preview.innerHTML = "";

  if (!data || data.length === 0) {
    preview.textContent = "データがありません";
    return;
  }

  const table = document.createElement("table");

  data.forEach(row => {
    const tr = document.createElement("tr");
    (Array.isArray(row) ? row : Object.values(row)).forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  preview.appendChild(table);
}
