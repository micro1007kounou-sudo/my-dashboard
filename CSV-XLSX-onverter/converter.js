// ------------------------------
// CSV → Excel
// ------------------------------
let csvData = [];

document.getElementById("fileInputCsv").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    const text = ev.target.result;

    // CSV → 2次元配列
    const rows = text.split(/\r?\n/).map(r => r.split(","));
    csvData = rows;

    showTablePreview(rows, "previewCsv");
    document.getElementById("downloadExcelBtn").disabled = rows.length === 0;
  };

  // Shift-JIS / UTF-8 自動判定（簡易）
  reader.readAsText(file, "utf-8");
});

// CSV → Excel ダウンロード
document.getElementById("downloadExcelBtn").addEventListener("click", function() {
  const ws = XLSX.utils.aoa_to_sheet(csvData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  XLSX.writeFile(wb, "converted.xlsx");
});

// ------------------------------
// Excel → CSV
// ------------------------------
let excelData = [];

document.getElementById("fileInputExcel").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    showTablePreview(excelData, "previewExcel");
    document.getElementById("downloadCsvBtn").disabled = excelData.length === 0;
  };
  reader.readAsArrayBuffer(file);
});

// Excel → CSV ダウンロード
document.getElementById("downloadCsvBtn").addEventListener("click", function() {
  const encoding = document.getElementById("csvEncoding").value;

  const csv = excelData.map(row => row.join(",")).join("\r\n");

  let blob;
  if (encoding === "shift-jis") {
    // Shift-JIS 変換（Excel 互換）
    const sjisArray = Encoding.convert(Encoding.stringToCode(csv), "SJIS", "UNICODE");
    blob = new Blob([new Uint8Array(sjisArray)], { type: "text/csv" });
  } else {
    blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "converted.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// ------------------------------
// 表プレビュー（CSV / Excel 共通）
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
    row.forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  preview.appendChild(table);
}
