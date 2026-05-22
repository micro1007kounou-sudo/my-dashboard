let excelData = [];
let jsonData = {};

document.getElementById("fileInput").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    excelData = XLSX.utils.sheet_to_json(sheet);

    showPreview(excelData);
    document.getElementById("generateJsonBtn").disabled = false;
  };
  reader.readAsArrayBuffer(file);
});

// Excel プレビュー
function showPreview(data) {
  const preview = document.getElementById("preview");
  preview.innerHTML = "";

  if (data.length === 0) {
    preview.textContent = "データがありません";
    return;
  }

  const table = document.createElement("table");

  // ヘッダー
  const header = document.createElement("tr");
  Object.keys(data[0]).forEach(key => {
    const th = document.createElement("th");
    th.textContent = key;
    header.appendChild(th);
  });
  table.appendChild(header);

  // データ行
  data.forEach(row => {
    const tr = document.createElement("tr");
    Object.values(row).forEach(v => {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  preview.appendChild(table);
}

// JSON 生成（Excel の内容をそのまま JSON にする）
document.getElementById("generateJsonBtn").addEventListener("click", function() {
  jsonData = excelData; // ← そのまま JSON にするだけ

  document.getElementById("jsonPreview").textContent =
    JSON.stringify(jsonData, null, 2);

  document.getElementById("downloadBtn").disabled = false;
});

// JSON ダウンロード
document.getElementById("downloadBtn").addEventListener("click", function() {
  const blob = new Blob(
    [JSON.stringify(jsonData, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "converted.json";
  a.click();
  URL.revokeObjectURL(url);
});
