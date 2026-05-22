// 共通データ
let excelData = [];
let jsonDataFromExcel = [];
let jsonDataFromFile = [];

// ------------------------------
// Excel → JSON
// ------------------------------
document.getElementById("fileInputExcel").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    excelData = XLSX.utils.sheet_to_json(sheet); // テーブル的に扱える

    showExcelPreview(excelData, "previewExcel");
    document.getElementById("generateJsonBtn").disabled = excelData.length === 0;
  };
  reader.readAsArrayBuffer(file);
});

// Excel プレビュー表示
function showExcelPreview(data, elementId) {
  const preview = document.getElementById(elementId);
  preview.innerHTML = "";

  if (!data || data.length === 0) {
    preview.textContent = "データがありません";
    return;
  }

  const table = document.createElement("table");

  const header = document.createElement("tr");
  Object.keys(data[0]).forEach(key => {
    const th = document.createElement("th");
    th.textContent = key;
    header.appendChild(th);
  });
  table.appendChild(header);

  data.forEach(row => {
    const tr = document.createElement("tr");
    Object.keys(data[0]).forEach(key => {
      const td = document.createElement("td");
      td.textContent = row[key] !== undefined ? row[key] : "";
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  preview.appendChild(table);
}

// JSON 生成（Excel → JSON）
document.getElementById("generateJsonBtn").addEventListener("click", function() {
  jsonDataFromExcel = excelData; // そのまま配列として扱う
  const jsonText = JSON.stringify(jsonDataFromExcel, null, 2);
  document.getElementById("jsonPreview").textContent = jsonText;
  document.getElementById("downloadJsonBtn").disabled = jsonDataFromExcel.length === 0;
});

// JSON ダウンロード
document.getElementById("downloadJsonBtn").addEventListener("click", function() {
  const blob = new Blob(
    [JSON.stringify(jsonDataFromExcel, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "converted.json";
  a.click();
  URL.revokeObjectURL(url);
});

// ------------------------------
// JSON → Excel
// ------------------------------
document.getElementById("fileInputJson").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const text = ev.target.result;
      const parsed = JSON.parse(text);

      // 配列でなければ配列に包む
      if (Array.isArray(parsed)) {
        jsonDataFromFile = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        // オブジェクトの場合は値を配列化（用途に応じて調整可）
        jsonDataFromFile = Array.isArray(parsed)
          ? parsed
          : Object.keys(parsed).map(k => ({ key: k, ...parsed[k] }));
      } else {
        jsonDataFromFile = [];
      }

      document.getElementById("jsonPreviewFromFile").textContent =
        JSON.stringify(jsonDataFromFile, null, 2);

      showExcelPreview(jsonDataFromFile, "previewFromJson");
      document.getElementById("downloadExcelBtn").disabled = jsonDataFromFile.length === 0;
    } catch (err) {
      document.getElementById("jsonPreviewFromFile").textContent =
        "JSON の解析に失敗しました: " + err.message;
      document.getElementById("previewFromJson").innerHTML = "";
      document.getElementById("downloadExcelBtn").disabled = true;
    }
  };
  reader.readAsText(file, "utf-8");
});

// Excel ダウンロード（JSON → Excel）
document.getElementById("downloadExcelBtn").addEventListener("click", function() {
  if (!jsonDataFromFile || jsonDataFromFile.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(jsonDataFromFile);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  XLSX.writeFile(wb, "converted.xlsx");
});
