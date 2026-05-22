// ------------------------------
// 共通：元ファイル名から拡張子を除去
// ------------------------------
function getBaseName(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}

// ------------------------------
// CSV → Excel（XLSX）
// ------------------------------
let csvData = [];
let originalCsvName = "";

document.getElementById("fileInputCsv").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  originalCsvName = getBaseName(file.name);

  const reader = new FileReader();
  reader.onload = function(ev) {
    const text = ev.target.result;

    csvData = text.split(/\r?\n/).map(r => r.split(","));

    showTablePreview(csvData, "previewCsv");
    document.getElementById("downloadExcelBtn").disabled = csvData.length === 0;
  };

  reader.readAsText(file, "utf-8");
});

document.getElementById("downloadExcelBtn").addEventListener("click", function() {
  const ws = XLSX.utils.aoa_to_sheet(csvData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  XLSX.writeFile(wb, `${originalCsvName}-cvrt.xlsx`);
});

// ------------------------------
// Excel（XLSX）→ CSV
// ------------------------------
let excelData = [];
let originalExcelName = "";

document.getElementById("fileInputExcel").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  originalExcelName = getBaseName(file.name);

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

document.getElementById("downloadCsvBtn").addEventListener("click", function() {
  const encoding = document.getElementById("csvEncoding").value;
  const base = originalExcelName;

  const csv = excelData.map(row => row.join(",")).join("\r\n");

  let blob;
  let filename;

  if (encoding === "shift-jis") {
    const unicodeArray = Encoding.stringToCode(csv);
    const sjisArray = Encoding.convert(unicodeArray, "SJIS", "UNICODE");
    blob = new Blob([new Uint8Array(sjisArray)], { type: "text/csv" });
    filename = `${base}-cvrt-sjis.csv`;
  } else {
    blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    filename = `${base}-cvrt-utf8.csv`;
  }

  downloadFile(blob, filename);
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
// 共通：プレビュー表示
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
