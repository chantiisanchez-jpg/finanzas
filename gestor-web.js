// Funciones del navegador que usa la app (desde Kotlin, en WebPlatform.kt y PdfWordExtractor.web.kt).
window.gestorWeb = {
  /** Pinta el fondo de la página con el color del tema y saca el cartel de "Cargando…". */
  setPageColor(css) {
    document.documentElement.style.background = css;
    document.body.style.background = css;
    document.querySelector('meta[name="theme-color"]').setAttribute("content", css);
    const loading = document.getElementById("loading");
    if (loading) loading.remove();
  },

  /** Menú de compartir del sistema; si no existe, copia el texto. */
  share(title, text) {
    if (navigator.share) {
      navigator.share({ title, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert("Informe copiado. Pegalo donde quieras compartirlo."));
    }
  },

  /** Abre el selector de archivos. Devuelve el PDF en base64, o null si se canceló. */
  pickPdf() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/pdf,.pdf";
      input.style.display = "none";
      document.body.appendChild(input);
      const done = (value) => { input.remove(); resolve(value); };
      input.addEventListener("cancel", () => done(null));
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return done(null);
        const reader = new FileReader();
        reader.onload = () => done(String(reader.result).split(",")[1] || "");
        reader.onerror = () => done(null);
        reader.readAsDataURL(file);
      });
      input.click();
    });
  },

  /** Lee un PDF (base64) con pdf.js y devuelve JSON: [{text, width, words: [{t, x0, x1, top}]}]. */
  async extractPdf(base64) {
    const pdfjs = await loadPdfJs();
    const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const doc = await pdfjs.getDocument({ data }).promise;
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const words = [];
      const pieces = [];
      for (const item of content.items) {
        if (!item.str || !item.str.trim()) continue;
        // Posición en la página con origen arriba a la izquierda (igual que PDFBox en Android).
        const m = pdfjs.Util.transform(viewport.transform, item.transform);
        const height = item.height || Math.hypot(m[2], m[3]);
        const x = m[4];
        const top = m[5] - height;
        const charWidth = item.str.length ? item.width / item.str.length : 0;
        pieces.push({ x, top, str: item.str });
        let start = -1;
        for (let i = 0; i <= item.str.length; i++) {
          const space = i === item.str.length || /\s/.test(item.str[i]);
          if (!space && start < 0) start = i;
          if (space && start >= 0) {
            words.push({ t: item.str.slice(start, i), x0: x + start * charWidth, x1: x + i * charWidth, top });
            start = -1;
          }
        }
      }
      pages.push({ text: joinLines(pieces), width: viewport.width, words });
    }
    return JSON.stringify(pages);
  },
};

/** Arma el texto de la página renglón por renglón, ordenado por posición. */
function joinLines(pieces) {
  pieces.sort((a, b) => a.top - b.top || a.x - b.x);
  const lines = [];
  for (const p of pieces) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.top - p.top) <= 3) line.items.push(p);
    else lines.push({ top: p.top, items: [p] });
  }
  return lines.map((l) => l.items.sort((a, b) => a.x - b.x).map((p) => p.str.trim()).join(" ")).join("\n");
}

let pdfJsPromise = null;
function loadPdfJs() {
  if (!pdfJsPromise) {
    const base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
    pdfJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = base + "pdf.min.js";
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      s.onerror = () => { pdfJsPromise = null; reject(new Error("Sin conexión para leer el PDF")); };
      document.head.appendChild(s);
    });
  }
  return pdfJsPromise;
}

// Guarda la app en el teléfono para que abra aunque no haya internet.
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
// Pide al navegador que no borre los datos guardados de la app.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
