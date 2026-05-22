// ------------------------------
// 商品マスタ読み込み
// ------------------------------
let master = {};

fetch("master.json")
  .then(response => response.json())
  .then(data => {
    master = data;
    console.log("商品マスタ読み込み完了", master);

    // 商品マスタ一覧を画面に表示
    const masterTable = document.getElementById("masterTable");

    Object.keys(master).forEach(code => {
      const item = master[code];
      const tr = document.createElement("tr");

      [
        code,
        item.name,
        item.price,
        item.category1,
        item.category2,
        item.category3,
        item.category4,
        item.category5,
        item.category6,
        item.maker,
        item.unit
      ].forEach(v => {
        const td = document.createElement("td");
        td.textContent = v ?? "";
        tr.appendChild(td);
      });

      masterTable.appendChild(tr);
    });
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

  document.getElementById("category1").value = item.category1;
  document.getElementById("category2").value = item.category2;
  document.getElementById("category3").value = item.category3;
  document.getElementById("category4").value = item.category4;
  document.getElementById("category5").value = item.category5;
  document.getElementById("category6").value = item.category6;

  document.getElementById("maker").value = item.maker;
  document.getElementById("unit").value = item.unit;
}

// ------------------------------
// 行追加
// ------------------------------
let rows = [];

document.getElementById("addRowBtn").addEventListener("click", function () {
  const code = document.getElementById("code").value;
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;

  const c1 = document.getElementById("category1").value;
  const c2 = document.getElementById("category2").value;
  const c3 = document.getElementById("category3").value;
  const c4 = document.getElementById("category4").value;
  const c5 = document.getElementById("category5").value;
  const c6 = document.getElementById("category6").value;

  const maker = document.getElementById("maker").value;
  const unit = document.getElementById("unit").value;

  const qty = document.getElementById("qty").value;

  if (!code || !name || !price || !qty) {
    alert("必要な項目が入力されていません");
    return;
  }

  rows.push([code, name, price, c1, c2, c3, c4, c5, c6, maker, unit, qty]);

  const table = document.getElementById("dataTable");
  const tr = document.createElement("tr");

  [code, name, price, c1, c2, c3, c4, c5, c6, maker, unit, qty].forEach(v => {
    const td = document.createElement("td");
    td.textContent = v;
    tr.appendChild(td);
  });

  table.appendChild(tr);

  document.getElementById("code").value = "";
  document.getElementById("name").value = "";
  document.getElementById("price").value = "";
  document.getElementById("category1").value = "";
  document.getElementById("category2").value = "";
  document.getElementById("category3").value = "";
  document.getElementById("category4").value = "";
  document.getElementById("category5").value = "";
  document.getElementById("category6").value = "";
  document.getElementById("maker").value = "";
  document.getElementById("unit").value = "";
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
      ["商品コード", "商品名", "単価", "カテゴリ1", "カテゴリ2", "カテゴリ3", "カテゴリ4", "カテゴリ5", "カテゴリ6", "メーカー", "単位", "数量"],
      ...rows
    ]);

    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "data.xlsx");

    btn.disabled = false;
    btn.textContent = "Excel保存（.xlsx）";
  }, 10);
});

// ------------------------------
// QR 読み取り
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
