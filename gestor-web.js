// Funciones del navegador que usa la app (desde Kotlin, en WebPlatform.kt y PdfWordExtractor.web.kt).
window.gestorWeb = {
  /** Se reemplaza al publicar: permite confirmar en Ajustes qué versión cargó el teléfono. */
  version: "11/11 14:45",

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

// ---------- Lectura de tickets (Tesseract, en el navegador) ----------
// La foto no se sube a ningún lado: Tesseract lee el texto en el propio teléfono. La primera vez baja
// el idioma español (unos MB) y queda guardado.
let tesseractPromise = null;
function loadTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => { tesseractPromise = null; reject(new Error("Sin conexión: la primera lectura de un ticket necesita internet.")); };
      document.head.appendChild(s);
    });
  }
  return tesseractPromise;
}

/** Achica la foto (lado mayor ≤ 2000 px), la pasa a grises y le sube el contraste: Tesseract lee mejor. */
function prepararFoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const p = data.data;
      for (let i = 0; i < p.length; i += 4) {
        const g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        const v = Math.max(0, Math.min(255, (g - 128) * 1.5 + 128));
        p[i] = p[i + 1] = p[i + 2] = v;
      }
      ctx.putImageData(data, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo abrir la foto.")); };
    img.src = url;
  });
}

/** Abre la cámara (o las fotos) y devuelve las palabras leídas en JSON, o null si se canceló. */
window.gestorWeb.scanReceipt = (camera, onStart) => new Promise((resolve, reject) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  if (camera) input.setAttribute("capture", "environment");
  input.style.display = "none";
  document.body.appendChild(input);
  input.addEventListener("cancel", () => { input.remove(); resolve(null); });
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return resolve(null);
    onStart();
    try {
      const [Tesseract, canvas] = await Promise.all([loadTesseract(), prepararFoto(file)]);
      const { data } = await Tesseract.recognize(canvas, "spa");
      resolve(JSON.stringify((data.words || []).map((w) => ({ t: w.text, x0: w.bbox.x0, x1: w.bbox.x1, top: w.bbox.y0, bottom: w.bbox.y1 }))));
    } catch (e) {
      reject(new Error(e && e.message ? e.message : "No se pudo leer la foto."));
    }
  });
  input.click();
});

// ---------- Campos de texto nativos en Safari de iPhone ----------
// En Safari de iOS 27 el campo de texto de la app (dibujado en el lienzo) no logra abrir el teclado.
// Al tocar un campo, se pone encima un <input> común del navegador, que Safari sí abre en el mismo
// toque; lo que se escribe se le pasa a la app. Fuera de iPhone/iPad no se usa.
const ES_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const campos = new Map(); // id → { onInput, value, kind, rect }  (kind: 0 texto, 1 decimal, 2 monto grande)
let editor = null; // { id, input }

Object.assign(window.gestorWeb, {
  fieldRegister(id, onInput) { campos.set(id, { onInput, value: "", kind: 0, rect: null }); },
  fieldUnregister(id) {
    campos.delete(id);
    if (editor && editor.id === id) cerrarEditor();
  },
  fieldValue(id, value, kind) {
    const c = campos.get(id);
    if (!c) return;
    c.value = value;
    c.kind = kind;
    if (editor && editor.id === id && editor.input.value !== value) editor.input.value = value;
  },
  fieldRect(id, left, top, right, bottom) {
    const c = campos.get(id);
    if (!c) return;
    c.rect = [left, top, right, bottom];
    if (editor && editor.id === id) ubicar(editor.input, c.rect);
  },
});

/** Posición en la página (px CSS) de un rectángulo del lienzo (px del lienzo). */
function rectEnPagina(rect) {
  const box = document.getElementById("app").getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return { left: box.left + rect[0] / dpr, top: box.top + rect[1] / dpr, width: (rect[2] - rect[0]) / dpr, height: (rect[3] - rect[1]) / dpr };
}

function ubicar(input, rect) {
  const r = rectEnPagina(rect);
  Object.assign(input.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
}

function campoEn(x, y) {
  const app = document.getElementById("app");
  if (!app) return null;
  const box = app.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const px = (x - box.left) * dpr, py = (y - box.top) * dpr;
  for (const [id, c] of campos) {
    const r = c.rect;
    if (r && px >= r[0] && px <= r[2] && py >= r[1] && py <= r[3]) return id;
  }
  return null;
}

function temaOscuro() {
  const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
  if (!m) return false;
  const [r, g, b] = m.map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function abrirEditor(id) {
  cerrarEditor();
  const c = campos.get(id);
  if (!c || !c.rect) return;
  const oscuro = temaOscuro();
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = c.kind === 0 ? "text" : "decimal";
  input.autocomplete = "off";
  input.setAttribute("autocorrect", c.kind === 0 ? "on" : "off");
  input.setAttribute("autocapitalize", c.kind === 0 ? "sentences" : "off");
  input.value = c.value;
  input.style.cssText = [
    "position:fixed", "z-index:10", "box-sizing:border-box", "margin:0", "outline:none",
    "border-radius:12px", "padding:0 16px", "-webkit-appearance:none",
    "font-family:-apple-system,system-ui,sans-serif",
    c.kind === 2 ? "font-size:34px;font-weight:700;text-align:center" : "font-size:17px",
    oscuro ? "background:#1F2621;color:#ECF1EA;border:2px solid #C5F25A" : "background:#FFFFFF;color:#101410;border:2px solid #1D6247",
  ].join(";");
  ubicar(input, c.rect);
  input.addEventListener("input", () => {
    const cur = campos.get(id);
    if (!cur) return;
    cur.value = input.value;
    cur.onInput(input.value);
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
  input.addEventListener("blur", () => setTimeout(() => { if (editor && editor.input === input) cerrarEditor(); }, 0));
  document.body.appendChild(input);
  editor = { id, input };
  input.focus();
  try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
}

function cerrarEditor() {
  if (!editor) return;
  const e = editor;
  editor = null;
  e.input.remove();
}

/** La app no recibe el final del toque sobre un campo: se le avisa que se canceló, así no lo procesa. */
function cancelarParaLaApp(e, tipo) {
  // El lienzo de la app está dentro de un shadow DOM: el aviso va al elemento real, no al contenedor.
  const destino = (e.composedPath && e.composedPath()[0]) || e.target;
  try {
    if (tipo === "touch") {
      destino.dispatchEvent(new TouchEvent("touchcancel", {
        bubbles: true, cancelable: true, changedTouches: Array.from(e.changedTouches), touches: [], targetTouches: [],
      }));
    } else {
      destino.dispatchEvent(new PointerEvent("pointercancel", {
        bubbles: true, pointerId: e.pointerId, pointerType: e.pointerType, clientX: e.clientX, clientY: e.clientY, isPrimary: e.isPrimary,
      }));
    }
  } catch (err) {}
}

if (ES_IOS) {
  let inicio = null;
  const esToque = (x, y) => inicio && Math.hypot(x - inicio.x, y - inicio.y) <= 10;
  window.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    inicio = t ? { x: t.clientX, y: t.clientY } : null;
  }, { capture: true, passive: true });
  window.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "touch" || (editor && e.target === editor.input)) return;
    if (!esToque(e.clientX, e.clientY) || campoEn(e.clientX, e.clientY) === null) return;
    e.stopImmediatePropagation();
    cancelarParaLaApp(e, "pointer");
  }, { capture: true });
  window.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    if (!t || (editor && e.target === editor.input)) return;
    const id = esToque(t.clientX, t.clientY) ? campoEn(t.clientX, t.clientY) : null;
    if (id === null) {
      // Tocar afuera cierra el teclado.
      if (editor && esToque(t.clientX, t.clientY)) editor.input.blur();
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    cancelarParaLaApp(e, "touch");
    abrirEditor(id);
  }, { capture: true, passive: false });
}

// Guarda la app en el teléfono para que abra aunque no haya internet.
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
// Pide al navegador que no borre los datos guardados de la app.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
