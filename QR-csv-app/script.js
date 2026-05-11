let master = {};
let rows = [];

// master.json 読み込み
fetch("master.json")
  .then(res => res.json())
  .then(data => {
    master = data;
    console.log("商品マスタ読み込み完了", master);
  });

function fillFormByCode(code) {
  // 5桁揃うまでは何もしない
  if (code.length < 5) return;

  const item = master[code];

  // 5桁揃ってマスタに無い場合だけアラート
  if (!item) {
    alert("商品コードがマスタにありません: " + code);
    return;
  }

  // 自動補完
  document.getElementById("name").value = item.name;
  document.getElementById("price").value = item.price;
  document.getElementById("category").value = item.category;
}


// 行追加
function addRow() {
  const code = document.getElementById("code").value;
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;
  const category = document.getElementById("category").value;
  const qty = document.getElementById("qty").value;

  const table = document.getElementById("table");
  const tr = document.createElement("tr");

  [code, name, price, category, qty].forEach(v => {
    const td = document.createElement("td");
    td.textContent = v;
    tr.appendChild(td);
  });

  table.appendChild(tr);

  rows.push([code, name, price, category, qty]);
}

// CSV保存（UTF-8）
document.getElementById("saveUtf8Btn").addEventListener("click", function () {
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "data_utf8.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// CSV保存（Shift-JIS）
document.getElementById("saveSjisBtn").addEventListener("click", function () {
  const csv = rows.map(r => r.join(",")).join("\n");

  // Shift-JIS 変換（encoding-japanese を使う場合）
  const sjisArray = Encoding.convert(
    Encoding.stringToCode(csv),
    "SJIS",
    "UNICODE"
  );

  const blob = new Blob([new Uint8Array(sjisArray)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "data_sjis.csv";
  a.click();
  URL.revokeObjectURL(url);
});
