// ------------------------------
// 商品マスタ読み込み
// ------------------------------
let master = {};

fetch("master.json")
  .then(response => response.json())
  .then(data => {
    master = data;
    console.log("商品マスタ読み込み完了", master);
  });

// ------------------------------
// 商品コード → 自動補完
// ------------------------------
function fillFormByCode(code) {
  if (code.length < 5) return;

  const item = master[code];

  if (!item) {
    alert("商品コードがマスタにありません: " + code);
    return;
  }

  document.getElementById("name").value = item.name;
  document.getElementById("price").value = item.price;
  document.getElementById("category").value = item.category;
}

// ------------------------------
// 行追加
// ------------------------------
let rows = [];

document.getElementById("addRowBtn").addEventListener("click", function () {
  const code = document.getElementById("code").value;
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;
  const category = document.getElementById("category").value;
  const qty = document.getElementById("qty").value;

  if (!code || !name || !price || !qty) {
    alert("必要な項目が入力されていません");
    return;
  }

  rows.push([code, name, price, category, qty]);

  const table = document.getElementById("dataTable");
  const tr = document.createElement("tr");

  [code, name, price, category, qty].forEach(v => {
    const td = document.createElement("td");
    td.textContent = v;
    tr.appendChild(td);
  });

  table.appendChild(tr);

  document.getElementById("code").value = "";
  document.getElementById("name").value = "";
  document.getElementById("price").value = "";
  document.getElementById("category").value = "";
  document.getElementById("qty").value = "";
});

// ------------------------------
// Excel 保存（連打防止付き）
// ------------------------------
document.getElementById("saveExcelBtn").addEventListener("click", function () {
  const btn = this;

  btn.disabled = true;
  btn.textContent = "保存中…";

  setTimeout(() => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["商品コード", "商品名", "単価", "カテゴリ", "数量"],
      ...rows
    ]);

    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "data.xlsx");

    btn.disabled = false;
    btn.textContent = "Excel保存（.xlsx）";
  }, 10);
});

// ------------------------------
// QR 読み取り（カメラ起動ボタン方式）
// ------------------------------
window.onload = function () {

  let qr = null;

  document.getElementById("startCameraBtn").addEventListener("click", function () {
    if (qr) return;

    qr = new Html5Qrcode("qr-reader");

    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        document.getElementById("qr-result").textContent = "読み取り: " + decodedText;
        document.getElementById("code").value = decodedText;
        fillFormByCode(decodedText);
      }
    );

    document.getElementById("startCameraBtn").disabled = true;
    document.getElementById("stopCameraBtn").disabled = false;
  });

  document.getElementById("stopCameraBtn").addEventListener("click", function () {
    if (!qr) return;

    qr.stop().then(() => {
      qr.clear();
      qr = null;

      document.getElementById("startCameraBtn").disabled = false;
      document.getElementById("stopCameraBtn").disabled = true;
    });
  });

};
