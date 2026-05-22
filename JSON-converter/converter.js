let excelData = [];
let jsonData = {};

document.getElementById("dropArea").addEventListener("dragover", function(e) {
  e.preventDefault();
  this.style.background = "#eef";
});

document.getElementById("dropArea").addEventListener("dragleave", function(e) {
  this.style.background = "";
});

document.getElementById("dropArea").addEventListener("drop", function(e) {
  e.preventDefault();
  this.style.background = "";

  const file = e.dataTransfer.files[0];
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

// ------------------------------
// Excel プレビュー表示
// ------------------------------
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

// ------------------------------
// JSON 生成
// ------------------------------
document.getElementById("generateJsonBtn").addEventListener("click", function() {
  jsonData = {};

  excelData.forEach(row => {
    const code = String(row["code"] || row["商品コード"]).trim();
    if (!code) return;

    jsonData[code] = {
      name: row["name"] || row["商品名"] || "",
      price: Number(row["price"] || row["単価"] || 0),
      category1: row["category1"] || "",
      category2: row["category2"] || "",
      category3: row["category3"] || "",
      category4: row["category4"] || "",
      category5: row["category5"] || "",
      category6: row["category6"] || "",
      maker: row["maker"] || row["メーカー"] || "",
      unit: row["unit"] || row["単位"] || ""
    };
  });

  document.getElementById("jsonPreview").textContent =
    JSON.stringify(jsonData, null, 2);

  document.getElementById("downloadBtn").disabled = false;
});

// ------------------------------
// JSON ダウンロード
// ------------------------------
document.getElementById("downloadBtn").addEventListener("click", function() {
  const blob = new Blob(
    [JSON.stringify(jsonData, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "master.json";
  a.click();
  URL.revokeObjectURL(url);
});
