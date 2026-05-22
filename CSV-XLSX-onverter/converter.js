const fileInputCsv = document.getElementById("fileInputCsv");
const fileInputExcel = document.getElementById("fileInputExcel");
const downloadExcelBtn = document.getElementById("downloadExcelBtn");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const csvEncoding = document.getElementById("csvEncoding");

let csvData = [];
let excelData = [];
let originalCsvName = "converted";
let originalExcelName = "converted";

function getBaseName(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}

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

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

fileInputCsv.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  originalCsvName = getBaseName(file.name) || "converted";

  const reader = new FileReader();
  reader.onload = function(ev) {
    const text = ev.target.result;
    const rows = text
      .split(/\r?\n/)
      .filter(line => line.length > 0)
      .map(r => r.split(","));

    csvData = rows;
    showTablePreview(rows, "previewCsv");
    downloadExcelBtn.disabled = rows.length === 0;
  };

  reader.readAsText(file, "utf-8");
});

downloadExcelBtn.addEventListener("click", function() {
  const ws = XLSX.utils.aoa_to_sheet(csvData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${originalCsvName}-cvrt.xlsx`);
});

fileInputExcel.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  originalExcelName = getBaseName(file.name) || "converted";

  const reader = new FileReader();
  reader.onload = function(ev) {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    showTablePreview(excelData, "previewExcel");
    downloadCsvBtn.disabled = excelData.length === 0;
  };

  reader.readAsArrayBuffer(file);
});

downloadCsvBtn.addEventListener("click", function() {
  const encoding = csvEncoding.value;
  const csv = excelData.map(row => row.join(",")).join("\r\n");
  let blob;
  const base = originalExcelName || "converted";

  if (encoding === "shift-jis") {
    const unicodeArray = Encoding.stringToCode(csv);
    const sjisArray = Encoding.convert(unicodeArray, "SJIS", "UNICODE");
    blob = new Blob([new Uint8Array(sjisArray)], { type: "text/csv" });
    downloadFile(blob, `${base}-cvrt-sjis.csv`);
  } else {
    blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadFile(blob, `${base}-cvrt-utf8.csv`);
  }
});
