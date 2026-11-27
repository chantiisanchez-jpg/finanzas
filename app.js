/*
 * Gestor financiero — versión web en HTML (anda en cualquier iPhone, sin WebGL).
 * Lee y guarda exactamente el mismo JSON que la app (FinanceStorage.kt) en localStorage, y repite las
 * mismas reglas de saldos de FinanceViewModel.kt: un gasto resta del saldo de su cuenta, un ingreso suma,
 * editar revierte el efecto anterior y aplica el nuevo, borrar lo revierte.
 * Escrito sin sintaxis moderna (nada de ?. ni ??) para que abra también en iPhones viejos.
 */
(function () {
  "use strict";

  var CLAVE = "finanzas_pro.data_v1";
  var VERSION = "26/11 21:53";
  var CAT_GASTO = ["Alimentos", "Transporte", "Servicios", "Salud", "Entretenimiento", "Educación", "Hogar", "Otros"];
  var CAT_INGRESO = ["Sueldo", "Honorarios", "Ventas", "Inversiones", "Otros"];
  var COLORES = {
    "alimentos": "#F97316", "transporte": "#3B82F6", "servicios": "#EAB308", "salud": "#EF4444",
    "entretenimiento": "#A855F7", "educación": "#06B6D4", "educacion": "#06B6D4", "hogar": "#84CC16",
    "otros": "#8B95A1", "sueldo": "#22C55E", "honorarios": "#14B8A6", "ventas": "#F59E0B", "inversiones": "#6366F1"
  };
  var EXTRA = ["#EC4899", "#0EA5E9", "#D946EF", "#10B981", "#F43F5E", "#8B5CF6", "#65A30D"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  // Paletas de color que puede elegir cada usuario (Ajustes → Color de la app). Los fondos y textos son
  // los mismos; cambia el color principal, la tarjeta de patrimonio y los detalles.
  var PALETAS = {
    AZUL: { nombre: "Azul", claro: ["#1E40AF", "#DCE7FF", "#061433", "#1E3A8A", "#93C5FD"], oscuro: ["#60A5FA", "#0B1A33", "#1E3A6B", "#15296B", "#070F24", "#93C5FD"] },
    VERDE: { nombre: "Verde", claro: ["#1D6247", "#DDF5C4", "#0E3B2C", "#1D6247", "#C5F25A"], oscuro: ["#C5F25A", "#10291E", "#22402F", "#1C4A35", "#10291E", "#C5F25A"] },
    TURQUESA: { nombre: "Turquesa", claro: ["#0F766E", "#D5F5F0", "#042F2E", "#0F766E", "#5EEAD4"], oscuro: ["#2DD4BF", "#042F2E", "#134E4A", "#115E59", "#021716", "#5EEAD4"] },
    VIOLETA: { nombre: "Violeta", claro: ["#5B21B6", "#EDE4FF", "#1E0B4B", "#5B21B6", "#C4B5FD"], oscuro: ["#A78BFA", "#1E0B4B", "#3B2370", "#3B1F7A", "#120827", "#C4B5FD"] },
    ROSA: { nombre: "Rosa", claro: ["#BE185D", "#FCE7F3", "#4A0A2A", "#9D174D", "#F9A8D4"], oscuro: ["#F472B6", "#4A0A2A", "#5E1A3D", "#831843", "#1F0512", "#F9A8D4"] },
    BORDO: { nombre: "Bordó", claro: ["#9F1239", "#FFE1E8", "#3B0716", "#881337", "#FDA4AF"], oscuro: ["#FB7185", "#3B0716", "#5C1A2C", "#6B1230", "#1F050D", "#FDA4AF"] },
    NARANJA: { nombre: "Naranja", claro: ["#C2410C", "#FFE7D6", "#431407", "#9A3412", "#FDBA74"], oscuro: ["#FB923C", "#431407", "#5A2A12", "#7C2D12", "#1F0A03", "#FDBA74"] },
    GRAFITO: { nombre: "Grafito", claro: ["#334155", "#E2E8F0", "#0F172A", "#334155", "#CBD5E1"], oscuro: ["#CBD5E1", "#0F172A", "#334155", "#1E293B", "#0B1120", "#E2E8F0"] }
  };
  var ORDEN_PALETAS = ["AZUL", "VERDE", "TURQUESA", "VIOLETA", "ROSA", "BORDO", "NARANJA", "GRAFITO"];

  // Cotizaciones de DolarApi (https://dolarapi.com, gratis y pública). Se usa el precio de venta.
  var DOLARES = [["oficial", "Oficial"], ["blue", "Blue"], ["bolsa", "MEP"], ["contadoconliqui", "CCL"], ["tarjeta", "Tarjeta"], ["", "Manual"]];
  function nombreDolar(casa) { for (var i = 0; i < DOLARES.length; i++) if (DOLARES[i][0] === casa) return DOLARES[i][1]; return "Manual"; }

  // Mismas reglas que importer/Categorizer.kt.
  var REGLAS_GASTO = [
    ["Alimentos", ["supermercado", "super ", "coto", "carrefour", "jumbo", "disco", "vea", "chango", "dia ", "mcdonald", "burger", "rappi", "pedidosya", "pedidos ya", "cafe", "restaurant", "resto", "panaderia", "almacen", "verduleria", "carniceria", "kiosco", "starbucks", "havanna", "heladeria", "mostaza", "buffet"]],
    ["Transporte", ["ypf", "shell", "axion", "puma", "nafta", "combustible", "uber", "cabify", "didi", "sube", "peaje", "estacionamiento", "taxi", "remis", "aerolineas", "flybondi", "jetsmart", "viaje con qr"]],
    ["Servicios", ["edenor", "edesur", "metrogas", "naturgy", "aysa", "telecentro", "personal", "claro", "movistar", "fibertel", "flow", "directv", "servicio", "factura", "recarga", "afip", "arba", "agip", "impuesto", "abl", "expensas", "internet", "celular", "nic.ar", "linea movil"]],
    ["Salud", ["farmacia", "farmacity", "osde", "swiss medical", "galeno", "medic", "clinica", "odontolog", "optica"]],
    ["Entretenimiento", ["netflix", "spotify", "disney", "hbo", "prime video", "youtube", "steam", "cine", "playstation", "xbox", "twitch", "ticketek", "entrada"]],
    ["Educación", ["colegio", "universidad", "facultad", "curso", "libreria", "udemy", "cuota escolar"]],
    ["Hogar", ["mercado libre", "mercadolibre", "easy", "sodimac", "ferreteria", "muebles", "hogar"]]
  ];
  var REGLAS_INGRESO = [
    ["Inversiones", ["rendimiento", "interes", "dividendo", "fondo", "plazo fijo", "fci"]],
    ["Sueldo", ["sueldo", "haberes", "salario", "nomina", "aguinaldo"]],
    ["Ventas", ["venta", "cobro", "liquidacion de dinero", "dinero liberado"]]
  ];

  var ICON = {
    gasto: '<svg viewBox="0 0 24 24"><path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z"/></svg>',
    ingreso: '<svg viewBox="0 0 24 24"><path d="M20 5.41 18.59 4 7 15.59V9H5v10h10v-2H8.41z"/></svg>',
    transferir: '<svg viewBox="0 0 24 24"><path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>',
    ojo: '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
    ojoNo: '<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.8 11.8 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2z"/></svg>',
    billetera: '<svg viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
    mas: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
    buscar: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
    divisas: '<svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>',
    importar: '<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11z"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path d="M19.5 3.5 18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V2l-1.5 1.5zM19 19a1 1 0 0 1-2 0v-3H8V5h11v14z"/></svg>'
  };

  // ---------- Utilidades ----------

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nuevoId(prefijo) { return prefijo + "_" + Date.now() + "_" + (1000 + Math.floor(Math.random() * 9000)); }
  function r2(v) { return Math.round(v * 100) / 100; }

  /** Igual que formatNumber de Format.kt: "1.234,56". */
  function numero(v, dec, agrupar) {
    var unidad = Math.pow(10, dec);
    var esc2 = Math.round(Math.abs(v) * unidad);
    var ent = String(Math.floor(esc2 / unidad));
    if (agrupar) ent = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    var frac = dec > 0 ? "," + String(esc2 % unidad).padStart(dec, "0") : "";
    return (v < 0 && esc2 !== 0 ? "-" : "") + ent + frac;
  }
  function plata(v, moneda, conSigno) {
    if (data.privacy) return "$ •••••";
    var signo = v < 0 ? "-" : (conSigno && v > 0 ? "+" : "");
    return signo + (moneda === "USD" ? "US$ " : "$") + numero(Math.abs(v), 2, true);
  }
  function plano(v) {
    var s = numero(v, 2, false);
    return s.indexOf(",") >= 0 ? s.replace(/0+$/, "").replace(/,$/, "") : s;
  }

  /** Igual que AmountParser: "1.500,50", "1500+2300*2". Devuelve null si no es un monto válido. */
  function leerMonto(raw) {
    var s = String(raw || "").replace(/\s/g, "").replace(/\$/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    if (!s) return null;
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(/,/g, ".");
    // Sin coma, "100.000" o "2.500.000" son miles (como se escribe en Argentina); "1.5" sigue siendo decimal.
    else s = s.replace(/\d{1,3}(?:\.\d{3})+(?![\d.])/g, function (m) { return m.replace(/\./g, ""); });
    var pos = 0;
    function num() {
      var ini = pos;
      while (pos < s.length && /[0-9.]/.test(s[pos])) pos++;
      if (ini === pos) throw new Error("num");
      var v = parseFloat(s.slice(ini, pos));
      if (isNaN(v)) throw new Error("num");
      return v;
    }
    function factor() {
      if (s[pos] === "-") { pos++; return -factor(); }
      if (s[pos] === "+") { pos++; return factor(); }
      if (s[pos] === "(") { pos++; var v = expr(); if (s[pos] !== ")") throw new Error(")"); pos++; return v; }
      return num();
    }
    function term() {
      var v = factor();
      while (s[pos] === "*" || s[pos] === "/") { var op = s[pos++]; var d = factor(); v = op === "*" ? v * d : v / d; }
      return v;
    }
    function expr() {
      var v = term();
      while (s[pos] === "+" || s[pos] === "-") { var op = s[pos++]; var d = term(); v = op === "+" ? v + d : v - d; }
      return v;
    }
    try {
      var v = expr();
      return pos === s.length && isFinite(v) ? v : null;
    } catch (e) { return null; }
  }
  function esExpresion(raw) { return /[0-9][+\-*/×÷][0-9]/.test(String(raw || "").replace(/\s/g, "")); }

  var ACENTOS = { "á": "a", "à": "a", "ä": "a", "â": "a", "ã": "a", "é": "e", "è": "e", "ë": "e", "ê": "e", "í": "i", "ì": "i", "ï": "i", "î": "i", "ó": "o", "ò": "o", "ö": "o", "ô": "o", "õ": "o", "ú": "u", "ù": "u", "ü": "u", "û": "u", "ñ": "n", "ç": "c" };
  function normalizar(s) { return String(s).toLowerCase().replace(/[^\u0000-\u007f]/g, function (c) { return ACENTOS[c] || c; }); }
  function claveComercio(s) { return normalizar(s).replace(/[^a-z ]/g, " ").split(" ").filter(Boolean).slice(0, 4).join(" "); }

  /** String.hashCode de Java, para que las categorías propias tengan el mismo color que en Android. */
  function hashJava(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h; }
  function colorCat(c) { var k = String(c).toLowerCase(); return COLORES[k] || EXTRA[(hashJava(k) & 0x7fffffff) % EXTRA.length]; }
  function iconoCat(c, tam) {
    var col = colorCat(c);
    return '<span class="icono" style="background:' + col + '22;color:' + col + (tam ? ";width:" + tam + "px;height:" + tam + "px" : "") + ';font-weight:800">' + esc(String(c).charAt(0).toUpperCase()) + "</span>";
  }

  // Fechas en texto "AAAA-MM-DD" (como en el JSON), siempre con la hora del teléfono.
  function hoy() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function sumarDias(f, n) { var p = f.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fechaLarga(f) { var p = f.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function fechaCorta(f) { var p = f.split("-"); return p[2] + " " + MESES_C[+p[1] - 1]; }
  function diaTitulo(f) {
    if (f === hoy()) return "Hoy";
    if (f === sumarDias(hoy(), -1)) return "Ayer";
    var p = f.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DIAS[d.getDay()].charAt(0).toUpperCase() + DIAS[d.getDay()].slice(1) + " " + (+p[2]) + " de " + MESES[+p[1] - 1];
  }
  function mesDe(f) { return f.slice(0, 7); }
  function mesActual() { return hoy().slice(0, 7); }
  function mesMover(m, n) { var y = +m.slice(0, 4), mm = +m.slice(5, 7) - 1 + n; y += Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12; return y + "-" + String(mm + 1).padStart(2, "0"); }
  function mesNombre(m) { var t = MESES[+m.slice(5, 7) - 1]; return t.charAt(0).toUpperCase() + t.slice(1) + " " + m.slice(0, 4); }
  function diasDelMes(m) { return new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(); }

  // ---------- Datos ----------

  var data, migrado = false;
  function inicial() {
    return {
      // La primera cuenta (predeterminada) es mixta: pesos y dólares, cada uno con su saldo.
      accounts: [{ id: nuevoId("acc"), name: "Principal", balance: 0, balanceUsd: 0, currency: "MIXTA", exclude: false, "default": true }],
      migMixta: true,
      transactions: [], customExpense: [], customIncome: [], usdRate: 1280, monthlyInflation: 3.8,
      themeMode: "SYSTEM", privacy: false, appLock: false, categoryMemory: {}, ipcOverrides: {}, investments: [], portfolioValue: 0
    };
  }
  function cargar() {
    var raw = null;
    try { raw = localStorage.getItem(CLAVE); } catch (e) {}
    var d = null;
    if (raw) { try { d = JSON.parse(raw); } catch (e) { d = null; } }
    if (!d || !d.accounts || !d.transactions) d = inicial();
    if (!d.accounts.length) d.accounts = inicial().accounts;
    d.customExpense = d.customExpense || [];
    d.customIncome = d.customIncome || [];
    d.exchanges = d.exchanges || [];
    d.categoryMemory = d.categoryMemory || {};
    if (typeof d.usdRate !== "number") d.usdRate = 1280;
    if (d.usdAuto === undefined) d.usdAuto = "oficial";
    if (!d.migMixta) {
      var pred = d.accounts.filter(function (a) { return a["default"]; })[0] || d.accounts[0];
      if (pred && pred.currency === "ARS") {
        d.transactions.forEach(function (t) { if (t.accountId === pred.id && !t.currency) t.currency = "ARS"; });
        pred.currency = "MIXTA";
        pred.balanceUsd = pred.balanceUsd || 0;
      }
      d.migMixta = true;
      migrado = true;
    }
    return d;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(data)); }
    catch (e) { aviso("No se pudo guardar en este iPhone: " + e.message); }
  }

  // Tipo de cuenta: "ARS" (solo pesos), "USD" (solo dólares) o "MIXTA" (las dos, con saldos separados:
  // balance = pesos, balanceUsd = dólares).
  function esMixta(a) { return !!a && a.currency === "MIXTA"; }
  function monedasDe(a) { return !a ? ["ARS"] : esMixta(a) ? ["ARS", "USD"] : [a.currency === "USD" ? "USD" : "ARS"]; }
  function saldo(a, m) { return esMixta(a) && m === "USD" ? (a.balanceUsd || 0) : a.balance; }
  function sumarSaldo(a, m, v) { if (esMixta(a) && m === "USD") a.balanceUsd = r2((a.balanceUsd || 0) + v); else a.balance = r2(a.balance + v); }
  function ponerSaldo(a, m, v) { if (esMixta(a) && m === "USD") a.balanceUsd = r2(v); else a.balance = r2(v); }
  function textoSaldo(a) { return esMixta(a) ? plata(a.balance) + " · " + plata(a.balanceUsd || 0, "USD") : plata(a.balance, a.currency); }
  function tipoCuenta(a) { return esMixta(a) ? "Mixta (pesos y dólares)" : a.currency === "USD" ? "Dólares" : "Pesos"; }
  /** Pesos y dólares reales de todas las cuentas que cuentan para el patrimonio. */
  function tenencias() {
    var p = 0, d = 0;
    data.accounts.forEach(function (a) {
      if (a.exclude) return;
      if (esMixta(a)) { p += a.balance; d += a.balanceUsd || 0; } else if (a.currency === "USD") d += a.balance; else p += a.balance;
    });
    return { pesos: p, dolares: d };
  }
  function cuenta(id) { for (var i = 0; i < data.accounts.length; i++) if (data.accounts[i].id === id) return data.accounts[i]; return null; }
  function cuentaPred() { for (var i = 0; i < data.accounts.length; i++) if (data.accounts[i]["default"]) return data.accounts[i]; return data.accounts[0]; }
  function aPesos(v, moneda) { return moneda === "USD" ? v * data.usdRate : v; }
  /** Moneda del movimiento: la elegida al cargarlo o, en los anteriores, la de su cuenta. */
  function monedaTx(t) { if (t.currency) return t.currency; var a = cuenta(t.accountId); return a ? a.currency : "ARS"; }
  /** Cotización guardada en el movimiento (la del día en que se hizo); si no tiene, la actual. */
  function cotizTx(t) { return t.rate > 0 ? t.rate : data.usdRate; }
  /** El movimiento en pesos, con su propia cotización. */
  function montoPesos(t) { return monedaTx(t) === "USD" ? t.amount * cotizTx(t) : t.amount; }
  /** Cuánto mueve el saldo de su cuenta, en la moneda de la cuenta (un gasto en US$ desde una cuenta en pesos descuenta pesos). */
  function montoEnCuenta(t) {
    var a = cuenta(t.accountId), mc = a ? a.currency : "ARS", mt = monedaTx(t);
    if (mc === "MIXTA") return t.amount;
    if (mc === mt) return t.amount;
    return mt === "USD" ? t.amount * cotizTx(t) : t.amount / cotizTx(t);
  }
  function categorias(tipo) { return tipo === "EXPENSE" ? CAT_GASTO.concat(data.customExpense) : CAT_INGRESO.concat(data.customIncome); }
  function claveMemoria(tipo, nombre) { return (tipo === "EXPENSE" ? "E:" : "I:") + claveComercio(nombre); }
  function sugerir(nombre, tipo) {
    var disp = categorias(tipo);
    var rec = data.categoryMemory[claveMemoria(tipo, nombre)];
    if (rec && disp.indexOf(rec) >= 0) return rec;
    var txt = " " + normalizar(nombre) + " ";
    var reglas = tipo === "EXPENSE" ? REGLAS_GASTO : REGLAS_INGRESO;
    for (var i = 0; i < reglas.length; i++) {
      for (var j = 0; j < reglas[i][1].length; j++) {
        if (txt.indexOf(reglas[i][1][j]) >= 0 && disp.indexOf(reglas[i][0]) >= 0) return reglas[i][0];
      }
    }
    return disp.indexOf("Otros") >= 0 ? "Otros" : disp[0];
  }
  function recordar(t) { if (t.name) data.categoryMemory[claveMemoria(t.type, t.name)] = t.category; }
  function efecto(t) { var v = montoEnCuenta(t); return t.type === "EXPENSE" ? -v : v; }
  /** Aplica (signo 1) o revierte (signo -1) un movimiento sobre el saldo de su cuenta, en la moneda que corresponde. */
  function aplicar(t, signo) {
    var a = cuenta(t.accountId);
    if (!a) return;
    sumarSaldo(a, esMixta(a) ? monedaTx(t) : a.currency, signo * efecto(t));
  }
  function ordenar() { data.transactions.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }); }

  function agregarMov(t) {
    recordar(t);
    data.transactions.unshift(t);
    ordenar();
    aplicar(t, 1);
    guardar();
  }
  function editarMov(t) {
    var i = -1;
    for (var k = 0; k < data.transactions.length; k++) if (data.transactions[k].id === t.id) i = k;
    if (i < 0) return;
    var viejo = data.transactions[i];
    aplicar(viejo, -1);
    aplicar(t, 1);
    recordar(t);
    data.transactions[i] = t;
    ordenar();
    guardar();
  }
  function borrarMov(id) {
    var t = null;
    data.transactions = data.transactions.filter(function (x) { if (x.id === id) { t = x; return false; } return true; });
    if (!t) return;
    aplicar(t, -1);
    guardar();
  }
  function convertir(v, de, a) { return de === a ? v : de === "USD" ? v * data.usdRate : v / data.usdRate; }
  /** Pasa plata entre cuentas. Si la de destino no acepta esa moneda, se convierte (compra o venta de dólares). */
  function transferir(deId, monDe, aId, monA, monto, cotiz) {
    if (deId === aId && monDe === monA) return "Elegí dos cuentas distintas.";
    if (!(monto > 0)) return "El monto debe ser mayor a cero.";
    var de = cuenta(deId), a = cuenta(aId);
    if (!de || !a) return "Cuenta inválida.";
    if (saldo(de, monDe) < monto) return "Fondos insuficientes en " + de.name + ".";
    if (monDe !== monA && !(cotiz > 0)) return "Falta la cotización del dólar.";
    var llegan = monDe === monA ? monto : monDe === "ARS" ? monto / cotiz : monto * cotiz;
    sumarSaldo(de, monDe, -monto);
    sumarSaldo(a, monA, r2(llegan));
    guardar();
    return null;
  }
  function totalMes(tipo, mes) {
    var s = 0;
    data.transactions.forEach(function (t) { if (t.type === tipo && mesDe(t.date) === mes && enFiltro(t)) s += montoPesos(t); });
    return s;
  }
  function porCategoria(tipo, mes) {
    var m = {};
    data.transactions.forEach(function (t) { if (t.type === tipo && mesDe(t.date) === mes && enFiltro(t)) m[t.category] = (m[t.category] || 0) + montoPesos(t); });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }

  // ---------- Tema y avisos ----------

  var oscuroSistema = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function aplicarTema() {
    var osc = data.themeMode === "DARK" || (data.themeMode !== "LIGHT" && oscuroSistema && oscuroSistema.matches);
    var raiz = document.documentElement;
    raiz.classList.toggle("oscuro", !!osc);
    var p = PALETAS[data.colorTheme] || PALETAS.AZUL;
    var v = osc ? p.oscuro : p.claro;
    raiz.style.setProperty("--primary", v[0]);
    if (osc) {
      raiz.style.setProperty("--on-primary", v[1]); raiz.style.setProperty("--pcont", v[2]);
      raiz.style.setProperty("--hero1", v[3]); raiz.style.setProperty("--hero2", v[4]); raiz.style.setProperty("--accent", v[5]);
    } else {
      raiz.style.setProperty("--on-primary", "#FFFFFF"); raiz.style.setProperty("--pcont", v[1]);
      raiz.style.setProperty("--hero1", v[2]); raiz.style.setProperty("--hero2", v[3]); raiz.style.setProperty("--accent", v[4]);
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", osc ? "#0A0F1A" : "#F2F5FA");
  }
  if (oscuroSistema && oscuroSistema.addEventListener) oscuroSistema.addEventListener("change", aplicarTema);

  var avisoT = null;
  function aviso(texto) {
    var cont = document.getElementById("aviso");
    cont.innerHTML = '<div>' + esc(texto) + "</div>";
    var d = cont.firstChild;
    requestAnimationFrame(function () { d.classList.add("ver"); });
    clearTimeout(avisoT);
    avisoT = setTimeout(function () { d.classList.remove("ver"); }, 2800);
  }

  // ---------- Hojas (paneles que suben) ----------

  var hojaAbierta = null;
  function abrirHoja(html, alMontar) {
    cerrarHoja(true);
    var capa = document.getElementById("capa");
    capa.innerHTML = '<div class="fondo"></div><div class="hoja"><div class="asa"></div>' + html + "</div>";
    capa.style.pointerEvents = "auto";
    var hoja = capa.querySelector(".hoja");
    capa.querySelector(".fondo").onclick = function () { cerrarHoja(); };
    hojaAbierta = hoja;
    requestAnimationFrame(function () { requestAnimationFrame(function () { capa.classList.add("abierta"); }); });
    if (alMontar) alMontar(hoja);
    return hoja;
  }
  function cerrarHoja(inmediato) {
    var capa = document.getElementById("capa");
    if (!hojaAbierta) return;
    hojaAbierta = null;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    capa.classList.remove("abierta");
    capa.style.pointerEvents = "none";
    if (inmediato) capa.innerHTML = "";
    else setTimeout(function () { if (!hojaAbierta) capa.innerHTML = ""; }, 230);
  }

  // ---------- Pantallas ----------

  var tab = "inicio";
  // Actividad e Informes están juntos: misma pestaña, mismo mes; "vista" elige movimientos o informes.
  // cuenta: "TODO" (todas), "SIN_EXCL" (sin las excluidas del patrimonio) o el id de una cuenta.
  var act = { vista: "movs", tipo: "EXPENSE", mes: mesActual(), buscar: "", ver: 10, cuenta: "TODO" };
  function cuentaEnFiltro(id) {
    if (act.cuenta === "TODO") return true;
    if (act.cuenta === "SIN_EXCL") { var a = cuenta(id); return !(a && a.exclude); }
    return id === act.cuenta;
  }
  function enFiltro(t) { return cuentaEnFiltro(t.accountId); }
  var vista = document.getElementById("vista");

  function render() {
    aplicarTema();
    var navs = document.querySelectorAll("#nav button");
    for (var i = 0; i < navs.length; i++) navs[i].classList.toggle("sel", navs[i].getAttribute("data-tab") === tab);
    if (tab === "inicio") vista.innerHTML = vistaInicio();
    else if (tab === "actividad") vista.innerHTML = vistaActividad();
    else vista.innerHTML = vistaAjustes();
    var b = document.getElementById("buscar");
    if (b) b.oninput = function () {
      act.buscar = b.value; act.ver = 10;
      document.getElementById("listaAct").innerHTML = listaActividad();
    };
  }

  function filaMov(t, mostrarFecha) {
    var a = cuenta(t.accountId);
    var gasto = t.type === "EXPENSE";
    var sub = esc(t.category) + " · " + esc(a ? a.name : "—") + (t.items && t.items.length ? " · " + t.items.length + " ítems" : "");
    return '<button class="mov" data-acc="detalle" data-id="' + esc(t.id) + '">' + iconoCat(t.category) +
      '<span class="txt"><div class="nom">' + esc(t.name || t.category) + '</div><div class="sub">' + sub + "</div></span>" +
      '<span class="der"><div class="m ' + (gasto ? "" : "ingreso") + '">' + plata(gasto ? -t.amount : t.amount, monedaTx(t), !gasto) + "</div>" +
      (mostrarFecha ? '<div class="muy-chico">' + fechaCorta(t.date) + "</div>" : "") + "</span></button>";
  }

  function saludo() { var h = new Date().getHours(); return h >= 5 && h <= 11 ? "Buen día" : h >= 12 && h <= 19 ? "Buenas tardes" : "Buenas noches"; }

  /** Moneda elegida para el panel principal (botón $ / US$). */
  function monedaPanel() { return data.heroCurrency === "USD" ? "USD" : "ARS"; }
  /** Total del mes en la moneda del panel: lo que está en esa moneda va tal cual; lo otro se convierte. */
  function totalMesEn(tipo, mes, moneda) {
    var s = 0;
    data.transactions.forEach(function (t) {
      if (t.type !== tipo || mesDe(t.date) !== mes) return;
      var mt = monedaTx(t);
      if (mt === moneda) s += t.amount;
      else s += moneda === "USD" ? t.amount / data.usdRate : t.amount * cotizTx(t);
    });
    return s;
  }

  function textoDolar() {
    var t = "dólar " + (data.usdAuto ? nombreDolar(data.usdAuto).toLowerCase() + " " : "") + "$" + numero(data.usdRate, 2, true);
    return t;
  }

  function vistaInicio() {
    var d = new Date();
    var fecha = DIAS[d.getDay()].charAt(0).toUpperCase() + DIAS[d.getDay()].slice(1) + " " + d.getDate() + " de " + MESES[d.getMonth()];
    // Lo que hay de verdad en cada moneda: las cuentas en dólares son dólares reales y no cambian con el dólar
    // del día; solo se convierte la otra moneda para sumarla.
    var pesos = 0, dolares = 0;
    var ten = tenencias(); pesos = ten.pesos; dolares = ten.dolares;
    var mon = monedaPanel();
    var total = mon === "USD" ? dolares + pesos / data.usdRate : pesos + dolares * data.usdRate;
    var mes = mesActual();
    var ing = totalMesEn("INCOME", mes, mon), gas = totalMesEn("EXPENSE", mes, mon);
    var pct = ing > 0 ? Math.min(100, gas / ing * 100) : (gas > 0 ? 100 : 0);
    var hayMes = data.transactions.some(function (t) { return mesDe(t.date) === mes; });
    var h = '<div class="entre" style="align-items:flex-start"><div><div class="fecha">' + fecha + "</div><h1>" + saludo() + "</h1></div>" +
      '<div class="fila" style="gap:8px;margin-top:8px"><button class="btnAyuda" data-acc="ayuda" aria-label="Ayuda">?</button>' +
      '<button class="btnCuentas" data-acc="cuentas" style="margin-top:0">' + ICON.billetera + "<span>Cuentas</span></button></div></div>";
    h += '<div class="hero"><div class="entre"><span style="opacity:.85">Patrimonio total</span><span class="fila" style="gap:8px">' +
      '<span class="moneda"><button data-acc="moneda" data-m="ARS" class="' + (mon === "ARS" ? "sel" : "") + '">$</button><button data-acc="moneda" data-m="USD" class="' + (mon === "USD" ? "sel" : "") + '">US$</button></span>' +
      '<button class="ojo" data-acc="privacidad">' + (data.privacy ? ICON.ojoNo : ICON.ojo) + "</button></span></div>" +
      // Total en la moneda elegida con $ / US$ (lo de la otra moneda se convierte al dólar elegido).
      // Debajo, lo que tenés de verdad en cada moneda: eso no cambia con el dólar.
      '<div class="monto">' + plata(total, mon) + "</div>" +
      (pesos && dolares ? '<div class="tenes"><span>' + plata(pesos) + "</span><span>" + plata(dolares, "USD") + "</span></div>" : "") +
      '<div style="opacity:.8;font-size:13px;margin-top:6px">' + (pesos && dolares ? (mon === "USD" ? "Los pesos" : "Los dólares") + " se convierten al " : "") + textoDolar() + "</div>" +
      '<div class="acciones"><button data-acc="nuevo" data-tipo="EXPENSE"><span class="c">' + ICON.gasto + "</span>Gasto</button>" +
      '<button data-acc="nuevo" data-tipo="INCOME"><span class="c">' + ICON.ingreso + "</span>Ingreso</button>" +
      '<button data-acc="divisas"><span class="c">' + ICON.divisas + "</span>Divisas</button>" +
      '<button data-acc="transferir"><span class="c">' + ICON.transferir + "</span>Transferir</button></div></div>" +
      '<button class="masAcciones" data-acc="importarExtracto">' + ICON.importar + "<span>Cargar el resumen del banco (PDF)</span></button>";
    h += '<div class="tarjeta" style="margin-top:14px"><div class="entre"><b style="font-size:17px">Este mes</b><span class="chico">' + mesNombre(mes).split(" ")[0] + "</span></div>" +
      '<div class="dos" style="margin-top:12px"><div class="fila"><span class="icono fondo-ingreso">' + ICON.ingreso + '</span><div><div class="chico">Ingresos</div><b>' + plata(ing, mon) + "</b></div></div>" +
      '<div class="fila"><span class="icono fondo-gasto">' + ICON.gasto + '</span><div><div class="chico">Gastos</div><b>' + plata(gas, mon) + "</b></div></div></div>" +
      (hayMes ? '<div class="barra"><div style="width:' + pct.toFixed(1) + '%"></div></div><div class="entre chico"><span>' +
        (ing > 0 ? "Gastaste el " + numero(gas / ing * 100, 0, false) + "% de tus ingresos" : "Sin ingresos este mes") + '</span><b class="' + (ing - gas >= 0 ? "ingreso" : "gasto") + '">' + plata(ing - gas, mon, true) + "</b></div>"
        : '<div class="chico" style="margin-top:12px">Todavía no hay movimientos este mes.</div>') + "</div>";
    var ult = mezclar(data.transactions.slice(0, 6), (data.exchanges || []).slice(0, 6)).slice(0, 6);
    h += '<div class="entre"><h2>Últimos movimientos</h2>' + (ult.length ? '<button class="link" data-acc="tab" data-tab="actividad">Ver todos</button>' : "") + "</div>";
    h += '<div class="lista">' + (ult.length ? ult.map(function (e) { return fila(e, true); }).join("") : '<div class="vacio">Todavía no cargaste movimientos.<br>Tocá <b>Gasto</b>, <b>Ingreso</b> o <b>Importar</b> para empezar.</div>') + "</div>";
    return h;
  }

  function dona(partes, total) {
    if (!(total > 0)) return '<svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--variant)" stroke-width="6"/></svg>';
    var s = '<svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--variant)" stroke-width="6"/>';
    var acum = 0;
    partes.forEach(function (p) {
      var frac = p[1] / total * 100;
      s += '<circle cx="21" cy="21" r="15.9" fill="none" stroke="' + colorCat(p[0]) + '" stroke-width="6" stroke-dasharray="' + frac.toFixed(3) + " " + (100 - frac).toFixed(3) + '" stroke-dashoffset="' + (25 - acum).toFixed(3) + '"/>';
      acum += frac;
    });
    return s + "</svg>";
  }

  /** Movimientos y operaciones de divisas juntos, del más nuevo al más viejo. */
  function mezclar(txs, cambios) {
    return txs.map(function (t) { return { date: t.date, orden: momento(t.id), t: t }; })
      .concat(cambios.map(function (x) { return { date: x.date, orden: momento(x.id), fx: x }; }))
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.orden - a.orden; });
  }
  function fila(e, mostrarFecha) { return e.fx ? filaCambio(e.fx, mostrarFecha) : filaMov(e.t, mostrarFecha); }
  function movsActividad() {
    var q = normalizar(act.buscar.trim());
    var txs = data.transactions.filter(function (t) {
      if (t.type !== act.tipo || !enFiltro(t)) return false;
      if (q) return normalizar((t.name || "") + " " + t.category + " " + (t.comment || "")).indexOf(q) >= 0;
      return mesDe(t.date) === act.mes;
    });
    // Las compras/ventas de dólares se ven en la lista (no suman a gastos ni a ingresos).
    var cambios = (data.exchanges || []).filter(function (x) {
      if (!cuentaEnFiltro(x.fromId) && !cuentaEnFiltro(x.toId)) return false;
      if (q) return normalizar((x.type === "COMPRA" ? "compra de dolares" : "venta de dolares") + " divisas " + ((cuenta(x.fromId) || {}).name || "") + " " + ((cuenta(x.toId) || {}).name || "")).indexOf(q) >= 0;
      return mesDe(x.date) === act.mes;
    });
    return mezclar(txs, cambios);
  }
  function listaActividad() {
    var lista = movsActividad();
    if (!lista.length) return '<div class="lista"><div class="vacio">' + (act.buscar ? "No hay movimientos que coincidan." : "No hay " + (act.tipo === "EXPENSE" ? "gastos" : "ingresos") + " en " + mesNombre(act.mes).toLowerCase() + ".") + "</div></div>";
    var h = "", dia = null, abierto = false;
    lista.slice(0, act.ver).forEach(function (e) {
      if (e.date !== dia) {
        if (abierto) h += "</div>";
        dia = e.date;
        h += '<div class="dia">' + diaTitulo(e.date) + '</div><div class="lista">';
        abierto = true;
      }
      h += fila(e, false);
    });
    if (abierto) h += "</div>";
    if (lista.length > act.ver) h += '<button class="mas" data-acc="verMas">Ver más (' + (lista.length - act.ver) + ")</button>";
    return h;
  }
  function vistaActividad() {
    if (act.cuenta !== "TODO" && act.cuenta !== "SIN_EXCL" && !cuenta(act.cuenta)) act.cuenta = "TODO";
    var h = "<h1>Actividad</h1>";
    h += '<div class="segmento"><button data-acc="actVista" data-v="movs" class="' + (act.vista === "movs" ? "sel" : "") + '">Movimientos</button><button data-acc="actVista" data-v="informes" class="' + (act.vista === "informes" ? "sel" : "") + '">Informes</button></div>';
    h += '<div class="mes" style="margin-top:12px"><button data-acc="actMes" data-n="-1">‹</button><span>' + mesNombre(act.mes) + '</span><button data-acc="actMes" data-n="1"' + (act.mes >= mesActual() ? " disabled" : "") + ">›</button></div>";
    var hayExcluidas = data.accounts.some(function (a) { return a.exclude; });
    var opciones = [["TODO", "Total"]].concat(hayExcluidas ? [["SIN_EXCL", "Total sin excluidas"]] : []).concat(data.accounts.map(function (a) { return [a.id, a.name]; }));
    h += '<div class="filtroCuentas">' + opciones.map(function (o) {
      return '<button class="chip' + (act.cuenta === o[0] ? " sel" : "") + '" data-acc="actCuenta" data-v="' + esc(o[0]) + '">' + esc(o[1]) + "</button>";
    }).join("") + "</div>";
    return h + (act.vista === "informes" ? cuerpoInformes() : cuerpoMovimientos());
  }

  function cuerpoMovimientos() {
    if (act.tipo === "FX") return cuerpoDivisas();
    var gasto = act.tipo === "EXPENSE";
    var cats = porCategoria(act.tipo, act.mes);
    var total = 0; cats.forEach(function (c) { total += c[1]; });
    var dias = act.mes === mesActual() ? new Date().getDate() : diasDelMes(act.mes);
    var h = segTipo();
    h += '<div class="tarjeta" style="margin-top:12px"><div class="entre"><div><div class="chico">' + (gasto ? "Gastado" : "Cobrado") + '</div><div style="font-size:28px;font-weight:800;letter-spacing:-.5px">' + plata(total) + "</div></div>" +
      '<div style="text-align:right"><div class="chico">Promedio diario</div><b>' + plata(total / Math.max(1, dias)) + "</b></div></div>" +
      '<div class="dona">' + dona(cats, total) + "<div style=\"flex:1;min-width:0\">" +
      (cats.length ? cats.slice(0, 5).map(function (c) {
        return '<div class="entre" style="padding:4px 0"><span class="fila" style="gap:8px;min-width:0"><span class="punto" style="background:' + colorCat(c[0]) + '"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c[0]) + '</span></span><b class="chico" style="color:var(--fg)">' + numero(c[1] / total * 100, 0, false) + "%</b></div>";
      }).join("") : '<div class="chico">Sin movimientos en este período.</div>') + "</div></div></div>";
    h += '<div style="margin-top:14px"><input id="buscar" class="buscar" type="search" placeholder="Buscar comercio, concepto o categoría" value="' + esc(act.buscar) + '" autocomplete="off"></div>';
    h += '<div id="listaAct">' + listaActividad() + "</div>";
    h += '<button class="fab" data-acc="nuevo" data-tipo="' + act.tipo + '">' + ICON.mas + (gasto ? "Nuevo gasto" : "Nuevo ingreso") + "</button>";
    return h;
  }

  function segTipo() {
    return '<div class="segmento chicoSeg" style="margin-top:12px">' + [["EXPENSE", "Gastos"], ["INCOME", "Ingresos"], ["FX", "Divisas"]].map(function (o) {
      return '<button data-acc="actTipo" data-tipo="' + o[0] + '" class="' + (act.tipo === o[0] ? "sel" : "") + '">' + o[1] + "</button>";
    }).join("") + "</div>";
  }

  function cuerpoDivisas() {
    var lista = (data.exchanges || []).filter(function (x) { return mesDe(x.date) === act.mes && (cuentaEnFiltro(x.fromId) || cuentaEnFiltro(x.toId)); });
    var comprados = 0, vendidos = 0, pagado = 0, cobrado = 0;
    lista.forEach(function (x) { if (x.type === "COMPRA") { comprados += x.usd; pagado += x.pesos; } else { vendidos += x.usd; cobrado += x.pesos; } });
    var h = segTipo();
    h += '<div class="dos" style="margin-top:12px"><div class="tarjeta kpi"><div class="chico">Compraste</div><div class="valor ingreso">' + plata(comprados, "USD") + '</div><div class="muy-chico">' +
      (comprados ? "pagaste " + plata(pagado) + " · promedio $" + numero(pagado / comprados, 2, true) : "—") + "</div></div>" +
      '<div class="tarjeta kpi"><div class="chico">Vendiste</div><div class="valor gasto">' + plata(vendidos, "USD") + '</div><div class="muy-chico">' +
      (vendidos ? "cobraste " + plata(cobrado) + " · promedio $" + numero(cobrado / vendidos, 2, true) : "—") + "</div></div></div>";
    h += '<div class="lista" style="margin-top:14px">' + (lista.length ? lista.map(filaCambio).join("") : '<div class="vacio">No compraste ni vendiste dólares en ' + mesNombre(act.mes).toLowerCase() + ".</div>") + "</div>";
    h += '<button class="fab" data-acc="divisas">' + ICON.divisas + "Comprar o vender</button>";
    return h;
  }

  function cuerpoInformes() {
    var mes = act.mes, ant = mesMover(mes, -1);
    var ing = totalMes("INCOME", mes), gas = totalMes("EXPENSE", mes), gasAnt = totalMes("EXPENSE", ant);
    var nIng = data.transactions.filter(function (t) { return t.type === "INCOME" && mesDe(t.date) === mes && enFiltro(t); }).length;
    var cats = porCategoria("EXPENSE", mes);
    var ahorro = ing - gas;
    var h = '<div class="dos" style="margin-top:12px">' +
      '<div class="tarjeta kpi"><div class="chico"><span class="punto" style="background:var(--info)"></span> Ingresos</div><div class="valor">' + plata(ing) + '</div><div class="muy-chico">' + nIng + " movimientos</div></div>" +
      '<div class="tarjeta kpi"><div class="chico"><span class="punto" style="background:var(--expense)"></span> Gastos</div><div class="valor">' + plata(gas) + '</div><div class="muy-chico">' +
      (gasAnt > 0 ? (gas >= gasAnt ? "+" : "") + numero((gas - gasAnt) / gasAnt * 100, 1, false) + "% vs mes anterior" : "sin mes anterior") + "</div></div>" +
      '<div class="tarjeta kpi"><div class="chico"><span class="punto" style="background:var(--income)"></span> Ahorro</div><div class="valor ' + (ahorro >= 0 ? "ingreso" : "gasto") + '">' + plata(ahorro, "ARS", true) + '</div><div class="muy-chico">' +
      (ing > 0 ? numero(ahorro / ing * 100, 1, false) + "% del ingreso" : "—") + "</div></div>" +
      '<div class="tarjeta kpi"><div class="chico"><span class="punto" style="background:var(--warning)"></span> Mayor rubro</div><div class="valor">' + (cats.length ? esc(cats[0][0]) : "—") + '</div><div class="muy-chico">' + (cats.length ? plata(cats[0][1]) : "") + "</div></div></div>";
    h += '<h2>Gastos por categoría</h2><div class="tarjeta">' + (cats.length ? cats.map(function (c) {
      return '<div class="cat"><div class="entre"><span class="fila" style="gap:8px"><span class="punto" style="background:' + colorCat(c[0]) + '"></span>' + esc(c[0]) + "</span><b>" + plata(c[1]) + '</b></div><div class="b"><div style="width:' + (c[1] / cats[0][1] * 100).toFixed(1) + "%;background:" + colorCat(c[0]) + '"></div></div></div>';
    }).join("") : '<div class="chico">Sin gastos en este mes.</div>') + "</div>";
    h += seccionAhorro(mes);
    var seis = [], max = 0;
    for (var i = 5; i >= 0; i--) {
      var m = mesMover(mes, -i), a = totalMes("INCOME", m), g = totalMes("EXPENSE", m);
      seis.push([m, a, g]); max = Math.max(max, a, g);
    }
    h += '<h2>Últimos 6 meses</h2><div class="tarjeta"><div class="fila chico"><span class="punto" style="background:var(--info)"></span>Ingresos <span class="punto" style="background:var(--expense);margin-left:10px"></span>Gastos</div><div class="meses">' +
      seis.map(function (x) {
        return '<div class="col"><div class="barras"><div style="height:' + (max ? x[1] / max * 120 : 0).toFixed(0) + 'px;background:var(--info)"></div><div style="height:' + (max ? x[2] / max * 120 : 0).toFixed(0) + 'px;background:var(--expense)"></div></div><span class="muy-chico">' + MESES_C[+x[0].slice(5, 7) - 1] + "</span></div>";
      }).join("") + "</div></div>";
    return h;
  }

  /** Movimientos que cambian tus dólares: en US$ y en una cuenta en dólares (un gasto en US$ pagado con pesos no los toca). */
  function esDeDolares(t) { var a = cuenta(t.accountId); return monedaTx(t) === "USD" && a && (a.currency === "USD" || esMixta(a)); }
  /** Dólares que tenés según esos movimientos, con el costo promedio (lo que pagaste por cada uno). */
  /** Movimientos de dólares (ingresos/gastos en US$ en cuentas con dólares y compras/ventas de divisas), por fecha. */
  function eventosDolares(fecha) {
    var ev = data.transactions.filter(function (t) { return esDeDolares(t) && t.date <= fecha && enFiltro(t); })
      .map(function (t) { return { fecha: t.date, orden: momento(t.id), entra: t.type === "INCOME", usd: t.amount, cotiz: cotizTx(t) }; });
    (data.exchanges || []).forEach(function (x) {
      // Una compra suma dólares a la cuenta que los recibe; una venta los saca de la que los entrega.
      if (x.date <= fecha && cuentaEnFiltro(x.type === "COMPRA" ? x.toId : x.fromId)) ev.push({ fecha: x.date, orden: momento(x.id), entra: x.type === "COMPRA", usd: x.usd, cotiz: x.rate });
    });
    // Por fecha y, el mismo día, en el orden en que se cargaron (el id lleva la hora de carga).
    return ev.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.orden - b.orden; });
  }
  function momento(id) { var n = parseInt(String(id).split("_")[1], 10); return isNaN(n) ? 0 : n; }
  /** Dólares que tenés y lo que te costaron (costo promedio: al vender, sale la parte proporcional del costo). */
  function dolaresHasta(fecha) {
    var h = 0, costo = 0;
    eventosDolares(fecha).forEach(function (e) {
      if (e.entra) { h += e.usd; costo += e.usd * e.cotiz; }
      else if (h > 0) { var sale = Math.min(e.usd, h); costo -= costo / h * sale; h -= sale; }
    });
    return { dolares: h, costo: costo };
  }

  function seccionAhorro(mes) {
    var fin = mes + "-" + String(diasDelMes(mes)).padStart(2, "0");
    var ing = 0, gas = 0;
    data.transactions.forEach(function (t) { if (t.date <= fin && enFiltro(t)) { if (t.type === "INCOME") ing += montoPesos(t); else gas += montoPesos(t); } });
    var acum = ing - gas;
    var h = '<h2>Ahorro y dólares</h2><div class="tarjeta"><div class="chico">Ahorro acumulado (ingresos menos gastos, hasta ' + mesNombre(mes).toLowerCase() + ")</div>" +
      '<div class="kpi"><div class="valor ' + (acum >= 0 ? "ingreso" : "gasto") + '">' + plata(acum, "ARS", true) + '</div></div><div class="muy-chico">≈ ' + plata(acum / data.usdRate, "USD", true) + " al dólar de hoy</div>";
    // Ahorro de cada mes (últimos 6): positivo verde, negativo rojo.
    var meses = [], maxAbs = 1;
    for (var i = 5; i >= 0; i--) {
      var m = mesMover(mes, -i), v = totalMes("INCOME", m) - totalMes("EXPENSE", m);
      meses.push([m, v]); maxAbs = Math.max(maxAbs, Math.abs(v));
    }
    h += '<div class="chico" style="margin-top:14px">Ahorro de cada mes</div><div class="ahorroMeses">' + meses.map(function (x) {
      var alto = Math.round(Math.abs(x[1]) / maxAbs * 54);
      return '<div class="col"><div class="mitad">' + (x[1] > 0 ? '<div style="height:' + alto + 'px;background:var(--income)"></div>' : "") + '</div><div class="mitad abajo">' +
        (x[1] < 0 ? '<div style="height:' + alto + 'px;background:var(--expense)"></div>' : "") + '</div><span class="muy-chico">' + MESES_C[+x[0].slice(5, 7) - 1] + "</span></div>";
    }).join("") + "</div></div>";

    var d = dolaresHasta(hoy());
    h += '<div class="tarjeta" style="margin-top:12px">';
    if (d.dolares < 0.005) {
      h += '<b>Tus dólares</b><div class="chico" style="margin-top:6px">Todavía no cargaste dólares. Usá el botón <b>Divisas</b> para registrar una compra de dólares (o cargá un ingreso en <b>US$</b> en una cuenta en dólares): se guarda el dólar de ese día y acá vas a ver si ganás o perdés.</div></div>';
      return h;
    }
    var casa = data.usdAuto || "oficial";
    var valor = d.dolares * data.usdRate, gan = valor - d.costo, pct = d.costo > 0 ? gan / d.costo * 100 : 0;
    var gana = gan >= 0;
    h += '<div class="entre"><b>Tus dólares</b><span class="etiqueta" style="' + (gana ? "background:rgba(21,128,61,.14);color:var(--income)" : "background:rgba(220,38,38,.14);color:var(--expense)") + '">' + (Math.abs(gan) < 1 ? "Sin cambios" : gana ? "Estás ganando" : "Estás perdiendo") + "</span></div>" +
      '<div class="kpi"><div class="valor">' + plata(d.dolares, "USD") + "</div></div>" +
      '<div class="clave"><span>Pagaste en promedio</span><span>$' + numero(d.costo / d.dolares, 2, true) + " por dólar</span></div>" +
      '<div class="clave"><span>Te costaron</span><span>' + plata(d.costo) + "</span></div>" +
      '<div class="clave"><span>Hoy valen (dólar ' + nombreDolar(casa).toLowerCase() + " $" + numero(data.usdRate, 2, true) + ")</span><span>" + plata(valor) + "</span></div>" +
      '<div class="clave"><span>' + (gana ? "Ganancia" : "Pérdida") + '</span><span class="' + (gana ? "ingreso" : "gasto") + '">' + plata(gan, "ARS", true) + " (" + (pct >= 0 ? "+" : "") + numero(pct, 1, false) + "%)</span></div>" +
      '<div class="chico" style="margin-top:12px">Lo que pagaste y lo que valen, mes a mes</div><div id="graficoDolares" class="chico" style="margin-top:6px">Cargando el gráfico…</div></div>';
    setTimeout(function () { dibujarGraficoDolares(casa); }, 0);
    return h;
  }

  /** Gráfico de líneas: costo de tus dólares vs. su valor a fin de cada mes (con el dólar de ese momento). */
  function dibujarGraficoDolares(casa) {
    serieDolar(casa).then(function (serie) {
      var cont = document.getElementById("graficoDolares");
      if (!cont) return;
      var usd = eventosDolares(hoy()).map(function (e) { return e.fecha; });
      var desde = mesDe(usd[0]), hasta = mesActual(), meses = [];
      for (var m = desde; m <= hasta && meses.length < 24; m = mesMover(m, 1)) meses.push(m);
      if (meses.length > 12) meses = meses.slice(-12);
      var puntos = meses.map(function (m) {
        var fin = m === hasta ? hoy() : m + "-" + String(diasDelMes(m)).padStart(2, "0");
        var d = dolaresHasta(fin);
        var k = m === hasta ? data.usdRate : (cotizEnSerie(serie, fin) || data.usdRate);
        return { m: m, costo: d.costo, valor: d.dolares * k };
      });
      var max = 1;
      puntos.forEach(function (p) { max = Math.max(max, p.costo, p.valor); });
      var W = 320, H = 150, L = 16, Rr = 16, T = 10, B = 22;
      var x = function (i) { return L + (puntos.length === 1 ? (W - L - Rr) / 2 : i * (W - L - Rr) / (puntos.length - 1)); };
      var y = function (v) { return T + (1 - v / max) * (H - T - B); };
      var linea = function (campo) { return puntos.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p[campo]).toFixed(1); }).join(" "); };
      var svg = '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto">' +
        [0.25, 0.5, 0.75, 1].map(function (f) { return '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(max * f).toFixed(1) + '" y2="' + y(max * f).toFixed(1) + '" stroke="var(--line)" stroke-width="1"/>'; }).join("") +
        '<path d="' + linea("costo") + '" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round"/>' +
        '<path d="' + linea("valor") + '" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        puntos.map(function (p, i) { return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.valor).toFixed(1) + '" r="3.5" fill="var(--primary)"/>'; }).join("") +
        puntos.map(function (p, i) {
          return (puntos.length <= 6 || i % 2 === puntos.length % 2 || i === puntos.length - 1) ? '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + MESES_C[+p.m.slice(5, 7) - 1] + "</text>" : "";
        }).join("") + "</svg>";
      cont.innerHTML = svg + '<div class="fila chico" style="gap:6px;margin-top:4px"><span class="punto" style="background:var(--primary)"></span>Lo que valen <span class="punto" style="background:var(--muted);margin-left:10px"></span>Lo que pagaste</div>';
    }).catch(function () {
      var cont = document.getElementById("graficoDolares");
      if (cont) cont.textContent = "No se pudo cargar el historial del dólar (sin conexión).";
    });
  }

  // Todas las cotizaciones del día (compra y venta), para comparar. Se piden como mucho cada 10 minutos.
  var cotizHoyP = null, cotizHoyHora = 0;
  function pintarCotizacionesHoy() {
    if (!cotizHoyP || Date.now() - cotizHoyHora > 10 * 60 * 1000) {
      cotizHoyHora = Date.now();
      cotizHoyP = jsonDe("https://dolarapi.com/v1/dolares").catch(function (e) { cotizHoyP = null; throw e; });
    }
    cotizHoyP.then(function (lista) {
      var cont = document.getElementById("cotizHoy");
      if (!cont) return;
      var orden = ["oficial", "blue", "bolsa", "contadoconliqui", "tarjeta"];
      cont.innerHTML = '<div class="clave muy-chico"><span>Tipo</span><span>Compra · Venta</span></div>' + orden.map(function (casa) {
        var x = lista.filter(function (y) { return y.casa === casa; })[0];
        if (!x) return "";
        return '<div class="clave"><span>' + nombreDolar(casa) + (data.usdAuto === casa ? " ✓" : "") + "</span><span>" + (x.compra ? "$" + numero(x.compra, 2, true) : "—") + " · $" + numero(x.venta, 2, true) + "</span></div>";
      }).join("");
    }).catch(function () {
      var cont = document.getElementById("cotizHoy");
      if (cont) cont.textContent = "Sin conexión para ver las cotizaciones.";
    });
  }

  function vistaAjustes() {
    var h = "<h1>Ajustes</h1>";
    h += '<h2>Apariencia</h2><div class="segmento">' + [["SYSTEM", "Sistema"], ["LIGHT", "Claro"], ["DARK", "Oscuro"]].map(function (o) {
      return '<button data-acc="tema" data-modo="' + o[0] + '" class="' + (data.themeMode === o[0] ? "sel" : "") + '">' + o[1] + "</button>";
    }).join("") + "</div>";
    h += '<h2>Color de la app</h2><div class="tarjeta"><div class="paletas">' + ORDEN_PALETAS.map(function (k) {
      var p = PALETAS[k];
      return '<button data-acc="color" data-color="' + k + '" class="' + ((data.colorTheme || "AZUL") === k ? "sel" : "") + '"><span style="background:linear-gradient(135deg,' + p.claro[2] + "," + p.claro[3] + ')"></span>' + p.nombre + "</button>";
    }).join("") + "</div></div>";
    h += '<div class="tarjeta" style="margin-top:14px;padding:4px 18px"><label class="interruptor"><span>Ocultar montos</span><input type="checkbox" data-acc="privacidad"' + (data.privacy ? " checked" : "") + "></label></div>";
    h += '<h2>Dólar</h2><div class="tarjeta"><div class="chico" style="margin-bottom:8px">Cotización para convertir entre pesos y dólares. Se actualiza sola desde DolarApi (precio de venta).</div>' +
      '<div class="chips">' + DOLARES.map(function (o) {
        return '<button class="chip' + ((data.usdAuto || "") === o[0] ? " sel" : "") + '" data-acc="dolarTipo" data-casa="' + o[0] + '">' + o[1] + "</button>";
      }).join("") + "</div>" +
      (data.usdAuto ? '<div class="clave" style="margin-top:12px"><span>Dólar ' + nombreDolar(data.usdAuto).toLowerCase() + '</span><span>$' + numero(data.usdRate, 2, true) + "</span></div>" +
        '<div class="muy-chico">' + (data.usdUpdated ? "Actualizado " + fechaLarga(data.usdUpdated.slice(0, 10)) + " " + new Date(data.usdUpdated).toTimeString().slice(0, 5) : "Todavía no se actualizó") + "</div>" +
        '<button class="btn suave" data-acc="dolarAhora">Actualizar ahora</button>'
        : '<label class="campo"><span>Pesos por dólar</span><input id="usd" inputmode="decimal" value="' + esc(plano(data.usdRate)) + '"></label><button class="btn" data-acc="guardarUsd">Guardar cotización</button>') +
      '<div class="chico" style="margin-top:16px;font-weight:600;color:var(--fg)">Cotizaciones de hoy</div><div id="cotizHoy" class="chico" style="margin-top:4px">Cargando…</div></div>';
    setTimeout(pintarCotizacionesHoy, 0);
    h += '<h2>Categorías propias</h2><div class="tarjeta"><div class="chico" style="margin-bottom:8px">Gastos</div><div class="chips">' +
      (data.customExpense.length ? data.customExpense.map(function (c) { return '<span class="chip"><span class="punto" style="background:' + colorCat(c) + '"></span>' + esc(c) + "</span>"; }).join("") : '<span class="chico">Ninguna</span>') +
      '</div><div class="chico" style="margin:14px 0 8px">Ingresos</div><div class="chips">' +
      (data.customIncome.length ? data.customIncome.map(function (c) { return '<span class="chip"><span class="punto" style="background:' + colorCat(c) + '"></span>' + esc(c) + "</span>"; }).join("") : '<span class="chico">Ninguna</span>') +
      '</div><div class="dos" style="margin-top:6px"><button class="btn suave" data-acc="nuevaCat" data-tipo="EXPENSE">+ De gasto</button><button class="btn suave" data-acc="nuevaCat" data-tipo="INCOME">+ De ingreso</button></div></div>';
    h += '<h2>Copia de seguridad</h2><div class="tarjeta"><div class="chico">Guardá un archivo con todos tus datos (para pasarlos a otro teléfono o por si se borra Safari).</div>' +
      '<button class="btn" data-acc="exportar">Guardar copia</button><button class="btn suave" data-acc="cargarCopia">Cargar una copia</button><input id="archivo" type="file" accept="application/json,.json" style="display:none"></div>';
    h += '<h2>Datos</h2><div class="tarjeta"><div class="clave"><span>Cuentas</span><span>' + data.accounts.length + '</span></div><div class="clave"><span>Movimientos</span><span>' + data.transactions.length + '</span></div><div class="clave"><span>Versión</span><span>web ' + esc(VERSION) + "</span></div>" +
      '<button class="btn peligro" data-acc="borrarTodo">Borrar todos los datos</button></div>';
    h += '<p class="muy-chico" style="text-align:center;margin-top:18px">Tus datos quedan solo en este iPhone (en Safari). No se suben a ningún lado.</p>';
    return h;
  }

  // ---------- Cotización del dólar de un día ----------
  // Hoy: DolarApi. Días anteriores: ArgentinaDatos (historial público y gratis). Si ese día no hubo
  // cotización (fin de semana, feriado), se usa la del último día hábil anterior.
  var cacheCotiz = {};
  function jsonDe(url) { return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); }
  function cotizacionDe(fecha, casa, lado) {
    lado = lado === "compra" ? "compra" : "venta";
    var k = casa + "|" + fecha + "|" + lado;
    if (!cacheCotiz[k]) {
      var p = fecha >= hoy()
        ? jsonDe("https://dolarapi.com/v1/dolares/" + casa).then(function (x) { return { valor: Number(x[lado]) || Number(x.venta), fecha: hoy() }; })
        : historico(fecha, casa, 0, lado);
      cacheCotiz[k] = p.then(function (x) { if (!(x.valor > 0)) throw new Error("sin precio"); return x; })
        .catch(function (e) { delete cacheCotiz[k]; throw e; });
    }
    return cacheCotiz[k];
  }
  function historico(fecha, casa, intento, lado) {
    if (intento > 7) return Promise.reject(new Error("sin cotización"));
    var p = fecha.split("-");
    return fetch("https://api.argentinadatos.com/v1/cotizaciones/dolares/" + casa + "/" + p[0] + "/" + p[1] + "/" + p[2], { cache: "force-cache" })
      .then(function (r) {
        if (r.ok) return r.json().then(function (x) { return { valor: Number(x[lado === "compra" ? "compra" : "venta"]) || Number(x.venta), fecha: fecha }; });
        if (r.status === 404) return historico(sumarDias(fecha, -1), casa, intento + 1, lado);
        throw new Error("HTTP " + r.status);
      });
  }
  // Serie completa (para el gráfico de los dólares): se baja una vez por día.
  var serieP = {};
  function serieDolar(casa) {
    if (!serieP[casa]) {
      var clave = "gestor.serie." + casa, guardada = null;
      try { guardada = JSON.parse(localStorage.getItem(clave)); } catch (e) {}
      if (guardada && guardada.dia === hoy() && guardada.datos) serieP[casa] = Promise.resolve(guardada.datos);
      else serieP[casa] = jsonDe("https://api.argentinadatos.com/v1/cotizaciones/dolares/" + casa).then(function (lista) {
        var datos = {};
        lista.forEach(function (x) { datos[x.fecha] = x.venta; });
        try { localStorage.setItem(clave, JSON.stringify({ dia: hoy(), datos: datos })); } catch (e) {}
        return datos;
      }).catch(function (e) { delete serieP[casa]; throw e; });
    }
    return serieP[casa];
  }
  /** Última cotización de la serie en o antes de una fecha. */
  function cotizEnSerie(serie, fecha) {
    for (var i = 0; i < 12; i++) { var f = sumarDias(fecha, -i); if (serie[f]) return serie[f]; }
    return null;
  }

  // ---------- Hoja: nuevo / editar movimiento ----------

  function hojaMovimiento(opc) {
    var ed = opc.editar || null;
    var st = {
      tipo: ed ? ed.type : (opc.tipo || "EXPENSE"),
      monto: ed ? plano(ed.amount) : (opc.monto || ""),
      nombre: ed ? ed.name : (opc.nombre || ""),
      cat: ed ? ed.category : (opc.cat || null),
      catTocada: !!(ed || opc.cat),
      cuenta: ed ? ed.accountId : (opc.cuenta || (cuentaPred() || {}).id),
      fecha: ed ? ed.date : hoy(),
      comentario: ed ? (ed.comment || "") : "",
      // Moneda del movimiento y cotización del dólar de ese día (automática o a mano).
      moneda: ed ? monedaTx(ed) : (opc.moneda || monedasDe(cuenta(opc.cuenta || (cuentaPred() || {}).id))[0]),
      casa: ed && ed.rateSource ? (ed.rateSource === "manual" ? "" : ed.rateSource) : (data.usdAuto || "oficial"),
      cotiz: ed && ed.rate ? ed.rate : null,
      cotizFecha: null,
      cotizManual: ed && ed.rateSource === "manual" && ed.rate ? plano(ed.rate) : "",
      cotizEstado: "",
      monedaTocada: !!(ed || opc.moneda),
      items: ed && ed.items ? ed.items.map(function (i) { return { name: i.name, amount: i.amount, quantity: i.quantity == null ? 1 : i.quantity }; }) : []
    };
    if (!st.cat) st.cat = sugerir(st.nombre, st.tipo);

    /** Hace falta cotización si el movimiento es en dólares o si la cuenta está en otra moneda. */
    function usaCotiz() { var a = cuenta(st.cuenta); return st.moneda === "USD" || (a && !esMixta(a) && a.currency !== st.moneda); }
    /** Siempre se puede cargar en pesos o en dólares: si la cuenta es de la otra moneda, se convierte sola
        con la cotización elegida (la de la cuenta va primero). */
    function monedasPosibles() { return monedasDe(cuenta(st.cuenta))[0] === "USD" ? ["USD", "ARS"] : ["ARS", "USD"]; }
    function cotizActual() { return st.casa ? st.cotiz : leerMonto(st.cotizManual); }
    function mostrarCotiz(hoja) {
      var c = hoja.querySelector("#hCotiz");
      if (c) c.textContent = st.cotizEstado === "buscando" ? "Buscando la cotización…" : st.cotizEstado === "error" ? "No se pudo traer la cotización (sin conexión). Elegí Manual y cargala a mano." :
        st.cotiz ? "Dólar " + nombreDolar(st.casa).toLowerCase() + ": $" + numero(st.cotiz, 2, true) + (st.cotizFecha && st.cotizFecha !== st.fecha ? " (del " + fechaLarga(st.cotizFecha) + ", último día hábil)" : "") : "";
      var e = hoja.querySelector("#hEquiv"), v = leerMonto(st.monto), k = cotizActual(), a = cuenta(st.cuenta);
      if (!e) return;
      if (!(v > 0) || !(k > 0)) { e.textContent = ""; return; }
      var pesos = st.moneda === "USD" ? v * k : v, dolares = st.moneda === "USD" ? v : v / k;
      e.innerHTML = "= <b>" + plata(pesos) + "</b> · " + plata(dolares, "USD") +
        (a && !esMixta(a) && a.currency !== st.moneda ? '<br><span class="muy-chico">' + (st.tipo === "EXPENSE" ? "Se descuentan " : "Se suman ") + plata(a.currency === "USD" ? dolares : pesos, a.currency) + (st.tipo === "EXPENSE" ? " de " : " a ") + esc(a.name) + "</span>" : "");
    }
    function pedirCotiz(hoja) {
      if (!usaCotiz() || !st.casa) return;
      var casa = st.casa, fecha = st.fecha;
      st.cotizEstado = "buscando"; mostrarCotiz(hoja);
      cotizacionDe(fecha, casa).then(function (x) {
        if (st.casa !== casa || st.fecha !== fecha) return;
        st.cotiz = r2(x.valor); st.cotizFecha = x.fecha; st.cotizEstado = ""; mostrarCotiz(hoja);
      }).catch(function () { if (st.casa === casa && st.fecha === fecha) { st.cotizEstado = "error"; mostrarCotiz(hoja); } });
    }

    function html() {
      var gasto = st.tipo === "EXPENSE";
      var acento = gasto ? "var(--expense)" : "var(--income)";
      var h = (ed ? "<h3>Editar " + (gasto ? "gasto" : "ingreso") + "</h3>" :
        '<div class="segmento" style="margin-bottom:6px"><button data-h="tipo" data-v="EXPENSE" class="' + (gasto ? "sel" : "") + '">Gasto</button><button data-h="tipo" data-v="INCOME" class="' + (gasto ? "" : "sel") + '">Ingreso</button></div>');
      h += '<div class="segmento chicoSeg" style="margin-top:8px"><button data-h="moneda" data-v="ARS" class="' + (st.moneda === "ARS" ? "sel" : "") + '">$ Pesos</button><button data-h="moneda" data-v="USD" class="' + (st.moneda === "USD" ? "sel" : "") + '">US$ Dólares</button></div>';
      h += '<div class="montoGrande"><div class="chico">Monto en ' + (st.moneda === "USD" ? "dólares" : "pesos") + '</div><input id="hMonto" inputmode="decimal" placeholder="' + (st.moneda === "USD" ? "US$ 0" : "$ 0") + '" value="' + esc(st.monto) + '" autocomplete="off"><div class="chico" id="hCalc"></div></div>';
      if (usaCotiz()) {
        var ac = cuenta(st.cuenta), convierte = ac && !esMixta(ac) && ac.currency !== st.moneda;
        h += '<div class="detalle" style="margin-top:4px"><div class="entre"><b style="font-size:14px">' + (convierte ? "Se pasa a " + (ac.currency === "USD" ? "dólares" : "pesos") + " con el dólar de ese día" : "Dólar de ese día") + "</b>" + '<span class="muy-chico">' + fechaLarga(st.fecha) + "</span></div>" +
          '<div class="chips" style="margin-top:8px">' + DOLARES.map(function (o) {
            return '<button class="chip' + (st.casa === o[0] ? " sel" : "") + '" data-h="casa" data-v="' + o[0] + '">' + o[1] + "</button>";
          }).join("") + "</div>" +
          (st.casa ? '<div class="chico" id="hCotiz" style="margin-top:8px"></div>'
            : '<label class="campo" style="background:var(--surface)"><span>Pesos por dólar</span><input id="hCotizManual" inputmode="decimal" value="' + esc(st.cotizManual) + '" placeholder="Ej: 1.650"></label>') +
          '<div class="chico" id="hEquiv" style="margin-top:6px"></div></div>';
      }
      h += '<label class="campo"><span>Comercio o concepto</span><input id="hNombre" value="' + esc(st.nombre) + '" autocomplete="off" autocapitalize="sentences" placeholder="Ej: Supermercado"></label>';
      h += '<div class="chico" style="margin:12px 0 8px;font-weight:600;color:var(--fg)">Categoría</div><div class="chips" style="--acento:' + acento + '">' +
        categorias(st.tipo).map(function (c) { return '<button class="chip' + (c === st.cat ? " sel" : "") + '" data-h="cat" data-v="' + esc(c) + '"><span class="punto" style="background:' + colorCat(c) + '"></span>' + esc(c) + "</button>"; }).join("") +
        '<button class="chip" data-h="nuevaCat">+ Crear</button></div>';
      h += '<label class="campo"><span>' + (gasto ? "Cuenta de débito" : "Cuenta de destino") + '</span><select id="hCuenta">' + data.accounts.map(function (a) {
        return '<option value="' + esc(a.id) + '"' + (a.id === st.cuenta ? " selected" : "") + ">" + esc(a.name) + " · " + textoSaldo(a) + "</option>";
      }).join("") + "</select></label>";
      h += '<div class="entre" style="margin-top:12px"><b class="chico" style="color:var(--fg)">Fecha · ' + fechaLarga(st.fecha) + '</b></div><div class="chips" style="margin-top:8px">' +
        '<button class="chip' + (st.fecha === hoy() ? " sel" : "") + '" data-h="fecha" data-v="' + hoy() + '">Hoy</button>' +
        '<button class="chip' + (st.fecha === sumarDias(hoy(), -1) ? " sel" : "") + '" data-h="fecha" data-v="' + sumarDias(hoy(), -1) + '">Ayer</button>' +
        '<label class="chip" style="position:relative">Elegir…<input id="hFecha" type="date" value="' + st.fecha + '" max="' + hoy() + '" style="position:absolute;inset:0;opacity:0;width:100%"></label></div>';
      h += '<label class="campo"><span>Comentario (opcional)</span><textarea id="hComentario" rows="2">' + esc(st.comentario) + "</textarea></label>";
      if (st.items.length) {
        var suma = 0; st.items.forEach(function (i) { suma += i.amount; });
        h += '<div class="detalle"><b style="font-size:14px">Productos del ticket</b>' + st.items.map(function (i, k) {
          return '<div class="fila-p"><button data-h="item" data-v="' + k + '" style="text-align:left;flex:1">' + esc(i.name) + (i.quantity !== 1 ? ' <span class="muy-chico">× ' + plano(i.quantity) + "</span>" : "") + "</button><b>" + plata(i.amount) + '</b><button data-h="quitarItem" data-v="' + k + '" class="gasto" style="padding:0 4px">✕</button></div>';
        }).join("") + '<button class="link" data-h="item" data-v="-1" style="margin-top:6px">+ Agregar producto</button>' +
          '<div class="muy-chico" style="margin-top:6px">Suman ' + plata(suma) + "</div></div>";
      }
      h += '<div class="error" id="hError"></div><button class="btn" id="hGuardar">' + (ed ? "Guardar cambios" : gasto ? "Guardar gasto" : "Guardar ingreso") + "</button>";
      return h;
    }

    function montar(hoja) {
      hoja.innerHTML = '<div class="asa"></div>' + html();
      var monto = hoja.querySelector("#hMonto"), nombre = hoja.querySelector("#hNombre");
      function calc() {
        var v = leerMonto(monto.value);
        hoja.querySelector("#hCalc").textContent = esExpresion(monto.value) && v != null ? "= " + plata(v) : "";
      }
      calc();
      monto.oninput = function () { st.monto = monto.value; calc(); mostrarCotiz(hoja); };
      var manual = hoja.querySelector("#hCotizManual");
      if (manual) manual.oninput = function () { st.cotizManual = manual.value; mostrarCotiz(hoja); };
      // Editando: se mantiene la cotización guardada salvo que se cambie la fecha o el tipo de dólar.
      if (usaCotiz() && st.casa && !(ed && st.cotiz && st.fecha === ed.date && st.casa === ed.rateSource)) pedirCotiz(hoja);
      else mostrarCotiz(hoja);
      nombre.oninput = function () {
        st.nombre = nombre.value;
        if (!st.catTocada) {
          var s = sugerir(st.nombre, st.tipo);
          if (s !== st.cat) {
            st.cat = s;
            var chips = hoja.querySelectorAll('[data-h="cat"]');
            for (var i = 0; i < chips.length; i++) chips[i].classList.toggle("sel", chips[i].getAttribute("data-v") === s);
          }
        }
      };
      hoja.querySelector("#hCuenta").onchange = function (e) {
        st.cuenta = e.target.value;
        // La moneda sigue a la cuenta elegida, salvo que se haya elegido a mano (si no coincide, se convierte).
        if (!st.monedaTocada) st.moneda = monedasDe(cuenta(st.cuenta))[0];
        montar(hoja);
      };
      hoja.querySelector("#hComentario").oninput = function (e) { st.comentario = e.target.value; };
      hoja.querySelector("#hFecha").onchange = function (e) { if (e.target.value) { st.fecha = e.target.value; st.cotiz = null; montar(hoja); } };
      hoja.onclick = function (e) {
        var b = e.target.closest ? e.target.closest("[data-h]") : null;
        if (!b) return;
        var h = b.getAttribute("data-h"), v = b.getAttribute("data-v");
        if (h === "tipo") { st.tipo = v; if (!st.catTocada) st.cat = sugerir(st.nombre, st.tipo); else if (categorias(v).indexOf(st.cat) < 0) { st.cat = sugerir(st.nombre, v); st.catTocada = false; } montar(hoja); }
        else if (h === "cat") { st.cat = v; st.catTocada = true; montar(hoja); }
        else if (h === "fecha") { st.fecha = v; st.cotiz = null; montar(hoja); }
        else if (h === "moneda") { st.moneda = v; st.monedaTocada = true; montar(hoja); }
        else if (h === "casa") { st.casa = v; st.cotiz = null; montar(hoja); }
        else if (h === "nuevaCat") {
          var n = prompt("Nombre de la nueva categoría");
          if (n && n.trim()) { var c = agregarCategoria(st.tipo, n); if (c) { st.cat = c; st.catTocada = true; } montar(hoja); }
        } else if (h === "quitarItem") { st.items.splice(+v, 1); montar(hoja); }
        else if (h === "item") {
          var k = +v, it = k >= 0 ? st.items[k] : null;
          var nom = prompt("Producto", it ? it.name : "");
          if (nom == null || !nom.trim()) return;
          var pr = leerMonto(prompt("Precio (negativo si es descuento)", it ? plano(it.amount) : ""));
          if (pr == null) { aviso("Precio inválido."); return; }
          var nuevo = { name: nom.trim(), amount: r2(pr), quantity: it ? it.quantity : 1 };
          if (it) st.items[k] = nuevo; else st.items.push(nuevo);
          montar(hoja);
        }
      };
      hoja.querySelector("#hGuardar").onclick = function () {
        var v = leerMonto(st.monto);
        var err = hoja.querySelector("#hError");
        if (v == null || !(v > 0)) { err.textContent = "Ingresá un monto mayor a cero."; monto.focus(); return; }
        if (!st.cuenta || !cuenta(st.cuenta)) { err.textContent = "Elegí una cuenta."; return; }
        var nombreFinal = st.nombre.trim() || st.cat;
        var k = cotizActual();
        if (usaCotiz() && !(k > 0)) { err.textContent = st.cotizEstado === "buscando" ? "Esperá un segundo: se está buscando la cotización." : "Falta la cotización del dólar."; return; }
        var t = {
          id: ed ? ed.id : nuevoId("tx"), type: st.tipo, name: nombreFinal, amount: r2(v), category: st.cat,
          accountId: st.cuenta, date: st.fecha, comment: st.comentario.trim(), currency: st.moneda
        };
        if (usaCotiz()) { t.rate = r2(k); t.rateSource = st.casa || "manual"; }
        if (ed && ed.externalId) t.externalId = ed.externalId;
        if (st.items.length) t.items = st.items;
        if (ed) { editarMov(t); aviso("Cambios guardados."); }
        else { agregarMov(t); aviso((st.tipo === "EXPENSE" ? "Gasto" : "Ingreso") + " de " + plata(t.amount, t.currency) + " guardado."); }
        cerrarHoja();
        render();
      };
    }
    abrirHoja("", montar);
  }

  function agregarCategoria(tipo, nombre) {
    var limpio = nombre.trim();
    if (!limpio) return null;
    var exist = categorias(tipo).filter(function (c) { return c.toLowerCase() === limpio.toLowerCase(); });
    if (exist.length) return exist[0];
    (tipo === "EXPENSE" ? data.customExpense : data.customIncome).push(limpio);
    guardar();
    return limpio;
  }

  // ---------- Hoja: detalle ----------

  function hojaDetalle(id) {
    var t = null;
    data.transactions.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return;
    var a = cuenta(t.accountId), gasto = t.type === "EXPENSE", mon = monedaTx(t);
    var h = '<div style="text-align:center"><div style="display:flex;justify-content:center">' + iconoCat(t.category, 56) + "</div>" +
      '<div style="font-weight:600;margin-top:10px">' + esc(t.name) + '</div><div style="font-size:34px;font-weight:800;letter-spacing:-1px" class="' + (gasto ? "" : "ingreso") + '">' + plata(gasto ? -t.amount : t.amount, mon, !gasto) + "</div></div>";
    h += '<div style="margin-top:14px"><div class="clave"><span>Tipo</span><span>' + (gasto ? "Gasto" : "Ingreso") + '</span></div><div class="clave"><span>Categoría</span><span>' + esc(t.category) + "</span></div>" +
      '<div class="clave"><span>Cuenta</span><span>' + esc(a ? a.name : "—") + '</span></div><div class="clave"><span>Fecha</span><span>' + fechaLarga(t.date) + "</span></div>" +
      (mon === "USD" || (a && !esMixta(a) && a.currency !== mon) ? '<div class="clave"><span>Cotización</span><span>' + (t.rateSource && t.rateSource !== "manual" ? "Dólar " + nombreDolar(t.rateSource).toLowerCase() + " " : "") + "$" + numero(cotizTx(t), 2, true) + "</span></div>" +
        '<div class="clave"><span>En pesos</span><span>' + plata(montoPesos(t)) + "</span></div>" : "") +
      (t.comment ? '<div class="clave"><span>Comentario</span><span>' + esc(t.comment) + "</span></div>" : "") + "</div>";
    if (t.items && t.items.length) {
      var suma = 0; t.items.forEach(function (i) { suma += i.amount; });
      var resto = r2(t.amount - suma);
      h += '<div class="detalle"><b style="font-size:14px">Detalle · ' + t.items.length + " productos</b>" + t.items.map(function (i) {
        return '<div class="fila-p"><span>' + esc(i.name) + (i.quantity !== 1 ? ' <span class="muy-chico">× ' + plano(i.quantity) + "</span>" : "") + '</span><b class="' + (i.amount < 0 ? "ingreso" : "") + '">' + plata(i.amount, mon, i.amount < 0) + "</b></div>";
      }).join("") + (Math.abs(resto) >= 0.01 ? '<div class="fila-p" style="color:var(--warning)"><i>' + (resto > 0 ? "Sin detallar" : "Productos de más") + "</i><b>" + plata(resto, mon, resto < 0) + "</b></div>" : "") + "</div>";
    }
    h += '<div class="botones"><button class="btn suave" data-d="editar">Editar</button><button class="btn suave" data-d="repetir">Repetir</button><button class="btn peligro" data-d="borrar">Borrar</button></div>';
    abrirHoja(h, function (hoja) {
      hoja.onclick = function (e) {
        var b = e.target.closest ? e.target.closest("[data-d]") : null;
        if (!b) return;
        var d = b.getAttribute("data-d");
        if (d === "editar") hojaMovimiento({ editar: t });
        else if (d === "repetir") hojaMovimiento({ tipo: t.type, monto: plano(t.amount), nombre: t.name, cat: t.category, cuenta: t.accountId, moneda: monedaTx(t) });
        else if (d === "borrar") {
          if (!confirm("¿Borrar " + (gasto ? "el gasto" : "el ingreso") + " \"" + t.name + "\" de " + plata(t.amount, mon) + "? El saldo de la cuenta se ajusta.")) return;
          borrarMov(t.id); cerrarHoja(); render(); aviso("Movimiento borrado.");
        }
      };
    });
  }

  // ---------- Hoja: transferir ----------

  function hojaTransferir() {
    var hayDos = data.accounts.length > 1 || data.accounts.some(esMixta);
    if (!hayDos) { aviso("Necesitás al menos dos cuentas (o una mixta) para transferir."); return; }
    var de = cuentaPred() || data.accounts[0];
    var otra = data.accounts.filter(function (x) { return x.id !== de.id; })[0] || de;
    var st = { de: de.id, monDe: monedasDe(de)[0], a: otra.id, monA: null, casa: data.usdAuto || "oficial", cotiz: null, cotizManual: "", estado: "" };
    function hoja() { return hojaAbierta; }
    function opciones(sel) {
      return data.accounts.map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === sel ? " selected" : "") + ">" + esc(a.name) + " · " + textoSaldo(a) + "</option>"; }).join("");
    }
    function segMoneda(id, posibles, actual) {
      if (posibles.length < 2) return "";
      return '<div class="segmento chicoSeg" style="margin-top:6px">' + posibles.map(function (m) {
        return '<button data-t="' + id + '" data-v="' + m + '" class="' + (m === actual ? "sel" : "") + '">' + (m === "USD" ? "US$ Dólares" : "$ Pesos") + "</button>";
      }).join("") + "</div>";
    }
    function calcular() {
      var dA = cuenta(st.a), posA = monedasDe(dA);
      st.monA = posA.indexOf(st.monDe) >= 0 ? (st.monA && posA.indexOf(st.monA) >= 0 && esMixta(dA) ? st.monA : st.monDe) : posA[0];
    }
    function pintar() {
      calcular();
      var convierte = st.monDe !== st.monA;
      var h = '<h3>Transferir</h3><label class="campo"><span>Desde</span><select id="tDe">' + opciones(st.de) + "</select></label>" + segMoneda("monDe", monedasDe(cuenta(st.de)), st.monDe) +
        '<label class="campo"><span>Hacia</span><select id="tA">' + opciones(st.a) + "</select></label>" + segMoneda("monA", monedasDe(cuenta(st.a)), st.monA) +
        '<label class="campo"><span>Monto en ' + (st.monDe === "USD" ? "dólares" : "pesos") + '</span><input id="tMonto" inputmode="decimal" placeholder="0" autocomplete="off"></label>';
      if (convierte) {
        h += '<div class="detalle"><b style="font-size:14px">' + (st.monDe === "ARS" ? "Compra de dólares" : "Venta de dólares") + '</b><div class="chips" style="margin-top:8px">' + DOLARES.map(function (o) {
          return '<button class="chip' + (st.casa === o[0] ? " sel" : "") + '" data-t="casa" data-v="' + o[0] + '">' + o[1] + "</button>";
        }).join("") + "</div>" + (st.casa ? '<div class="chico" id="tCotiz" style="margin-top:8px"></div>' : '<label class="campo" style="background:var(--surface)"><span>Pesos por dólar</span><input id="tManual" inputmode="decimal" value="' + esc(st.cotizManual) + '"></label>') + "</div>";
      }
      h += '<div class="chico" id="tConv" style="margin-top:8px"></div><div class="error" id="tError"></div><button class="btn" id="tOk">Transferir</button>';
      var monto = hoja().querySelector("#tMonto");
      var previo = monto ? monto.value : "";
      hoja().innerHTML = '<div class="asa"></div>' + h;
      hoja().querySelector("#tMonto").value = previo;
      enganchar();
      if (convierte && st.casa) pedir(); else mostrar();
    }
    function cotiz() { return st.casa ? st.cotiz : leerMonto(st.cotizManual); }
    function mostrar() {
      var c = hoja().querySelector("#tCotiz");
      if (c) c.textContent = st.estado === "buscando" ? "Buscando la cotización…" : st.estado === "error" ? "Sin conexión: elegí Manual." : st.cotiz ? "Dólar " + nombreDolar(st.casa).toLowerCase() + " de hoy: $" + numero(st.cotiz, 2, true) : "";
      var v = leerMonto(hoja().querySelector("#tMonto").value), k = cotiz(), conv = hoja().querySelector("#tConv");
      if (!(v > 0)) { conv.textContent = ""; return; }
      if (st.monDe === st.monA) { conv.textContent = "Llegan " + plata(v, st.monA) + " a " + cuenta(st.a).name; return; }
      conv.textContent = k > 0 ? "Llegan " + plata(st.monDe === "ARS" ? v / k : v * k, st.monA) + " a " + cuenta(st.a).name : "";
    }
    function pedir() {
      var casa = st.casa;
      st.estado = "buscando"; mostrar();
      cotizacionDe(hoy(), casa).then(function (x) { if (st.casa === casa) { st.cotiz = r2(x.valor); st.estado = ""; mostrar(); } })
        .catch(function () { if (st.casa === casa) { st.estado = "error"; mostrar(); } });
    }
    function enganchar() {
      var h = hoja();
      h.querySelector("#tDe").onchange = function (e) { st.de = e.target.value; st.monDe = monedasDe(cuenta(st.de))[0]; pintar(); };
      h.querySelector("#tA").onchange = function (e) { st.a = e.target.value; st.monA = null; pintar(); };
      h.querySelector("#tMonto").oninput = mostrar;
      var man = h.querySelector("#tManual");
      if (man) man.oninput = function () { st.cotizManual = man.value; mostrar(); };
      h.querySelector("#tOk").onclick = function () {
        var err = transferir(st.de, st.monDe, st.a, st.monA, leerMonto(h.querySelector("#tMonto").value), cotiz());
        if (err) { h.querySelector("#tError").textContent = err; return; }
        cerrarHoja(); render(); aviso("Transferencia hecha.");
      };
      h.onclick = function (e) {
        var b = e.target.closest ? e.target.closest("[data-t]") : null;
        if (!b) return;
        var t = b.getAttribute("data-t"), v = b.getAttribute("data-v");
        if (t === "monDe") st.monDe = v; else if (t === "monA") st.monA = v; else if (t === "casa") { st.casa = v; st.cotiz = null; }
        pintar();
      };
    }
    abrirHoja("");
    pintar();
  }

  // ---------- Hoja: Divisas (comprar o vender dólares; no es gasto ni ingreso) ----------

  function aceptaPesos(a) { return esMixta(a) || a.currency !== "USD"; }
  function aceptaDolares(a) { return esMixta(a) || a.currency === "USD"; }
  function cambiar(x, signo) {
    var de = cuenta(x.fromId), a = cuenta(x.toId);
    var compra = x.type === "COMPRA";
    if (de) sumarSaldo(de, compra ? "ARS" : "USD", -signo * (compra ? x.pesos : x.usd));
    if (a) sumarSaldo(a, compra ? "USD" : "ARS", signo * (compra ? x.usd : x.pesos));
  }

  function hojaDivisas() {
    var conPesos = data.accounts.filter(aceptaPesos), conDolares = data.accounts.filter(aceptaDolares);
    if (!conDolares.length) {
      abrirHoja('<h3>Divisas</h3><div class="chico">Para comprar o vender dólares necesitás una cuenta en dólares o una mixta (pesos y dólares).</div><button class="btn" data-z="crear">Crear cuenta en dólares</button>', function (hoja) {
        hoja.onclick = function (e) { if (e.target.closest && e.target.closest("[data-z]")) hojaCuenta(null); };
      });
      return;
    }
    // Si no hay pesos para comprar pero sí dólares, arranca en "Vender dólares".
    var hayPesos = conPesos.some(function (a) { return saldo(a, "ARS") > 0.005; }), hayDolares = conDolares.some(function (a) { return saldo(a, "USD") > 0.005; });
    var st = { tipo: !hayPesos && hayDolares ? "VENTA" : "COMPRA", de: null, a: null, usd: "", casa: data.usdAuto || "oficial", cotiz: null, cotizFecha: null, manual: "", estado: "", fecha: hoy() };
    function cuentasDe() { return st.tipo === "COMPRA" ? conPesos : conDolares; }
    function cuentasA() { return st.tipo === "COMPRA" ? conDolares : conPesos; }
    function elegirCuentas() {
      var de = cuentasDe(), a = cuentasA(), mon = st.tipo === "COMPRA" ? "ARS" : "USD";
      if (!de.some(function (x) { return x.id === st.de; })) {
        // Por defecto, la cuenta que tiene esa moneda (la predeterminada si tiene; si no, la que más tiene).
        var con = de.filter(function (x) { return saldo(x, mon) > 0.005; }).sort(function (p, q) { return saldo(q, mon) - saldo(p, mon); });
        st.de = ((con.filter(function (x) { return x["default"]; })[0]) || con[0] || de[0] || {}).id;
        st.aTocado = false;
      }
      if (!st.aTocado || !a.some(function (x) { return x.id === st.a; })) {
        // Si sale de una mixta, por defecto va a la misma (de su parte en una moneda a la otra).
        var misma = esMixta(cuenta(st.de)) ? a.filter(function (x) { return x.id === st.de; })[0] : null;
        st.a = (misma || a.filter(function (x) { return x.id !== st.de && x["default"]; })[0] || a.filter(function (x) { return x.id !== st.de; })[0] || a[0] || {}).id;
      }
    }
    function lado() { return st.tipo === "COMPRA" ? "venta" : "compra"; }
    function cotiz() { return st.casa ? st.cotiz : leerMonto(st.manual); }
    function opciones(lista, sel) {
      return lista.map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === sel ? " selected" : "") + ">" + esc(a.name) + " · " + textoSaldo(a) + "</option>"; }).join("");
    }
    function pintar() {
      elegirCuentas();
      var compra = st.tipo === "COMPRA";
      var h = '<h3>Divisas</h3><div class="segmento"><button data-z="tipo" data-v="COMPRA" class="' + (compra ? "sel" : "") + '">Comprar dólares</button><button data-z="tipo" data-v="VENTA" class="' + (compra ? "" : "sel") + '">Vender dólares</button></div>';
      var conSaldo = cuentasDe().filter(function (a) { return saldo(a, compra ? "ARS" : "USD") > 0.005; });
      if (cuentasDe().length && !conSaldo.length) {
        h += '<div class="chico" style="margin-top:14px">No tenés ' + (compra ? "pesos para comprar dólares" : "dólares para vender") + ". Así están tus cuentas:</div>" +
          '<div class="detalle">' + data.accounts.map(function (a) { return '<div class="clave"><span>' + esc(a.name) + " (" + tipoCuenta(a) + ")</span><span>" + textoSaldo(a) + "</span></div>"; }).join("") + "</div>" +
          '<div class="muy-chico" style="margin-top:8px">' + (compra ? "Cargá pesos en una cuenta" : "Para tener dólares en una cuenta mixta, al cargar el ingreso tocá <b>US$ Dólares</b> (si no, se guarda en pesos). Si los cargaste en pesos por error, abrí ese movimiento, tocá Editar y cambialo a US$.") + "</div>";
        hojaAbierta.innerHTML = '<div class="asa"></div>' + h; hojaAbierta.onclick = alTocar; return;
      }
      if (!cuentasDe().length || !cuentasA().length) {
        h += '<div class="chico" style="margin-top:12px">Necesitás una cuenta con ' + (compra ? "pesos" : "dólares") + " para " + (compra ? "pagar" : "vender") + ".</div>";
        hojaAbierta.innerHTML = '<div class="asa"></div>' + h; hojaAbierta.onclick = alTocar; return;
      }
      h += '<div class="montoGrande"><div class="chico">Dólares que ' + (compra ? "comprás" : "vendés") + '</div><input id="zUsd" inputmode="decimal" placeholder="US$ 0" value="' + esc(st.usd) + '" autocomplete="off"></div>';
      h += '<label class="campo"><span>' + (compra ? "Pagás con (pesos de)" : "Salen los dólares de") + '</span><select id="zDe">' + opciones(cuentasDe(), st.de) + "</select></label>";
      h += '<label class="campo"><span>' + (compra ? "Los dólares van a" : "Los pesos van a") + '</span><select id="zA">' + opciones(cuentasA(), st.a) + "</select></label>";
      h += '<div class="detalle"><div class="entre"><b style="font-size:14px">Dólar ' + (compra ? "(precio de venta)" : "(precio de compra)") + '</b><span class="muy-chico">' + fechaLarga(st.fecha) + "</span></div>" +
        '<div class="chips" style="margin-top:8px">' + DOLARES.map(function (o) { return '<button class="chip' + (st.casa === o[0] ? " sel" : "") + '" data-z="casa" data-v="' + o[0] + '">' + o[1] + "</button>"; }).join("") + "</div>" +
        (st.casa ? '<div class="chico" id="zCotiz" style="margin-top:8px"></div>' : '<label class="campo" style="background:var(--surface)"><span>Pesos por dólar</span><input id="zManual" inputmode="decimal" value="' + esc(st.manual) + '"></label>') + "</div>";
      h += '<div class="chips" style="margin-top:12px"><button class="chip' + (st.fecha === hoy() ? " sel" : "") + '" data-z="fecha" data-v="' + hoy() + '">Hoy</button><button class="chip' + (st.fecha === sumarDias(hoy(), -1) ? " sel" : "") + '" data-z="fecha" data-v="' + sumarDias(hoy(), -1) + '">Ayer</button>' +
        '<label class="chip" style="position:relative">Otro día…<input id="zFecha" type="date" value="' + st.fecha + '" max="' + hoy() + '" style="position:absolute;inset:0;opacity:0;width:100%"></label></div>';
      h += '<div class="detalle" id="zResumen" style="margin-top:12px"></div><div class="error" id="zError"></div><button class="btn" id="zOk">' + (compra ? "Comprar dólares" : "Vender dólares") + "</button>";
      hojaAbierta.innerHTML = '<div class="asa"></div>' + h;
      enganchar();
      if (st.casa) pedir(); else mostrar();
    }
    function mostrar() {
      var hj = hojaAbierta, c = hj.querySelector("#zCotiz");
      if (c) c.textContent = st.estado === "buscando" ? "Buscando la cotización…" : st.estado === "error" ? "Sin conexión: elegí Manual." :
        st.cotiz ? "Dólar " + nombreDolar(st.casa).toLowerCase() + ": $" + numero(st.cotiz, 2, true) + (st.cotizFecha && st.cotizFecha !== st.fecha ? " (del " + fechaLarga(st.cotizFecha) + ")" : "") : "";
      var res = hj.querySelector("#zResumen"), v = leerMonto(st.usd), k = cotiz();
      if (!res) return;
      if (!(v > 0) || !(k > 0)) { res.innerHTML = '<span class="chico">Poné cuántos dólares y la cotización.</span>'; return; }
      var compra = st.tipo === "COMPRA", de = cuenta(st.de), a = cuenta(st.a), pesos = v * k;
      var disp = saldo(de, compra ? "ARS" : "USD"), falta = (compra ? pesos : v) > disp + 0.005;
      res.innerHTML = '<div class="clave"><span>' + (compra ? "Pagás" : "Entregás") + '</span><span class="gasto">' + (compra ? plata(pesos) : plata(v, "USD")) + " de " + esc(de.name) + "</span></div>" +
        '<div class="clave"><span>Recibís</span><span class="ingreso">' + (compra ? plata(v, "USD") : plata(pesos)) + " en " + esc(a.name) + "</span></div>" +
        '<div class="muy-chico" style="' + (falta ? "color:var(--expense);font-weight:700" : "") + '">' + (falta ? "No alcanza: " : "Disponible: ") + plata(Math.max(0, disp), compra ? "ARS" : "USD") + " en " + esc(de.name) + "</div>";
      var ok = hojaAbierta.querySelector("#zOk");
      if (ok) ok.disabled = falta;
    }
    function pedir() {
      var casa = st.casa, fecha = st.fecha, l = lado();
      st.estado = "buscando"; mostrar();
      cotizacionDe(fecha, casa, l).then(function (x) {
        if (st.casa === casa && st.fecha === fecha && lado() === l) { st.cotiz = r2(x.valor); st.cotizFecha = x.fecha; st.estado = ""; mostrar(); }
      }).catch(function () { if (st.casa === casa) { st.estado = "error"; mostrar(); } });
    }
    /** Botones de la hoja (Comprar/Vender, tipo de dólar, fecha): andan también cuando se muestra solo un aviso. */
    function alTocar(e) {
      var b = e.target.closest ? e.target.closest("[data-z]") : null;
      if (!b) return;
      var z = b.getAttribute("data-z"), v = b.getAttribute("data-v");
      if (z === "tipo") { st.tipo = v; st.cotiz = null; st.de = null; st.aTocado = false; pintar(); }
      else if (z === "casa") { st.casa = v; st.cotiz = null; pintar(); }
      else if (z === "fecha") { st.fecha = v; st.cotiz = null; pintar(); }
    }
    function enganchar() {
      var hj = hojaAbierta;
      hj.querySelector("#zUsd").oninput = function (e) { st.usd = e.target.value; mostrar(); };
      hj.querySelector("#zDe").onchange = function (e) { st.de = e.target.value; pintar(); };
      hj.querySelector("#zA").onchange = function (e) { st.a = e.target.value; st.aTocado = true; mostrar(); };
      hj.querySelector("#zFecha").onchange = function (e) { if (e.target.value) { st.fecha = e.target.value; st.cotiz = null; pintar(); } };
      var man = hj.querySelector("#zManual");
      if (man) man.oninput = function () { st.manual = man.value; mostrar(); };
      hj.onclick = alTocar;
      hj.querySelector("#zOk").onclick = function () {
        var v = leerMonto(st.usd), k = cotiz(), err = hj.querySelector("#zError");
        if (!(v > 0)) { err.textContent = "Poné cuántos dólares."; return; }
        if (!(k > 0)) { err.textContent = st.estado === "buscando" ? "Esperá: se está buscando la cotización." : "Falta la cotización."; return; }
        if (st.de === st.a && !esMixta(cuenta(st.de))) { err.textContent = "Elegí dos cuentas distintas."; return; }
        var compra = st.tipo === "COMPRA", de = cuenta(st.de), pesos = r2(v * k);
        var disponible = saldo(de, compra ? "ARS" : "USD"), necesita = compra ? pesos : v;
        if (disponible < necesita - 0.005) {
          err.textContent = "No alcanza: en " + de.name + " hay " + plata(Math.max(0, disponible), compra ? "ARS" : "USD") + " y " + (compra ? "la compra necesita " : "querés vender ") + plata(necesita, compra ? "ARS" : "USD") + ".";
          return;
        }
        var x = { id: nuevoId("fx"), date: st.fecha, type: st.tipo, usd: r2(v), rate: r2(k), rateSource: st.casa || "manual", pesos: pesos, fromId: st.de, toId: st.a };
        data.exchanges = data.exchanges || [];
        data.exchanges.unshift(x);
        data.exchanges.sort(function (p, q) { return p.date < q.date ? 1 : p.date > q.date ? -1 : 0; });
        cambiar(x, 1);
        guardar(); cerrarHoja(); render();
        aviso((compra ? "Compraste " : "Vendiste ") + plata(x.usd, "USD") + " a $" + numero(x.rate, 2, true) + ".");
      };
    }
    abrirHoja("");
    pintar();
  }

  function filaCambio(x, mostrarFecha) {
    var compra = x.type === "COMPRA", de = cuenta(x.fromId), a = cuenta(x.toId);
    return '<button class="mov" data-acc="cambio" data-id="' + esc(x.id) + '"><span class="icono" style="background:var(--pcont);color:var(--primary)">' + ICON.divisas + "</span>" +
      '<span class="txt"><div class="nom">' + (compra ? "Compra de dólares" : "Venta de dólares") + '</div><div class="sub">' + esc(de ? de.name : "—") + " → " + esc(a ? a.name : "—") + " · $" + numero(x.rate, 2, true) + "</div></span>" +
      '<span class="der"><div class="m ' + (compra ? "ingreso" : "gasto") + '">' + plata(compra ? x.usd : -x.usd, "USD", compra) + '</div><div class="muy-chico">' + plata(compra ? -x.pesos : x.pesos, "ARS", !compra) + (mostrarFecha ? " · " + fechaCorta(x.date) : "") + "</div></span></button>";
  }

  function hojaCambio(id) {
    var x = (data.exchanges || []).filter(function (y) { return y.id === id; })[0];
    if (!x) return;
    var compra = x.type === "COMPRA", de = cuenta(x.fromId), a = cuenta(x.toId);
    var h = "<h3>" + (compra ? "Compra de dólares" : "Venta de dólares") + "</h3>" +
      '<div class="clave"><span>Dólares</span><span>' + plata(x.usd, "USD") + '</span></div><div class="clave"><span>Pesos</span><span>' + plata(x.pesos) + "</span></div>" +
      '<div class="clave"><span>Cotización</span><span>' + (x.rateSource !== "manual" ? "Dólar " + nombreDolar(x.rateSource).toLowerCase() + " " : "") + "$" + numero(x.rate, 2, true) + "</span></div>" +
      '<div class="clave"><span>' + (compra ? "Pagaste con" : "Salieron de") + "</span><span>" + esc(de ? de.name : "—") + '</span></div><div class="clave"><span>' + (compra ? "Los dólares fueron a" : "Los pesos fueron a") + "</span><span>" + esc(a ? a.name : "—") + "</span></div>" +
      '<div class="clave"><span>Fecha</span><span>' + fechaLarga(x.date) + "</span></div>" +
      '<div class="clave"><span>Hoy valen</span><span>' + plata(x.usd * data.usdRate) + " (" + plata(x.usd * data.usdRate - x.pesos, "ARS", true) + ")</span></div>" +
      '<button class="btn peligro" data-z="borrar">Borrar operación</button>';
    abrirHoja(h, function (hoja) {
      hoja.onclick = function (e) {
        if (!(e.target.closest && e.target.closest('[data-z="borrar"]'))) return;
        if (!confirm("¿Borrar esta " + (compra ? "compra" : "venta") + "? Los saldos de las cuentas vuelven a como estaban.")) return;
        cambiar(x, -1);
        data.exchanges = data.exchanges.filter(function (y) { return y.id !== x.id; });
        guardar(); cerrarHoja(); render(); aviso("Operación borrada.");
      };
    });
  }

  // ---------- Hoja: cuenta ----------

  /** Cambia el tipo de cuenta (pesos, dólares o mixta). Devuelve un mensaje si no se puede sin perder plata. */
  function cambiarTipo(a, nuevo) {
    if (nuevo === a.currency) return null;
    var viejo = a.currency;
    if (viejo === "MIXTA" && nuevo === "ARS" && (a.balanceUsd || 0) > 0.005) return "Tiene " + plata(a.balanceUsd, "USD") + ": vendelos con Divisas o pasalos a otra cuenta antes.";
    if (viejo === "MIXTA" && nuevo === "USD" && a.balance > 0.005) return "Tiene " + plata(a.balance) + " en pesos: pasalos a otra cuenta o compra dólares antes.";
    if (viejo !== "MIXTA" && nuevo !== "MIXTA" && Math.abs(a.balance) > 0.005) return "Para pasarla de " + (viejo === "USD" ? "dólares a pesos" : "pesos a dólares") + " el saldo tiene que estar en 0 (o elegí Mixta).";
    // Los movimientos viejos guardan su moneda, así no cambian de significado.
    data.transactions.forEach(function (t) { if (t.accountId === a.id && !t.currency) t.currency = viejo === "MIXTA" ? "ARS" : viejo; });
    if (nuevo === "MIXTA") { if (viejo === "USD") { a.balanceUsd = a.balance; a.balance = 0; } else a.balanceUsd = 0; }
    else if (viejo === "MIXTA") { if (nuevo === "USD") a.balance = a.balanceUsd || 0; delete a.balanceUsd; }
    a.currency = nuevo;
    return null;
  }

  function hojaCuenta(id) {
    var a = id ? cuenta(id) : null;
    if (!a) {
      var h = '<h3>Nueva cuenta</h3><label class="campo"><span>Nombre</span><input id="cNombre" placeholder="Ej: Banco, Mercado Pago" autocapitalize="words"></label>' +
        '<div class="chico" style="margin:12px 4px 6px;font-weight:600;color:var(--fg)">Moneda de la cuenta</div>' +
        '<div class="segmento"><button data-c="ARS" class="sel">Pesos</button><button data-c="USD">Dólares</button><button data-c="MIXTA">Mixta</button></div>' +
        '<div class="muy-chico" id="cAyuda" style="margin:6px 4px 0">Solo se cargan pesos.</div>' +
        '<label class="campo"><span id="cSaldoTit">Saldo actual en pesos</span><input id="cSaldo" inputmode="decimal" placeholder="0"></label>' +
        '<label class="campo" id="cSaldoUsdCampo" style="display:none"><span>Saldo actual en dólares</span><input id="cSaldoUsd" inputmode="decimal" placeholder="0"></label>' +
        '<div style="padding:0 4px"><label class="interruptor"><span>Dejar fuera del patrimonio total</span><input type="checkbox" id="cExcluir"></label>' +
        '<label class="interruptor"><span>Usar como predeterminada</span><input type="checkbox" id="cPred"></label></div><div class="error" id="cError"></div><button class="btn" id="cOk">Crear cuenta</button>';
      var moneda = "ARS";
      abrirHoja(h, function (hoja) {
        hoja.onclick = function (e) {
          var b = e.target.closest ? e.target.closest("[data-c]") : null;
          if (!b) return;
          moneda = b.getAttribute("data-c");
          var bs = hoja.querySelectorAll("[data-c]");
          for (var i = 0; i < bs.length; i++) bs[i].classList.toggle("sel", bs[i] === b);
          hoja.querySelector("#cAyuda").textContent = moneda === "MIXTA" ? "Se cargan pesos y dólares, cada uno con su saldo." : moneda === "USD" ? "Solo se cargan dólares." : "Solo se cargan pesos.";
          hoja.querySelector("#cSaldoTit").textContent = moneda === "USD" ? "Saldo actual en dólares" : "Saldo actual en pesos";
          hoja.querySelector("#cSaldoUsdCampo").style.display = moneda === "MIXTA" ? "" : "none";
        };
        hoja.querySelector("#cOk").onclick = function () {
          var nombre = hoja.querySelector("#cNombre").value.trim();
          if (!nombre) { hoja.querySelector("#cError").textContent = "Poné un nombre."; return; }
          var saldo = leerMonto(hoja.querySelector("#cSaldo").value) || 0;
          var pred = hoja.querySelector("#cPred").checked || !data.accounts.length;
          if (pred) data.accounts.forEach(function (x) { x["default"] = false; });
          var nueva = { id: nuevoId("acc"), name: nombre, balance: r2(saldo), currency: moneda, exclude: hoja.querySelector("#cExcluir").checked, "default": pred };
          if (moneda === "MIXTA") nueva.balanceUsd = r2(leerMonto(hoja.querySelector("#cSaldoUsd").value) || 0);
          data.accounts.push(nueva);
          guardar(); cerrarHoja(); render(); aviso("Cuenta creada.");
        };
      });
      return;
    }
    var n = data.transactions.filter(function (t) { return t.accountId === a.id; }).length;
    var h2 = '<h3>' + esc(a.name) + '</h3><div style="font-size:' + (esMixta(a) ? 24 : 30) + 'px;font-weight:800">' + textoSaldo(a) + '</div><div class="chico">' + n + " movimientos · " + tipoCuenta(a) + "</div>" +
      '<label class="campo" style="margin-top:14px"><span>Nombre</span><input id="cNombre" value="' + esc(a.name) + '"></label>' +
      '<div class="chico" style="margin:12px 4px 6px;font-weight:600;color:var(--fg)">Tipo de cuenta</div><div class="segmento" id="cTipo">' +
      [["ARS", "Pesos"], ["USD", "Dólares"], ["MIXTA", "Mixta"]].map(function (o) { return '<button data-tc="' + o[0] + '" class="' + (a.currency === o[0] ? "sel" : "") + '">' + o[1] + "</button>"; }).join("") + "</div>" +
      '<label class="campo"><span>Ajustar saldo en ' + (a.currency === "USD" ? "dólares" : "pesos") + ' (si no coincide con el real)</span><input id="cSaldo" inputmode="decimal" value="' + esc(plano(a.balance)) + '"></label>' +
      (esMixta(a) ? '<label class="campo"><span>Ajustar saldo en dólares</span><input id="cSaldoUsd" inputmode="decimal" value="' + esc(plano(a.balanceUsd || 0)) + '"></label>' : "") +
      '<div style="padding:0 4px"><label class="interruptor"><span>Dejar fuera del patrimonio total</span><input type="checkbox" id="cExcluir"' + (a.exclude ? " checked" : "") + "></label>" +
      '<label class="interruptor"><span>Cuenta predeterminada</span><input type="checkbox" id="cPred"' + (a["default"] ? " checked disabled" : "") + "></label></div>" +
      '<div class="error" id="cError"></div><button class="btn" id="cOk">Guardar</button><button class="btn peligro" id="cBorrar">Borrar cuenta</button>';
    var tipoNuevo = a.currency;
    abrirHoja(h2, function (hoja) {
      hoja.querySelector("#cTipo").onclick = function (e) {
        var b = e.target.closest ? e.target.closest("[data-tc]") : null;
        if (!b) return;
        tipoNuevo = b.getAttribute("data-tc");
        var bs = hoja.querySelectorAll("[data-tc]");
        for (var i = 0; i < bs.length; i++) bs[i].classList.toggle("sel", bs[i] === b);
      };
      hoja.querySelector("#cOk").onclick = function () {
        var nombre = hoja.querySelector("#cNombre").value.trim();
        if (nombre) a.name = nombre;
        var s = leerMonto(hoja.querySelector("#cSaldo").value);
        if (s != null) a.balance = r2(s);
        var su = hoja.querySelector("#cSaldoUsd");
        if (su) { var vu = leerMonto(su.value); if (vu != null) a.balanceUsd = r2(vu); }
        a.exclude = hoja.querySelector("#cExcluir").checked;
        if (hoja.querySelector("#cPred").checked) data.accounts.forEach(function (x) { x["default"] = x.id === a.id; });
        var errTipo = cambiarTipo(a, tipoNuevo);
        if (errTipo) { guardar(); hoja.querySelector("#cError").textContent = errTipo; return; }
        guardar(); cerrarHoja(); render(); aviso("Cuenta guardada.");
      };
      hoja.querySelector("#cBorrar").onclick = function () {
        if (data.accounts.length <= 1) { aviso("Tiene que quedar al menos una cuenta."); return; }
        if (!confirm("¿Borrar la cuenta \"" + a.name + "\" y sus " + n + " movimientos? No se puede deshacer.")) return;
        data.accounts = data.accounts.filter(function (x) { return x.id !== a.id; });
        data.transactions = data.transactions.filter(function (t) { return t.accountId !== a.id; });
        data.exchanges = (data.exchanges || []).filter(function (x) { return x.fromId !== a.id && x.toId !== a.id; });
        if (!data.accounts.some(function (x) { return x["default"]; })) data.accounts[0]["default"] = true;
        guardar(); cerrarHoja(); render(); aviso("Cuenta borrada.");
      };
    });
  }

  // ---------- Copia de seguridad ----------

  function exportar() {
    var texto = JSON.stringify(data);
    var nombre = "finanzas-" + hoy() + ".json";
    try {
      var archivo = new File([texto], nombre, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        navigator.share({ files: [archivo], title: "Copia de mis finanzas" }).catch(function () {});
        return;
      }
    } catch (e) {}
    var url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    var link = document.createElement("a");
    link.href = url; link.download = nombre;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function importar(archivo) {
    var lector = new FileReader();
    lector.onload = function () {
      var d = null;
      try { d = JSON.parse(lector.result); } catch (e) {}
      if (!d || !d.accounts || !d.transactions) { aviso("Ese archivo no es una copia de la app."); return; }
      if (!confirm("¿Reemplazar los datos de este iPhone por la copia (" + d.transactions.length + " movimientos)? Lo actual se pierde.")) return;
      data = d; data = cargarDesde(d); guardar(); render(); aviso("Copia cargada.");
    };
    lector.readAsText(archivo);
  }
  function cargarDesde(d) {
    d.customExpense = d.customExpense || []; d.customIncome = d.customIncome || []; d.exchanges = d.exchanges || []; d.categoryMemory = d.categoryMemory || {};
    if (typeof d.usdRate !== "number") d.usdRate = 1280;
    return d;
  }

  // ---------- Hoja: cuentas (botón arriba a la derecha) ----------

  function hojaCuentas() {
    var ten = tenencias();
    var h = '<h3>Cuentas</h3><div class="chico">Pesos ' + plata(ten.pesos) + " · Dólares " + plata(ten.dolares, "USD") + "</div>" +
      '<div class="lista" style="margin-top:12px;box-shadow:none;background:var(--variant)">' + data.accounts.map(function (a) {
        return '<button class="mov" data-k="' + esc(a.id) + '"><span class="icono" style="background:var(--pcont);color:var(--primary)">' + ICON.billetera + "</span>" +
          '<span class="txt"><div class="nom">' + esc(a.name) + '</div><div class="sub">' + tipoCuenta(a) +
          (a["default"] ? " · Predeterminada" : "") + (a.exclude ? " · Fuera del total" : "") + '</div></span><span class="der"><div class="m">' +
          (esMixta(a) ? plata(a.balance) + '</div><div class="m">' + plata(a.balanceUsd || 0, "USD") : plata(a.balance, a.currency)) + "</div></span></button>";
      }).join("") + "</div>" +
      '<button class="btn" data-k="nueva">+ Nueva cuenta</button>' + (data.accounts.length > 1 ? '<button class="btn suave" data-k="transferir">Transferir entre cuentas</button>' : "");
    abrirHoja(h, function (hoja) {
      hoja.onclick = function (e) {
        var b = e.target.closest ? e.target.closest("[data-k]") : null;
        if (!b) return;
        var k = b.getAttribute("data-k");
        if (k === "nueva") hojaCuenta(null);
        else if (k === "transferir") hojaTransferir();
        else hojaCuenta(k);
      };
    });
  }

  // ---------- Dólar automático (DolarApi) ----------

  var dolarPedido = null;
  /** Trae la cotización elegida (si es automática). Sin forzar, a lo sumo una vez cada 30 minutos. */
  function actualizarDolar(forzar) {
    if (!data.usdAuto || dolarPedido) return;
    var ultima = data.usdUpdated ? Date.parse(data.usdUpdated) : 0;
    if (!forzar && Date.now() - ultima < 30 * 60 * 1000) return;
    dolarPedido = fetch("https://dolarapi.com/v1/dolares/" + encodeURIComponent(data.usdAuto), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        var v = Number(j.venta);
        if (!(v > 0)) throw new Error("sin precio");
        data.usdRate = r2(v);
        data.usdUpdated = new Date().toISOString();
        guardar();
        if (!hojaAbierta) render();
        if (forzar) aviso("Dólar " + nombreDolar(data.usdAuto).toLowerCase() + " actualizado: $" + numero(v, 2, true));
      })
      .catch(function () { if (forzar) aviso("No se pudo actualizar el dólar. Revisá la conexión."); })
      .then(function () { dolarPedido = null; });
  }

  // ---------- Importar extracto (PDF del banco) ----------
  // El PDF lo lee pdf.js (texto y posición de cada palabra) y los movimientos los sacan los mismos lectores de
  // bancos que la app de Android, compilados a JavaScript (lectores.js, carpeta webimport/).

  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement("script");
      s.src = src; s.onload = ok;
      s.onerror = function () { s.remove(); mal(new Error("Sin conexión")); };
      document.head.appendChild(s);
    });
  }
  var lectoresP = null, pdfP = null;
  function cargarLectores() {
    if (!lectoresP) lectoresP = cargarScript("lectores.js?v=" + encodeURIComponent(VERSION)).then(function () {
      if (!window.LectoresWeb || !window.LectoresWeb.leerExtracto) throw new Error("lectores");
      return window.LectoresWeb;
    }).catch(function (e) { lectoresP = null; throw e; });
    return lectoresP;
  }
  function cargarPdfJs() {
    var base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
    if (!pdfP) pdfP = cargarScript(base + "pdf.min.js").then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js";
      return window.pdfjsLib;
    }).catch(function (e) { pdfP = null; throw e; });
    return pdfP;
  }
  /** Igual que la lectura de la versión anterior: [{text, width, words: [{t, x0, x1, top}]}], origen arriba a la izquierda. */
  function leerPdf(archivo) {
    return Promise.all([cargarPdfJs(), archivo.arrayBuffer ? archivo.arrayBuffer() : new Promise(function (ok, mal) {
      var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = mal; r.readAsArrayBuffer(archivo);
    })]).then(function (x) {
      var pdfjs = x[0];
      return pdfjs.getDocument({ data: new Uint8Array(x[1]) }).promise.then(function (doc) {
        var paginas = [], n = 1;
        function siguiente() {
          if (n > doc.numPages) return paginas;
          return doc.getPage(n++).then(function (page) {
            var vp = page.getViewport({ scale: 1 });
            return page.getTextContent().then(function (content) {
              var words = [], pieces = [];
              content.items.forEach(function (item) {
                if (!item.str || !item.str.trim()) return;
                var m = pdfjs.Util.transform(vp.transform, item.transform);
                var alto = item.height || Math.hypot(m[2], m[3]);
                var xx = m[4], top = m[5] - alto;
                var ancho = item.str.length ? item.width / item.str.length : 0;
                pieces.push({ x: xx, top: top, str: item.str });
                var ini = -1;
                for (var i = 0; i <= item.str.length; i++) {
                  var esp = i === item.str.length || /\s/.test(item.str[i]);
                  if (!esp && ini < 0) ini = i;
                  if (esp && ini >= 0) { words.push({ t: item.str.slice(ini, i), x0: xx + ini * ancho, x1: xx + i * ancho, top: top }); ini = -1; }
                }
              });
              pieces.sort(function (a, b) { return a.top - b.top || a.x - b.x; });
              var lineas = [];
              pieces.forEach(function (p) {
                var l = lineas[lineas.length - 1];
                if (l && Math.abs(l.top - p.top) <= 3) l.items.push(p); else lineas.push({ top: p.top, items: [p] });
              });
              var texto = lineas.map(function (l) { return l.items.sort(function (a, b) { return a.x - b.x; }).map(function (p) { return p.str.trim(); }).join(" "); }).join("\n");
              paginas.push({ text: texto, width: vp.width, words: words });
              return siguiente();
            });
          });
        }
        return siguiente();
      });
    });
  }

  function hojaImportar() {
    var st = { paso: "banco", bancos: null, banco: null, error: "", resultados: null, res: null, items: [], cuenta: null, igualar: false, filtro: "todos", pares: [], par: 0 };
    var hoja = abrirHoja('<div class="chico">Cargando…</div>');
    var viejo = document.getElementById("pdfExtracto");
    if (viejo) viejo.remove();
    var input = document.createElement("input");
    input.id = "pdfExtracto";
    input.type = "file"; input.accept = "application/pdf,.pdf"; input.style.display = "none";
    document.body.appendChild(input);

    function pintar() {
      var h = "";
      if (st.paso === "banco") {
        h = '<h3>Importar extracto</h3><div class="chico" style="margin-bottom:12px">Elegí el banco o la billetera y después el PDF del extracto (el que se descarga del home banking o de la app del banco).</div>';
        if (st.error) h += '<div class="error" style="margin-bottom:10px">' + esc(st.error) + "</div>";
        h += st.bancos ? '<div class="lista" style="box-shadow:none;background:var(--variant)">' + st.bancos.map(function (b) {
          return '<button class="mov" data-b="' + esc(b.id) + '"><span class="txt"><div class="nom">' + esc(b.nombre) + '</div></span><span class="der chico">PDF ›</span></button>';
        }).join("") + "</div>" : '<div class="chico">Cargando bancos…</div>';
      } else if (st.paso === "leyendo") {
        h = '<h3>Leyendo el extracto…</h3><div class="chico">' + esc(st.banco.nombre) + ". Puede tardar unos segundos.</div>";
      } else if (st.paso === "hoja") {
        h = '<h3>¿Qué cuenta importás?</h3><div class="chico" style="margin-bottom:10px">El extracto trae varias cuentas o monedas.</div>' + st.resultados.map(function (r, i) {
          return '<button class="btn suave" data-r="' + i + '" style="text-align:left">' + esc(r.cuenta || "Cuenta " + (i + 1)) + " · " + r.movimientos.length + " movimientos</button>";
        }).join("");
      } else if (st.paso === "revisar") {
        var sel = st.items.filter(function (it) { return it.sel; });
        var tg = 0, ti = 0;
        sel.forEach(function (it) { if (it.tipo === "EXPENSE") tg += it.monto; else ti += it.monto; });
        var vis = st.items.filter(function (it) { return st.filtro === "todos" || (st.filtro === "gastos") === (it.tipo === "EXPENSE"); });
        h = '<h3>Revisar movimientos</h3><div class="chico">' + esc(st.banco.nombre) + (st.res.cuenta ? " · " + esc(st.res.cuenta) : "") + " · " + st.items.length + " movimientos. Destildá los que no quieras cargar y corregí las categorías.</div>";
        h += '<label class="campo"><span>Cargar en la cuenta</span><select id="iCuenta">' + data.accounts.map(function (a) {
          return '<option value="' + esc(a.id) + '"' + (a.id === st.cuenta ? " selected" : "") + ">" + esc(a.name) + "</option>";
        }).join("") + '<option value="__nueva"' + (st.cuenta === "__nueva" ? " selected" : "") + ">+ Crear cuenta “" + esc(st.banco.nombre) + "”</option></select></label>";
        if (st.res.saldoFinal != null) h += '<label class="interruptor" style="padding:4px 4px 8px"><span class="chico" style="color:var(--fg)">Dejar el saldo de la cuenta igual al del extracto (' + plata(st.res.saldoFinal) + ")</span><input type=\"checkbox\" id=\"iIgualar\"" + (st.igualar ? " checked" : "") + "></label>";
        h += '<div class="entre"><div class="chips">' + [["todos", "Todos"], ["gastos", "Gastos"], ["ingresos", "Ingresos"]].map(function (f) {
          return '<button class="chip' + (st.filtro === f[0] ? " sel" : "") + '" data-f="' + f[0] + '">' + f[1] + "</button>";
        }).join("") + '</div><button class="link" data-todos="1">' + (vis.length && vis.every(function (it) { return it.sel; }) ? "Ninguno" : "Todos") + "</button></div>";
        h += '<div class="lista" style="margin-top:10px;box-shadow:none;background:var(--variant)">' + vis.map(function (it) {
          var cats = categorias(it.tipo);
          return '<div class="mov" style="align-items:flex-start"><input type="checkbox" data-i="' + it.i + '"' + (it.sel ? " checked" : "") + ' style="width:22px;height:22px;margin-top:2px;flex:none;accent-color:var(--primary)">' +
            '<span class="txt"><div class="nom" style="white-space:normal">' + esc(it.m.concepto) + '</div><div class="sub">' + fechaCorta(it.m.fecha) +
            (it.dup ? ' · <b style="color:var(--warning)">Ya cargado</b>' : "") + (it.m.interno ? ' · <b style="color:var(--muted)">Movimiento interno</b>' : "") + (it.mismo ? ' · <b style="color:var(--info)">Unificado</b>' : "") + "</div>" +
            '<select data-c="' + it.i + '" class="selCat">' + cats.map(function (c) { return '<option' + (c === it.cat ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></span>" +
            '<span class="der"><div class="m ' + (it.tipo === "EXPENSE" ? "" : "ingreso") + '">' + plata(it.tipo === "EXPENSE" ? -it.monto : it.monto, "ARS", it.tipo !== "EXPENSE") + "</div></span></div>";
        }).join("") + "</div>";
        h += '<div class="entre" style="margin-top:12px"><span>Gastos <b class="gasto">' + plata(-tg) + '</b></span><span>Ingresos <b class="ingreso">' + plata(ti, "ARS", true) + "</b></span></div>";
        h += '<button class="btn" data-sig="1"' + (sel.length ? "" : " disabled") + ">Siguiente · " + sel.length + " movimientos</button>";
      } else if (st.paso === "comparar") {
        var p = st.pares[st.par];
        h = '<h3>¿Es el mismo movimiento?</h3><div class="chico">' + (st.par + 1) + " de " + st.pares.length + ". Ya cargaste a mano uno con el mismo monto. Si es el mismo, no se duplica: se unifican.</div>" +
          cajaMov("Del extracto", p.item.m.concepto, p.item.m.fecha, p.item.monto, p.item.cat, p.item.tipo) +
          cajaMov("Cargado a mano", p.manual.name, p.manual.date, p.manual.amount, p.manual.category, p.manual.type) +
          '<div class="dos"><button class="btn suave" data-mismo="0">No, son distintos</button><button class="btn" data-mismo="1">Sí, es el mismo</button></div>';
      } else if (st.paso === "final") {
        var s2 = st.items.filter(function (it) { return it.sel; });
        var uni = st.items.filter(function (it) { return !it.sel && it.mismo; });
        var g2 = 0, i2 = 0;
        s2.forEach(function (it) { if (it.tipo === "EXPENSE") g2 += it.monto; else i2 += it.monto; });
        var nomCuenta = st.cuenta === "__nueva" ? st.banco.nombre + " (nueva)" : (cuenta(st.cuenta) || {}).name;
        h = '<h3>Listo para importar</h3><div class="clave"><span>Cuenta</span><span>' + esc(nomCuenta) + '</span></div><div class="clave"><span>Movimientos nuevos</span><span>' + s2.length + "</span></div>" +
          '<div class="clave"><span>Gastos</span><span class="gasto">' + plata(-g2) + '</span></div><div class="clave"><span>Ingresos</span><span class="ingreso">' + plata(i2, "ARS", true) + "</span></div>" +
          (uni.length ? '<div class="clave"><span>Unificados con los cargados a mano</span><span>' + uni.length + "</span></div>" : "") +
          (st.igualar ? '<div class="clave"><span>Saldo final de la cuenta</span><span>' + plata(st.res.saldoFinal) + "</span></div>" : "") +
          '<button class="btn" data-ok="1">Importar ' + s2.length + ' movimientos</button><button class="btn suave" data-volver="1">Volver a revisar</button>';
      }
      hoja.innerHTML = '<div class="asa"></div>' + h;
    }
    function cajaMov(titulo, nombre, fecha, monto, cat, tipo) {
      return '<div class="detalle"><div class="muy-chico">' + titulo + '</div><div class="entre" style="margin-top:4px"><b>' + esc(nombre) + '</b><b class="' + (tipo === "EXPENSE" ? "gasto" : "ingreso") + '">' +
        plata(tipo === "EXPENSE" ? -monto : monto, "ARS", tipo !== "EXPENSE") + '</b></div><div class="chico">' + fechaLarga(fecha) + " · " + esc(cat) + "</div></div>";
    }

    function preparar(res) {
      st.res = res;
      var existentes = data.transactions;
      st.items = res.movimientos.filter(function (m) { return m.monto !== 0; }).map(function (m, i) {
        var tipo = m.monto < 0 ? "EXPENSE" : "INCOME", monto = Math.abs(m.monto);
        var ext = m.operacion ? "mp:" + m.operacion : null;
        var dup = existentes.some(function (t) {
          return (ext && t.externalId === ext) || (t.date === m.fecha && t.type === tipo && Math.abs(t.amount - monto) < 0.01 && String(t.name).toLowerCase() === String(m.concepto).toLowerCase());
        });
        return { i: i, m: m, tipo: tipo, monto: monto, cat: sugerir(m.concepto, tipo), catMano: false, sel: !dup && !m.interno, dup: dup, mismo: null, clave: claveComercio(m.concepto) };
      });
      var clave = normalizar(st.banco.clave || "");
      var c = data.accounts.filter(function (a) { return clave && normalizar(a.name).indexOf(clave) >= 0; })[0];
      st.cuenta = c ? c.id : (cuentaPred() || {}).id;
      st.paso = "revisar";
      pintar();
    }

    /** El extracto es en dólares si su hoja lo dice ("U$S", "USD", "dólares"); si no, en pesos. */
    function extractoEnDolares() { return /u\$s|usd|d[oó]lar/i.test(st.res.cuenta || ""); }
    function monedaExtracto(a) { return esMixta(a) ? (extractoEnDolares() ? "USD" : "ARS") : (a.currency === "USD" ? "USD" : "ARS"); }

    /** Busca, para cada movimiento a importar, uno cargado a mano en esa cuenta con el mismo monto y tipo (el de fecha más cercana). */
    function buscarPares() {
      if (!st.cuenta || st.cuenta === "__nueva") return [];
      var sel = st.items.filter(function (it) { return it.sel; });
      if (!sel.length) return [];
      var fechas = sel.map(function (it) { return it.m.fecha; }).sort();
      var desde = sumarDias(fechas[0], -7), hasta = sumarDias(fechas[fechas.length - 1], 7);
      var manuales = data.transactions.filter(function (t) { return t.accountId === st.cuenta && !t.externalId && t.date >= desde && t.date <= hasta; });
      var pares = [];
      sel.slice().sort(function (a, b) { return a.m.fecha < b.m.fecha ? -1 : 1; }).forEach(function (it) {
        var mejor = null, dist = 1e9;
        manuales.forEach(function (t) {
          if (t.type !== it.tipo || Math.abs(t.amount - it.monto) >= 0.01) return;
          var d = Math.abs((Date.parse(t.date) - Date.parse(it.m.fecha)) / 86400000);
          if (d < dist) { dist = d; mejor = t; }
        });
        if (mejor) { manuales.splice(manuales.indexOf(mejor), 1); pares.push({ item: it, manual: mejor }); }
      });
      return pares;
    }

    function importarAhora() {
      var cuentaId = st.cuenta;
      if (cuentaId === "__nueva") {
        var usd = /u\$s|usd|d[oó]lar/i.test(st.res.cuenta || "");
        cuentaId = nuevoId("acc");
        data.accounts.push({ id: cuentaId, name: st.banco.nombre, balance: 0, currency: usd ? "USD" : "ARS", exclude: false, "default": false });
      }
      var a = cuenta(cuentaId);
      var monImp = monedaExtracto(a);
      var nuevos = st.items.filter(function (it) { return it.sel; }).map(function (it) {
        var t = { id: nuevoId("tx"), type: it.tipo, name: it.m.concepto, amount: r2(it.monto), category: it.cat, accountId: cuentaId, date: it.m.fecha, comment: "Importado de extracto " + st.banco.nombre, currency: monImp };
        if (monImp === "USD") { t.rate = data.usdRate; t.rateSource = data.usdAuto || "manual"; }
        if (it.m.operacion) t.externalId = "mp:" + it.m.operacion;
        return t;
      });
      st.items.forEach(function (it) { if (!it.sel && it.mismo && it.m.operacion) it.mismo.externalId = "mp:" + it.m.operacion; });
      nuevos.forEach(function (t) { recordar(t); });
      data.transactions = nuevos.concat(data.transactions);
      ordenar();
      if (st.igualar && st.res.saldoFinal != null) ponerSaldo(a, monImp, st.res.saldoFinal);
      else nuevos.forEach(function (t) { aplicar(t, 1); });
      guardar();
      var uni = st.items.filter(function (it) { return !it.sel && it.mismo; }).length;
      cerrarHoja(); render();
      aviso("Se importaron " + nuevos.length + " movimientos en " + a.name + (uni ? " y se unificaron " + uni + " que ya estaban." : "."));
    }

    input.onchange = function () {
      var archivo = input.files && input.files[0];
      input.value = "";
      if (!archivo) return;
      st.paso = "leyendo"; st.error = ""; pintar();
      Promise.all([cargarLectores(), leerPdf(archivo)]).then(function (x) {
        var r = JSON.parse(x[0].leerExtracto(st.banco.id, JSON.stringify(x[1])));
        if (!r.ok) throw new Error(r.error);
        st.resultados = r.resultados;
        if (r.resultados.length > 1) { st.paso = "hoja"; pintar(); } else preparar(r.resultados[0]);
      }).catch(function (e) {
        st.paso = "banco";
        st.error = /PDF|password|Invalid/i.test(e.message) && !/extracto|movimientos/.test(e.message) ? "No se pudo abrir el PDF (¿tiene contraseña o no es un PDF?)." : e.message;
        pintar();
      });
    };

    hoja.onclick = function (e) {
      var b = e.target.closest ? e.target.closest("[data-b],[data-r],[data-f],[data-todos],[data-sig],[data-mismo],[data-ok],[data-volver]") : null;
      if (!b) return;
      if (b.hasAttribute("data-b")) {
        var id = b.getAttribute("data-b");
        st.banco = st.bancos.filter(function (x) { return x.id === id; })[0];
        input.click(); // en el mismo toque: Safari solo abre el selector de archivos así
      } else if (b.hasAttribute("data-r")) preparar(st.resultados[+b.getAttribute("data-r")]);
      else if (b.hasAttribute("data-f")) { st.filtro = b.getAttribute("data-f"); pintar(); }
      else if (b.hasAttribute("data-todos")) {
        var vis = st.items.filter(function (it) { return st.filtro === "todos" || (st.filtro === "gastos") === (it.tipo === "EXPENSE"); });
        var todos = vis.every(function (it) { return it.sel; });
        vis.forEach(function (it) { it.sel = !todos; if (it.sel) it.mismo = null; });
        pintar();
      } else if (b.hasAttribute("data-sig")) {
        var dest = st.cuenta === "__nueva" ? null : cuenta(st.cuenta);
        if (dest && !esMixta(dest) && (dest.currency === "USD") !== extractoEnDolares()) {
          aviso("Esa cuenta es en " + (dest.currency === "USD" ? "dólares" : "pesos") + " y el extracto es en " + (extractoEnDolares() ? "dólares" : "pesos") + ". Elegí otra o creá una nueva.");
          return;
        }
        st.pares = buscarPares(); st.par = 0;
        st.paso = st.pares.length ? "comparar" : "final"; pintar();
      } else if (b.hasAttribute("data-mismo")) {
        var p = st.pares[st.par];
        if (b.getAttribute("data-mismo") === "1") { p.item.sel = false; p.item.mismo = p.manual; }
        st.par++;
        if (st.par >= st.pares.length) st.paso = "final";
        pintar();
      } else if (b.hasAttribute("data-ok")) importarAhora();
      else if (b.hasAttribute("data-volver")) { st.paso = "revisar"; pintar(); }
    };
    hoja.onchange = function (e) {
      var t = e.target;
      if (t.id === "iCuenta") { st.cuenta = t.value; return; }
      if (t.id === "iIgualar") { st.igualar = t.checked; return; }
      if (t.hasAttribute("data-i")) {
        var it = st.items[+t.getAttribute("data-i")];
        it.sel = t.checked; if (it.sel) it.mismo = null;
        pintar();
      } else if (t.hasAttribute("data-c")) {
        var it2 = st.items[+t.getAttribute("data-c")];
        it2.cat = t.value; it2.catMano = true;
        // La misma categoría para los otros movimientos de ese comercio que no se cambiaron a mano.
        st.items.forEach(function (o) { if (o !== it2 && !o.catMano && o.tipo === it2.tipo && o.clave === it2.clave) o.cat = t.value; });
        pintar();
      }
    };

    pintar();
    cargarLectores().then(function (l) { st.bancos = JSON.parse(l.bancos()); if (st.paso === "banco") pintar(); })
      .catch(function () { st.error = "No se pudieron cargar los lectores de bancos. Revisá la conexión."; pintar(); });
  }

  // ---------- Ayuda («?») ----------

  function hojaAyuda() {
    var temas = [
      ["Anotar un gasto", "En el inicio tocá <b>Gasto</b>. Escribí cuánto gastaste, en qué (por ejemplo «supermercado») y tocá <b>Guardar gasto</b>."],
      ["Anotar plata que te entró", "Tocá <b>Ingreso</b>. Sirve para el sueldo, una venta o un regalo."],
      ["Ver en qué gastaste", "Abajo tocá <b>Actividad</b>. Ahí están tus gastos del mes y un gráfico por categoría. En <b>Informes</b> ves cuánto ahorraste y tus dólares."],
      ["Corregir o borrar algo", "Tocá el movimiento en la lista. Se abre el detalle con <b>Editar</b> y <b>Borrar</b>."],
      ["Tus cuentas", "Arriba a la derecha, <b>Cuentas</b>: ves cuánto hay en cada una y podés crear otra (banco, billetera, en pesos, dólares o mixta)."],
      ["Dólares", "El botón <b>Divisas</b> sirve si compraste o vendiste dólares. La cotización se busca sola."],
      ["Pasar plata entre cuentas", "Si sacaste plata del banco o la pasaste a otra cuenta, tocá <b>Transferir</b>. No cuenta como gasto."],
      ["Cargar el resumen del banco", "Tocá <b>Cargar el resumen del banco (PDF)</b>, elegí tu banco y el PDF: la app lee los movimientos y te deja revisarlos antes de guardarlos."],
      ["Ocultar los montos", "Tocá el ojo 👁 en la tarjeta de arriba y los números se tapan."]
    ];
    abrirHoja("<h3>¿Cómo se usa?</h3>" + temas.map(function (t) {
      return '<details class="ayuda"><summary>' + t[0] + "</summary><p>" + t[1] + "</p></details>";
    }).join(""));
  }

  // ---------- Toques ----------

  document.body.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-acc], #nav button") : null;
    if (!b) return;
    if (b.parentNode && b.parentNode.id === "nav") { tab = b.getAttribute("data-tab"); window.scrollTo(0, 0); render(); return; }
    var acc = b.getAttribute("data-acc");
    if (acc === "nuevo") hojaMovimiento({ tipo: b.getAttribute("data-tipo") });
    else if (acc === "transferir") hojaTransferir();
    else if (acc === "ayuda") hojaAyuda();
    else if (acc === "divisas") hojaDivisas();
    else if (acc === "cambio") hojaCambio(b.getAttribute("data-id"));
    else if (acc === "cuentas") hojaCuentas();
    else if (acc === "importarExtracto") hojaImportar();
    else if (acc === "moneda") { data.heroCurrency = b.getAttribute("data-m"); guardar(); render(); }
    else if (acc === "actVista") { act.vista = b.getAttribute("data-v"); render(); }
    else if (acc === "color") { data.colorTheme = b.getAttribute("data-color"); guardar(); render(); }
    else if (acc === "dolarTipo") { data.usdAuto = b.getAttribute("data-casa"); data.usdUpdated = null; guardar(); render(); actualizarDolar(true); }
    else if (acc === "dolarAhora") actualizarDolar(true);
    else if (acc === "detalle") hojaDetalle(b.getAttribute("data-id"));
    else if (acc === "cuenta") hojaCuenta(b.getAttribute("data-id"));
    else if (acc === "tab") { tab = b.getAttribute("data-tab"); window.scrollTo(0, 0); render(); }
    else if (acc === "privacidad") { if (b.tagName !== "INPUT") e.preventDefault(); data.privacy = !data.privacy; guardar(); render(); }
    else if (acc === "actTipo") { act.tipo = b.getAttribute("data-tipo"); act.ver = 10; render(); }
    else if (acc === "actCuenta") { act.cuenta = b.getAttribute("data-v"); act.ver = 10; render(); }
    else if (acc === "actMes") { act.mes = mesMover(act.mes, +b.getAttribute("data-n")); act.ver = 10; render(); }
    else if (acc === "verMas") { act.ver += 50; document.getElementById("listaAct").innerHTML = listaActividad(); }
    else if (acc === "tema") { data.themeMode = b.getAttribute("data-modo"); guardar(); render(); }
    else if (acc === "guardarUsd") {
      var v = leerMonto(document.getElementById("usd").value);
      if (!(v > 0)) { aviso("Cotización inválida."); return; }
      data.usdRate = r2(v); guardar(); render(); aviso("Cotización guardada.");
    } else if (acc === "nuevaCat") {
      var n = prompt("Nombre de la nueva categoría");
      if (n && n.trim()) { agregarCategoria(b.getAttribute("data-tipo"), n); render(); }
    } else if (acc === "exportar") exportar();
    else if (acc === "cargarCopia") {
      var inp = document.getElementById("archivo");
      inp.onchange = function () { if (inp.files && inp.files[0]) importar(inp.files[0]); inp.value = ""; };
      inp.click();
    } else if (acc === "borrarTodo") {
      if (!confirm("¿Borrar TODOS los datos de este iPhone? No se puede deshacer.")) return;
      if (!confirm("Última confirmación: se borran cuentas y movimientos.")) return;
      var tema = data.themeMode;
      data = inicial(); data.themeMode = tema; guardar(); tab = "inicio"; render(); aviso("Datos borrados.");
    }
  });

  // Si otra pestaña cambió los datos, se recargan.
  window.addEventListener("storage", function (e) { if (e.key === CLAVE) { data = cargar(); render(); } });
  // Al volver a la app después de un rato, se actualiza la fecha ("Hoy", saludo).
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    if (!hojaAbierta) render();
    actualizarDolar(false);
  });

  data = cargar();
  if (migrado) guardar();
  render();
  actualizarDolar(false);

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (r) { r.update(); }).catch(function () {});
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
})();
