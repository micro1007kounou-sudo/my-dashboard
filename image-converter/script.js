// =======================================
// PDF.js worker 設定（PDF → 画像で使用）
// =======================================
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';


// =======================================
// 画像 → 画像（PNG↔JPG）ボタン
// =======================================
document.getElementById("btnPngToJpg").onclick = () => {
  document.getElementById("inputPngToJpg").click();
};

document.getElementById("btnJpgToPng").onclick = () => {
  document.getElementById("inputJpgToPng").click();
};


// =======================================
// 画像 → PDF（PNG/JPG → PDF）ボタン
// =======================================
document.getElementById("btnPngToPdf").onclick = () => {
  document.getElementById("inputPngToPdf").click();
};

document.getElementById("btnJpgToPdf").onclick = () => {
  document.getElementById("inputJpgToPdf").click();
};


// =======================================
// PDF → 画像（PDF → PNG/JPG）ボタン
// =======================================
document.getElementById("btnPdfToPng").onclick = () => {
  document.getElementById("inputPdfToPng").click();
};

document.getElementById("btnPdfToJpg").onclick = () => {
  document.getElementById("inputPdfToJpg").click();
};

// =======================================
// 共通ユーティリティ関数
// =======================================

// ---------------------------------------
// DataURL → Blob 変換
// 1. DataURL を "ヘッダー,本体" に分割
// 2. Base64 をデコードしてバイナリ化
// 3. Blob として返す（MIME を維持）
// ---------------------------------------
function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bin = atob(parts[1]);
  const len = bin.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) buffer[i] = bin.charCodeAt(i);
  return new Blob([buffer], { type: mime });
}
// // ---------------------------------------
// // DataURL → Blob（MIME を指定するバージョン）
// // 1. DataURL の Base64 部分をデコード
// // 2. Uint8Array に詰めてバイナリ化
// // 3. 指定 MIME の Blob を返す
// // ---------------------------------------
// function dataURLtoBlob(dataURL, mime) {
//   const bin = atob(dataURL.split(',')[1]);
//   const len = bin.length;
//   const buffer = new Uint8Array(len);
//   for (let i = 0; i < len; i++) buffer[i] = bin.charCodeAt(i);
//   return new Blob([buffer], { type: mime });
// }

// ---------------------------------------
// 変換後のファイル名を生成
// 元ファイル名 + "_converted" + 拡張子
// ---------------------------------------
function getConvertedName(file, newExt) {
  const base = file.name.replace(/\.[^/.]+$/, "");
  return base + "_converted." + newExt;
}


// =======================================
// PNG → JPG 変換処理
// 1. PNG を canvas に描画
// 2. canvas.toDataURL("image/jpeg") で JPEG 化
// 3. Blob に変換してダウンロード or 別タブ表示
// =======================================
document.getElementById("inputPngToJpg").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    // PNG をキャンバスに描画
    ctx.drawImage(img, 0, 0);

    // JPEG として再エンコード
    const jpgData = canvas.toDataURL("image/jpeg", 0.92);

    // 変換後のファイル名
    const convertedName = getConvertedName(file, "jpg");

    // 元名 → 変換後名 表示
    const nameBox = document.getElementById("previewFilename");
    nameBox.textContent = `${file.name} → ${convertedName}`;
    nameBox.style.display = "block";

    // プレビュー表示
    const preview = document.getElementById("previewImage");
    preview.src = jpgData;
    preview.style.display = "block";

    // ボタン表示
    const dlBtn = document.getElementById("downloadBtn");
    const openBtn = document.getElementById("openNewTabBtn");
    dlBtn.style.display = "inline-block";
    openBtn.style.display = "inline-block";

    // ダウンロード
    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = jpgData;
      a.download = convertedName;
      a.click();
    };

    // 別タブで開く（画像ビューア風）
    openBtn.onclick = () => {
      const blob = dataURLtoBlob(jpgData);
      const url = URL.createObjectURL(blob);

      const newTab = window.open();
      newTab.document.write(`
        <html>
          <head><meta charset="utf-8"></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#222;">
            <img src="${url}" style="max-width:100%;max-height:100%;">
          </body>
        </html>
      `);
      newTab.document.close();
    };
  };
});


// =======================================
// JPG → PNG 変換処理
// 1. JPG を canvas に描画
// 2. canvas.toDataURL("image/png") で PNG 化
// 3. Blob に変換してダウンロード or 別タブ表示
// =======================================
document.getElementById("inputJpgToPng").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    // JPG をキャンバスに描画
    ctx.drawImage(img, 0, 0);

    // PNG データ生成
    const pngData = canvas.toDataURL("image/png");

    // 変換後のファイル名
    const convertedName = getConvertedName(file, "png");

    // 元名 → 変換後名 表示
    const nameBox = document.getElementById("previewFilename");
    nameBox.textContent = `${file.name} → ${convertedName}`;
    nameBox.style.display = "block";

    // プレビュー表示
    const preview = document.getElementById("previewImage");
    preview.src = pngData;
    preview.style.display = "block";

    // ボタン表示
    const dlBtn = document.getElementById("downloadBtn");
    const openBtn = document.getElementById("openNewTabBtn");
    dlBtn.style.display = "inline-block";
    openBtn.style.display = "inline-block";

    // ダウンロード
    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = pngData;
      a.download = convertedName;
      a.click();
    };

    // 別タブで開く（画像ビューア風）
    openBtn.onclick = () => {
      const blob = dataURLtoBlob(pngData); // ← PNG の正しい Blob 化
      const url = URL.createObjectURL(blob);

      const newTab = window.open();
      newTab.document.write(`
        <html>
          <head><meta charset="utf-8"></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#222;">
            <img src="${url}" style="max-width:100%;max-height:100%;">
          </body>
        </html>
      `);
      newTab.document.close();
    };
  };
});

// =======================================
// PNG → PDF 変換処理
// 1. PNG を canvas に描画
// 2. jsPDF に画像を追加して PDF 化
// 3. Blob にしてダウンロード or 別タブ表示
// =======================================
document.getElementById("inputPngToPdf").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = async () => {
    // PDF 用のキャンバス（プレビュー兼用）
    const canvas = document.getElementById("pdfPreviewCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    // PNG をキャンバスに描画
    ctx.drawImage(img, 0, 0);

    // jsPDF で PDF 生成（画像サイズに合わせてページサイズを設定）
    const pdf = new jspdf.jsPDF({
      orientation: img.width > img.height ? "landscape" : "portrait",
      unit: "px",
      format: [img.width, img.height]
    });

    pdf.addImage(canvas, "PNG", 0, 0, img.width, img.height);

    // PDF を Blob に変換
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // 変換後のファイル名
    const convertedName = getConvertedName(file, "pdf");

    // 元名 → 変換後名 表示
    const nameBox = document.getElementById("previewFilename");
    nameBox.textContent = `${file.name} → ${convertedName}`;
    nameBox.style.display = "block";

    // プレビュー切り替え（画像は非表示、PDFキャンバスを表示）
    document.getElementById("previewImage").style.display = "none";
    canvas.style.display = "block";

    // ボタン表示
    const dlBtn = document.getElementById("downloadBtn");
    const openBtn = document.getElementById("openNewTabBtn");
    dlBtn.style.display = "inline-block";
    openBtn.style.display = "inline-block";

    // ダウンロード
    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = convertedName;
      a.click();
    };

    // 別タブで開く
    openBtn.onclick = () => {
      window.open(pdfUrl, "_blank");
    };
  };
});
// =======================================
// JPG → PDF 変換処理
// 1. JPG を canvas に描画
// 2. jsPDF に JPEG として追加して PDF 化
// 3. Blob にしてダウンロード or 別タブ表示
// =======================================
document.getElementById("inputJpgToPdf").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = async () => {
    // PDF 用のキャンバス（プレビュー兼用）
    const canvas = document.getElementById("pdfPreviewCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    // JPG をキャンバスに描画
    ctx.drawImage(img, 0, 0);

    // jsPDF で PDF 生成（画像サイズに合わせてページサイズを設定）
    const pdf = new jspdf.jsPDF({
      orientation: img.width > img.height ? "landscape" : "portrait",
      unit: "px",
      format: [img.width, img.height]
    });

    // JPEG として PDF に追加
    pdf.addImage(canvas, "JPEG", 0, 0, img.width, img.height);

    // PDF を ArrayBuffer → Blob に変換
    const arrayBuffer = pdf.output("arraybuffer");
    const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // 変換後のファイル名
    const convertedName = getConvertedName(file, "pdf");

    // 元名 → 変換後名 表示
    const nameBox = document.getElementById("previewFilename");
    nameBox.textContent = `${file.name} → ${convertedName}`;
    nameBox.style.display = "block";

    // プレビュー切り替え（画像は非表示、PDFキャンバスを表示）
    document.getElementById("previewImage").style.display = "none";
    canvas.style.display = "block";

    // ボタン表示
    const dlBtn = document.getElementById("downloadBtn");
    const openBtn = document.getElementById("openNewTabBtn");
    dlBtn.style.display = "inline-block";
    openBtn.style.display = "inline-block";

    // ダウンロード
    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = convertedName;
      a.click();
    };

    // 別タブで開く（PDF ビューア）
    openBtn.onclick = () => {
      window.open(pdfUrl, "_blank");
    };
  };
});

// =======================================
// PDF → PNG 変換処理
// 1. PDF.js でページをレンダリング
// 2. canvas.toDataURL("image/png") で PNG 化
// 3. 1ページ or 全ページ ZIP の2モード対応
// =======================================
document.getElementById("inputPdfToPng").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const fileReader = new FileReader();
  fileReader.readAsArrayBuffer(file);

  fileReader.onload = async () => {
    const typedarray = new Uint8Array(fileReader.result);

    // PDF.js で読み込み
    const pdf = await pdfjsLib.getDocument(typedarray).promise;

    // 変換モード取得（single / all）
    const mode = document.querySelector('input[name="pdfMode"]:checked').value;

    // 元ファイル名（拡張子なし）
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    // プレビュー用 canvas
    const canvasPreview = document.getElementById("pdfPreviewCanvas");
    const ctxPreview = canvasPreview.getContext("2d");

    // ファイル名表示エリア
    const nameBox = document.getElementById("previewFilename");

    // 画像プレビューは非表示
    document.getElementById("previewImage").style.display = "none";

    // ボタン
    const dlBtn = document.getElementById("downloadBtn");
    const openBtn = document.getElementById("openNewTabBtn");

    // まずボタンを非表示にしておく
    dlBtn.style.display = "none";
    openBtn.style.display = "none";

    // -----------------------------
    // 🟦 1ページだけ変換（single）
    // -----------------------------
    if (mode === "single") {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });

      canvasPreview.width = viewport.width;
      canvasPreview.height = viewport.height;

      await page.render({
        canvasContext: ctxPreview,
        viewport: viewport
      }).promise;

      // PNG データ生成
      const pngData = canvasPreview.toDataURL("image/png");

      const convertedName = `${baseName}_converted.png`;

      // ファイル名表示
      nameBox.textContent = `${file.name} → ${convertedName}`;
      nameBox.style.display = "block";

      // プレビュー表示
      canvasPreview.style.display = "block";

      // ボタン表示
      dlBtn.style.display = "inline-block";
      openBtn.style.display = "inline-block";

      // ダウンロード
      dlBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = pngData;
        a.download = convertedName;
        a.click();
      };

      // 別タブで開く
      openBtn.onclick = () => {
        const blob = dataURLtoBlob(pngData, "image/png");
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      };

      return;
    }

    // -----------------------------
    // 🟩 全ページ ZIP 変換（all）
    // -----------------------------

    // 処理中メッセージ
    nameBox.textContent = `処理中…\nページ数が多いPDFは変換に時間がかかる場合があります。`;
    nameBox.style.display = "block";

    // プレビューは非表示
    canvasPreview.style.display = "none";

    if (mode === "all") {
      const zip = new JSZip();
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        const pngData = canvas.toDataURL("image/png");
        const base64 = pngData.split(",")[1];

        zip.file(`${baseName}_converted_${i}.png`, base64, { base64: true });
      }

      // ZIP 生成
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);

      // ダウンロードボタンを表示
      dlBtn.style.display = "inline-block";
      openBtn.style.display = "none"; // ZIP は開けない

      dlBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = zipUrl;
        a.download = `${baseName}_converted_all.zip`;
        a.click();
      };

      // プレビューは1ページ目だけ表示
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 2 });

      canvasPreview.width = viewport.width;
      canvasPreview.height = viewport.height;

      await firstPage.render({
        canvasContext: ctxPreview,
        viewport: viewport
      }).promise;

      nameBox.textContent = `${file.name} → ${baseName}_converted_all.zip`;
      nameBox.style.display = "block";

      canvasPreview.style.display = "block";

      // ZIP は別タブで開けないので openBtn は非表示のまま
      openBtn.style.display = "none";
    }
  };
});


// =======================================
// PDF → JPG 変換処理
// 1. PDF.js でページをレンダリング
// 2. canvas.toDataURL("image/jpeg") で JPG 化
// 3. 1ページ or 全ページ ZIP の2モード対応
// =======================================
document.getElementById("inputPdfToJpg").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const fileReader = new FileReader();
  fileReader.readAsArrayBuffer(file);

  fileReader.onload = async () => {
    const typedarray = new Uint8Array(fileReader.result);

    // PDF.js で読み込み
    const pdf = await pdfjsLib.getDocument(typedarray).promise;

    // 変換モード取得（single / all）
    const mode = document.querySelector('input[name="pdfMode"]:checked').value;

    // 元ファイル名（拡張子なし）
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    // プレビュー用 canvas
    const canvasPreview = document.getElementById("pdfPreviewCanvas");
    const ctxPreview = canvasPreview.getContext("2d");

    // ファイル名表示エリア
    const nameBox = document.getElementById("previewFilename");

    // 画像プレビューは非表示
    document.getElementById("previewImage").style.display = "none";

    // ボタン
    const dlBtn = document.getElementById("downloadBtn");
    const openBtn = document.getElementById("openNewTabBtn");

    // まずボタンを非表示にしておく
    dlBtn.style.display = "none";
    openBtn.style.display = "none";

    // -----------------------------
    // 🟦 1ページだけ変換（single）
    // -----------------------------
    if (mode === "single") {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });

      canvasPreview.width = viewport.width;
      canvasPreview.height = viewport.height;

      await page.render({
        canvasContext: ctxPreview,
        viewport: viewport
      }).promise;

      // JPG データ生成
      const jpgData = canvasPreview.toDataURL("image/jpeg", 0.92);

      const convertedName = `${baseName}_converted.jpg`;

      // ファイル名表示
      nameBox.textContent = `${file.name} → ${convertedName}`;
      nameBox.style.display = "block";

      // プレビュー表示
      canvasPreview.style.display = "block";

      // ボタン表示
      dlBtn.style.display = "inline-block";
      openBtn.style.display = "inline-block";

      // ダウンロード
      dlBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = jpgData;
        a.download = convertedName;
        a.click();
      };

      // 別タブで開く
      openBtn.onclick = () => {
        const blob = dataURLtoBlob(jpgData, "image/jpeg");
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      };

      return;
    }

    // -----------------------------
    // 🟩 全ページ ZIP 変換（all）
    // -----------------------------
    nameBox.textContent = `処理中…\nページ数が多いPDFは変換に時間がかかる場合があります。`;
    nameBox.style.display = "block";
    canvasPreview.style.display = "none";

    if (mode === "all") {
      const zip = new JSZip();
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        const jpgData = canvas.toDataURL("image/jpeg", 0.92);
        const base64 = jpgData.split(",")[1];

        zip.file(`${baseName}_converted_${i}.jpg`, base64, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);

      dlBtn.style.display = "inline-block";
      openBtn.style.display = "none";

      dlBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = zipUrl;
        a.download = `${baseName}_converted_all.zip`;
        a.click();
      };

      // プレビューは1ページ目だけ表示
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 2 });

      canvasPreview.width = viewport.width;
      canvasPreview.height = viewport.height;

      await firstPage.render({
        canvasContext: ctxPreview,
        viewport: viewport
      }).promise;

      nameBox.textContent = `${file.name} → ${baseName}_converted_all.zip`;
      nameBox.style.display = "block";

      canvasPreview.style.display = "block";
    }
  };
});

// ========================================================
// 📁 新規追加機能：超精密・名前順固定結合ロジック（完全修正版）
// ========================================================

// =======================================
// 自然な名前順（数字を正しく扱う）で並び替える関数
// 1. Intl.Collator を numeric:true で使用
// 2. "1,2,10" のような並びも正しくソート
// 3. 画像結合・PDF結合で共通利用
// =======================================
function robustFileSort(filesArray) {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return filesArray.sort((a, b) => collator.compare(a.name, b.name));
}

// =======================================
//  複数画像 → 1つのPDF（名前順）
// 1. ファイル名で自然ソート
// 2. 各画像をキャンバスに描画して PDF に追加
// 3. すべて結合して1つのPDFとして出力
// =======================================
document.getElementById("btnMultiImagesToPdf").onclick = () => {
  document.getElementById("inputMultiImagesToPdf").click();
};

document.getElementById("inputMultiImagesToPdf").addEventListener("change", async (e) => {
  let files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  // ★ 超精密ソートを実行
  files = robustFileSort(files);

  const nameBox = document.getElementById("previewFilename");
  const canvasPreview = document.getElementById("pdfPreviewCanvas");
  const dlBtn = document.getElementById("downloadBtn");
  const openBtn = document.getElementById("openNewTabBtn");

  // プレビュー初期化
  document.getElementById("previewImage").style.display = "none";
  canvasPreview.style.display = "none";
  dlBtn.style.display = "none";
  openBtn.style.display = "none";

  nameBox.textContent = `画像を名前順に結合中... (0 / ${files.length})`;
  nameBox.style.display = "block";

  let pdf = null;

  // ソート後の先頭ファイルの名前をベースにする
  const baseName = files[0].name.replace(/\.[^/.]+$/, "");

  const loadImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => resolve({ img, type: file.type });
    });
  };

  try {
    for (let i = 0; i < files.length; i++) {
      nameBox.textContent = `画像を名前順に結合中... (${i + 1} / ${files.length})`;
      
      const { img, type } = await loadImage(files[i]);
      const isJpg = type === "image/jpeg" || type === "image/jpg";

      // キャンバスに画像を描画（JPG は白背景を敷く）
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;

      if (isJpg) {
        tempCtx.fillStyle = "#ffffff";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      }
      tempCtx.drawImage(img, 0, 0);

      // PDF 初期化 or ページ追加
      if (pdf === null) {
        pdf = new jspdf.jsPDF({
          orientation: img.width > img.height ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height]
        });
      } else {
        pdf.addPage([img.width, img.height], img.width > img.height ? "l" : "p");
      }

      // JPG/PNG を判定して PDF に追加
      const formatParam = isJpg ? "JPEG" : "PNG";
      pdf.addImage(tempCanvas, formatParam, 0, 0, img.width, img.height);
    }

    // PDF 出力
    const arrayBuffer = pdf.output("arraybuffer");
    const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const convertedName = `${baseName}_combined.pdf`;

    nameBox.textContent = `${files.length}枚の画像を名前順で結合 ➔ ${convertedName}`;

    dlBtn.style.display = "inline-block";
    openBtn.style.display = "inline-block";

    // ダウンロード
    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = convertedName;
      a.click();
    };

    // 別タブで開く
    openBtn.onclick = () => {
      window.open(pdfUrl, "_blank");
    };

  } catch (error) {
    console.error(error);
    nameBox.textContent = "変換中にエラーが発生しました。";
  }
});

// =======================================
//  複数PDF → 1つのPDFに結合（名前順）
// 1. ファイル名で自然ソート
// 2. PDFLib で各PDFの全ページをコピー
// 3. すべて結合して1つのPDFとして出力
// =======================================
document.getElementById("btnMultiPdfToPdf").onclick = () => {
  document.getElementById("inputMultiPdfToPdf").click();
};

document.getElementById("inputMultiPdfToPdf").addEventListener("change", async (e) => {
  let files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  // ★ 超精密ソートを実行（自然な名前順）
  files = robustFileSort(files);

  const nameBox = document.getElementById("previewFilename");
  const canvasPreview = document.getElementById("pdfPreviewCanvas");
  const dlBtn = document.getElementById("downloadBtn");
  const openBtn = document.getElementById("openNewTabBtn");

  // プレビュー初期化
  document.getElementById("previewImage").style.display = "none";
  canvasPreview.style.display = "none";
  dlBtn.style.display = "none";
  openBtn.style.display = "none";

  nameBox.textContent = `PDFを名前順に結合中... (0 / ${files.length})`;
  nameBox.style.display = "block";

  // ソート後の先頭ファイルの名前をベースにする
  const baseName = files[0].name.replace(/\.[^/.]+$/, "");

  try {
    // 結合先PDFを作成
    const mergedPdf = await PDFLib.PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      nameBox.textContent = `PDFを名前順に結合中... (${i + 1} / ${files.length})`;

      const fileBuffer = await files[i].arrayBuffer();
      const srcPdf = await PDFLib.PDFDocument.load(fileBuffer);

      // 全ページをコピー
      const pageIndices = srcPdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndices);

      // 結合先に追加
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    // PDF 出力
    const mergedPdfBytes = await mergedPdf.save();
    const pdfBlob = new Blob([mergedPdfBytes], { type: "application/pdf" });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const convertedName = `${baseName}_merged.pdf`;

    nameBox.textContent = `${files.length}個のPDFを名前順で結合 ➔ ${convertedName}`;

    dlBtn.style.display = "inline-block";
    openBtn.style.display = "inline-block";

    // ダウンロード
    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = convertedName;
      a.click();
    };

    // 別タブで開く
    openBtn.onclick = () => {
      window.open(pdfUrl, "_blank");
    };

  } catch (error) {
    console.error(error);
    nameBox.textContent = "PDFの結合中にエラーが発生しました。";
  }
});

// =======================================
// PDF分割（ページごとにバラバラにしてZIP化）
// 1. PDFLib で1ページずつ切り出し
// 2. 各ページを個別PDFとして保存
// 3. ZIP にまとめて一括ダウンロード
// =======================================
document.getElementById("btnSplitPdf").onclick = () => {
  document.getElementById("inputSplitPdf").click();
};

document.getElementById("inputSplitPdf").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const nameBox = document.getElementById("previewFilename");
  const canvasPreview = document.getElementById("pdfPreviewCanvas");
  const dlBtn = document.getElementById("downloadBtn");
  const openBtn = document.getElementById("openNewTabBtn");

  // プレビュー初期化
  document.getElementById("previewImage").style.display = "none";
  canvasPreview.style.display = "none";
  dlBtn.style.display = "none";
  openBtn.style.display = "none";

  nameBox.textContent = `PDFを分割中...`;
  nameBox.style.display = "block";

  const baseName = file.name.replace(/\.[^/.]+$/, "");

  try {
    // ZIP 作成
    const zip = new JSZip();
    
    // PDF 読み込み
    const fileBuffer = await file.arrayBuffer();
    const srcPdf = await PDFLib.PDFDocument.load(fileBuffer);
    const totalPages = srcPdf.getPageCount();

    // 1ページずつ切り出し
    for (let i = 0; i < totalPages; i++) {
      nameBox.textContent = `PDFを分割中... (${i + 1} / ${totalPages} ページ)`;

      // 新しいPDFを作成
      const newSubPdf = await PDFLib.PDFDocument.create();
      
      // 指定ページをコピー
      const [copiedPage] = await newSubPdf.copyPages(srcPdf, [i]);
      newSubPdf.addPage(copiedPage);

      // 個別PDFとして保存
      const subPdfBytes = await newSubPdf.save();
      
      // ZIP に格納
      zip.file(`${baseName}_page_${i + 1}.pdf`, subPdfBytes);
    }

    // ZIP 生成
    nameBox.textContent = `ZIPファイルを圧縮中...`;
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipUrl = URL.createObjectURL(zipBlob);
    const convertedName = `${baseName}_split.zip`;

    // 完了表示
    nameBox.textContent = `${file.name}（全 ${totalPages} ページ）を分割しました ➔ ${convertedName}`;

    // ダウンロードボタン（ZIP は別タブ不可）
    dlBtn.style.display = "inline-block";
    openBtn.style.display = "none";

    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = convertedName;
      a.click();
    };

  } catch (error) {
    console.error(error);
    nameBox.textContent = "PDFの分割中にエラーが発生しました。";
  }
  
  // 連続処理のためにインプットをリセット
  e.target.value = "";
});

// =======================================
// PDF分割（PNG画像としてバラバラにしてZIP化）
// 1. PDF.js で各ページをレンダリング
// 2. PNG に変換して ZIP に格納
// 3. 全ページをまとめて一括ダウンロード
// =======================================
document.getElementById("btnSplitPdfToPng").onclick = () => {
  document.getElementById("inputSplitPdfToPng").click();
};

document.getElementById("inputSplitPdfToPng").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const nameBox = document.getElementById("previewFilename");
  const canvasPreview = document.getElementById("pdfPreviewCanvas");
  const dlBtn = document.getElementById("downloadBtn");

  // プレビュー初期化
  document.getElementById("previewImage").style.display = "none";
  canvasPreview.style.display = "none";
  dlBtn.style.display = "none";

  nameBox.textContent = `PDFを画像に変換・分割中...`;
  nameBox.style.display = "block";

  const baseName = file.name.replace(/\.[^/.]+$/, "");

  try {
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);

    fileReader.onload = async () => {
      const typedarray = new Uint8Array(fileReader.result);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;
      const totalPages = pdf.numPages;
      const zip = new JSZip();

      // 1ページずつ PNG に変換
      for (let i = 1; i <= totalPages; i++) {
        nameBox.textContent = `画像に変換中... (${i} / ${totalPages} ページ)`;

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 }); // 高画質レンダリング

        // 一時キャンバスに描画
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;

        await page.render({
          canvasContext: tempCtx,
          viewport: viewport
        }).promise;

        // PNG として ZIP に追加
        const pngData = tempCanvas.toDataURL("image/png");
        const base64 = pngData.split(",")[1];
        zip.file(`${baseName}_page_${i}.png`, base64, { base64: true });
      }

      // ZIP 生成
      nameBox.textContent = `ZIPファイルを圧縮中...`;
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const convertedName = `${baseName}_images_split.zip`;

      // 完了表示
      nameBox.textContent = `${file.name} を ${totalPages} 枚のPNG画像に分割しました ➔ ${convertedName}`;
      dlBtn.style.display = "inline-block";

      // ダウンロード
      dlBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = zipUrl;
        a.download = convertedName;
        a.click();
      };
    };

  } catch (error) {
    console.error(error);
    nameBox.textContent = "画像の分割中にエラーが発生しました。";
  }

  // 連続処理のためにインプットをリセット
  e.target.value = "";
});

// =======================================
// 画像リサイズ（複数枚一括・拡大対応＆5000px上限）
// 1. 横幅指定 or 目標容量指定の2モード
// 2. 各画像を Canvas でリサイズして ZIP に格納
// 3. JPG は白背景を敷いて劣化を抑える
// =======================================

// ラジオボタンの切り替えで入力欄を見え隠れさせる
document.getElementsByName("resizeMode").forEach(radio => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "width") {
      document.getElementById("inputWidthWrapper").style.display = "inline";
      document.getElementById("inputSizeWrapper").style.display = "none";
    } else {
      document.getElementById("inputWidthWrapper").style.display = "none";
      document.getElementById("inputSizeWrapper").style.display = "inline";
    }
  });
});

document.getElementById("btnResizeImage").onclick = () => {
  document.getElementById("inputResizeImage").click();
};

document.getElementById("inputResizeImage").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  const nameBox = document.getElementById("previewFilename");
  const preview = document.getElementById("previewImage");
  const canvasPreview = document.getElementById("pdfPreviewCanvas");
  const dlBtn = document.getElementById("downloadBtn");
  const openBtn = document.getElementById("openNewTabBtn");

  const isWidthMode = document.getElementById("modeWidth").checked;

  // プレビュー初期化
  preview.style.display = "none";
  canvasPreview.style.display = "none";
  dlBtn.style.display = "none";
  openBtn.style.display = "none";

  nameBox.textContent = `画像を処理中... (0 / ${files.length})`;
  nameBox.style.display = "block";

  // ZIP 準備
  const zip = new JSZip();
  const baseZipName = files[0].name.replace(/\.[^/.]+$/, "");

  // 画像読み込みヘルパー
  const loadImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => resolve(img);
    });
  };

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      nameBox.textContent = `画像を最適化中... (${i + 1} / ${files.length} 枚目)`;

      const img = await loadImage(file);
      let finalDataUrl = "";
      let finalWidth = img.width;
      const isJpg = file.type === "image/jpeg" || file.type === "image/jpg";
      const mimeType = file.type;

      // 指定幅でリサイズする共通関数
      const convertToSize = (w) => {
        const aspectRatio = img.height / img.width;
        const h = Math.round(w * aspectRatio);

        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = w;
        tempCanvas.height = h;

        if (isJpg) {
          tempCtx.fillStyle = "#ffffff";
          tempCtx.fillRect(0, 0, w, h);
        }

        // 高品質リサイズ
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = "high";

        tempCtx.drawImage(img, 0, 0, w, h);

        const dataUrl = tempCanvas.toDataURL(mimeType, isJpg ? 0.85 : undefined);
        const stringLength = dataUrl.length - dataUrl.indexOf(',') - 1;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624;
        
        return { dataUrl, sizeInBytes, w };
      };

      if (isWidthMode) {
        // 【A】横幅指定モード
        let targetWidth = parseInt(document.getElementById("resizeWidth").value, 10);
        if (!targetWidth || targetWidth <= 0) targetWidth = 1200;

        // 拡大OKだが 5000px 上限
        if (targetWidth > 5000) targetWidth = 5000;

        const result = convertToSize(targetWidth);
        finalDataUrl = result.dataUrl;
        finalWidth = result.w;

      } else {
        // 【B】容量指定モード（MB）
        let targetMb = parseFloat(document.getElementById("resizeMaxSize").value);
        if (!targetMb || targetMb <= 0) targetMb = 1.0;
        const targetBytes = targetMb * 1024 * 1024;

        let currentWidth = img.width;
        let attempts = 0;

        if (currentWidth > 5000) currentWidth = 5000;

        let lastResult = convertToSize(currentWidth);

        while (lastResult.sizeInBytes > targetBytes && attempts < 15) {
          currentWidth = Math.round(currentWidth * 0.9);
          if (currentWidth < 100) break;
          lastResult = convertToSize(currentWidth);
          attempts++;
        }

        finalDataUrl = lastResult.dataUrl;
        finalWidth = lastResult.w;
      }

      // ZIP に追加
      const base64Data = finalDataUrl.split(",")[1];
      const ext = file.name.split('.').pop();
      const baseFileName = file.name.replace(/\.[^/.]+$/, "");
      const modeLabel = isWidthMode ? `${finalWidth}px` : "resized";

      zip.file(`${baseFileName}_${modeLabel}.${ext}`, base64Data, { base64: true });
    }

    // ZIP 生成
    nameBox.textContent = `ZIPファイルをまとめています...`;
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipUrl = URL.createObjectURL(zipBlob);
    const convertedZipName = `${baseZipName}_resized_images.zip`;

    // 完了表示
    nameBox.textContent = `完了！ ${files.length}枚の画像を処理しました ➔ ${convertedZipName}`;
    
    dlBtn.style.display = "inline-block";
    openBtn.style.display = "none";

    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = convertedZipName;
      a.click();
    };

  } catch (error) {
    console.error(error);
    nameBox.textContent = "一括リサイズ中にエラーが発生しました。";
  }

  e.target.value = "";
});

// =======================================
// モーダル自動開閉システム
// 1. downloadBtn の表示変化を監視して自動でモーダルを開く
// 2. × ボタンで閉じると同時に状態リセット
// 3. 背景クリック閉じは任意でON/OFF可能
// =======================================

// ダウンロードボタンが出現したら、モーダルを自動で開く監視カメラ
const modalObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === 'style') {
      const downloadBtn = document.getElementById('downloadBtn');
      const modal = document.getElementById('customModal');
      
      // ダウンロードボタンが表示状態になったらモーダルをドカンと出す
      if (downloadBtn && downloadBtn.style.display !== 'none') {
        modal.style.display = 'flex';
      }
    }
  });
});

const dlBtnTarget = document.getElementById('downloadBtn');
if (dlBtnTarget) {
  modalObserver.observe(dlBtnTarget, { attributes: true });
}

// 「×」ボタンを押したらモーダルを閉じる処理
document.getElementById('btnModalClose').onclick = () => {
  document.getElementById('customModal').style.display = 'none';
  // 次回また動くように、ダウンロードボタンとファイル名をリセット（非表示に）しておく
  document.getElementById('downloadBtn').style.display = 'none';
  document.getElementById('previewFilename').style.display = 'none';
};

// 背景の黒い部分をクリックしても閉じられるようにする（親切設計）
// document.getElementById('customModal').onclick = (e) => {
//   if (e.target === document.getElementById('customModal')) {
//     document.getElementById('btnModalClose').click();
//   }
// };
