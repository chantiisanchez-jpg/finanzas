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
  var VERSION = "14/11 21:42";
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

  var data;
  function inicial() {
    return {
      accounts: [{ id: nuevoId("acc"), name: "Efectivo", balance: 0, currency: "ARS", exclude: false, "default": true }],
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
    d.categoryMemory = d.categoryMemory || {};
    if (typeof d.usdRate !== "number") d.usdRate = 1280;
    return d;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(data)); }
    catch (e) { aviso("No se pudo guardar en este iPhone: " + e.message); }
  }

  function cuenta(id) { for (var i = 0; i < data.accounts.length; i++) if (data.accounts[i].id === id) return data.accounts[i]; return null; }
  function cuentaPred() { for (var i = 0; i < data.accounts.length; i++) if (data.accounts[i]["default"]) return data.accounts[i]; return data.accounts[0]; }
  function aPesos(v, moneda) { return moneda === "USD" ? v * data.usdRate : v; }
  function montoPesos(t) { var a = cuenta(t.accountId); return aPesos(t.amount, a ? a.currency : "ARS"); }
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
  function efecto(t) { return t.type === "EXPENSE" ? -t.amount : t.amount; }
  function ordenar() { data.transactions.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }); }

  function agregarMov(t) {
    recordar(t);
    data.transactions.unshift(t);
    ordenar();
    var a = cuenta(t.accountId); if (a) a.balance = r2(a.balance + efecto(t));
    guardar();
  }
  function editarMov(t) {
    var i = -1;
    for (var k = 0; k < data.transactions.length; k++) if (data.transactions[k].id === t.id) i = k;
    if (i < 0) return;
    var viejo = data.transactions[i];
    var a1 = cuenta(viejo.accountId); if (a1) a1.balance = r2(a1.balance - efecto(viejo));
    var a2 = cuenta(t.accountId); if (a2) a2.balance = r2(a2.balance + efecto(t));
    recordar(t);
    data.transactions[i] = t;
    ordenar();
    guardar();
  }
  function borrarMov(id) {
    var t = null;
    data.transactions = data.transactions.filter(function (x) { if (x.id === id) { t = x; return false; } return true; });
    if (!t) return;
    var a = cuenta(t.accountId); if (a) a.balance = r2(a.balance - efecto(t));
    guardar();
  }
  function convertir(v, de, a) { return de === a ? v : de === "USD" ? v * data.usdRate : v / data.usdRate; }
  function transferir(deId, aId, monto) {
    if (deId === aId) return "Elegí dos cuentas distintas.";
    if (!(monto > 0)) return "El monto debe ser mayor a cero.";
    var de = cuenta(deId), a = cuenta(aId);
    if (!de || !a) return "Cuenta inválida.";
    if (de.balance < monto) return "Fondos insuficientes en " + de.name + ".";
    de.balance = r2(de.balance - monto);
    a.balance = r2(a.balance + convertir(monto, de.currency, a.currency));
    guardar();
    return null;
  }
  function totalMes(tipo, mes) {
    var s = 0;
    data.transactions.forEach(function (t) { if (t.type === tipo && mesDe(t.date) === mes) s += montoPesos(t); });
    return s;
  }
  function porCategoria(tipo, mes) {
    var m = {};
    data.transactions.forEach(function (t) { if (t.type === tipo && mesDe(t.date) === mes) m[t.category] = (m[t.category] || 0) + montoPesos(t); });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }

  // ---------- Tema y avisos ----------

  var oscuroSistema = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function aplicarTema() {
    var osc = data.themeMode === "DARK" || (data.themeMode !== "LIGHT" && oscuroSistema && oscuroSistema.matches);
    document.documentElement.classList.toggle("oscuro", !!osc);
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
  var act = { tipo: "EXPENSE", mes: mesActual(), buscar: "", ver: 10 };
  var inf = { mes: mesActual() };
  var vista = document.getElementById("vista");

  function render() {
    aplicarTema();
    var navs = document.querySelectorAll("#nav button");
    for (var i = 0; i < navs.length; i++) navs[i].classList.toggle("sel", navs[i].getAttribute("data-tab") === tab);
    if (tab === "inicio") vista.innerHTML = vistaInicio();
    else if (tab === "actividad") vista.innerHTML = vistaActividad();
    else if (tab === "informes") vista.innerHTML = vistaInformes();
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
      '<span class="der"><div class="m ' + (gasto ? "" : "ingreso") + '">' + plata(gasto ? -t.amount : t.amount, a ? a.currency : "ARS", !gasto) + "</div>" +
      (mostrarFecha ? '<div class="muy-chico">' + fechaCorta(t.date) + "</div>" : "") + "</span></button>";
  }

  function saludo() { var h = new Date().getHours(); return h >= 5 && h <= 11 ? "Buen día" : h >= 12 && h <= 19 ? "Buenas tardes" : "Buenas noches"; }

  function vistaInicio() {
    var d = new Date();
    var fecha = DIAS[d.getDay()].charAt(0).toUpperCase() + DIAS[d.getDay()].slice(1) + " " + d.getDate() + " de " + MESES[d.getMonth()];
    var total = 0;
    data.accounts.forEach(function (a) { if (!a.exclude) total += aPesos(a.balance, a.currency); });
    var mes = mesActual();
    var ing = totalMes("INCOME", mes), gas = totalMes("EXPENSE", mes);
    var pct = ing > 0 ? Math.min(100, gas / ing * 100) : (gas > 0 ? 100 : 0);
    var hayMes = data.transactions.some(function (t) { return mesDe(t.date) === mes; });
    var h = '<div class="fecha">' + fecha + "</div><h1>" + saludo() + "</h1>";
    h += '<div class="hero"><div class="entre"><span style="opacity:.85">Patrimonio total</span><button class="ojo" data-acc="privacidad">' + (data.privacy ? ICON.ojoNo : ICON.ojo) + "</button></div>" +
      '<div class="monto">' + plata(total) + '</div><div style="opacity:.8;font-size:14px">≈ ' + (data.privacy ? "US$ •••••" : "US$ " + numero(total / data.usdRate, 2, true)) + " · dólar $" + numero(data.usdRate, 2, true) + "</div>" +
      '<div class="acciones"><button data-acc="nuevo" data-tipo="EXPENSE"><span class="c">' + ICON.gasto + "</span>Gasto</button>" +
      '<button data-acc="nuevo" data-tipo="INCOME"><span class="c">' + ICON.ingreso + "</span>Ingreso</button>" +
      '<button data-acc="transferir"><span class="c">' + ICON.transferir + "</span>Transferir</button></div></div>";
    h += '<div class="tarjeta" style="margin-top:14px"><div class="entre"><b style="font-size:17px">Este mes</b><span class="chico">' + mesNombre(mes).split(" ")[0] + "</span></div>" +
      '<div class="dos" style="margin-top:12px"><div class="fila">' + '<span class="icono fondo-ingreso">' + ICON.ingreso + '</span><div><div class="chico">Ingresos</div><b>' + plata(ing) + "</b></div></div>" +
      '<div class="fila"><span class="icono fondo-gasto">' + ICON.gasto + '</span><div><div class="chico">Gastos</div><b>' + plata(gas) + "</b></div></div></div>" +
      (hayMes ? '<div class="barra"><div style="width:' + pct.toFixed(1) + '%"></div></div><div class="entre chico"><span>' +
        (ing > 0 ? "Gastaste el " + numero(gas / ing * 100, 0, false) + "% de tus ingresos" : "Sin ingresos este mes") + '</span><b class="' + (ing - gas >= 0 ? "ingreso" : "gasto") + '">' + plata(ing - gas, "ARS", true) + "</b></div>"
        : '<div class="chico" style="margin-top:12px">Todavía no hay movimientos este mes.</div>') + "</div>";
    h += '<div class="entre"><h2>Cuentas</h2><button class="link" data-acc="cuenta">Nueva</button></div><div class="cuentas">';
    data.accounts.forEach(function (a) {
      h += '<button class="cuenta' + (a["default"] ? " pred" : "") + '" data-acc="cuenta" data-id="' + esc(a.id) + '"><span class="icono" style="background:var(--pcont);color:var(--primary);width:36px;height:36px">' + ICON.billetera + "</span>" +
        '<div class="chico" style="margin-top:8px">' + esc(a.name) + (a.currency === "USD" ? " · USD" : "") + '</div><div class="saldo">' + plata(a.balance, a.currency) + "</div>" +
        (a["default"] ? '<span class="etiqueta">Predeterminada</span>' : a.exclude ? '<span class="etiqueta" style="background:var(--variant);color:var(--muted)">Fuera del total</span>' : "") + "</button>";
    });
    h += '<button class="cuenta nueva" data-acc="cuenta"><span class="icono" style="background:var(--pcont);color:var(--primary)">' + ICON.mas + "</span>Nueva cuenta</button></div>";
    var ult = data.transactions.slice(0, 5);
    h += '<div class="entre"><h2>Últimos movimientos</h2>' + (data.transactions.length ? '<button class="link" data-acc="tab" data-tab="actividad">Ver todos</button>' : "") + "</div>";
    h += '<div class="lista">' + (ult.length ? ult.map(function (t) { return filaMov(t, true); }).join("") : '<div class="vacio">Todavía no cargaste movimientos.<br>Tocá <b>Gasto</b> o <b>Ingreso</b> para empezar.</div>') + "</div>";
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

  function movsActividad() {
    var q = normalizar(act.buscar.trim());
    return data.transactions.filter(function (t) {
      if (t.type !== act.tipo) return false;
      if (q) return normalizar((t.name || "") + " " + t.category + " " + (t.comment || "")).indexOf(q) >= 0;
      return mesDe(t.date) === act.mes;
    });
  }
  function listaActividad() {
    var lista = movsActividad();
    if (!lista.length) return '<div class="lista"><div class="vacio">' + (act.buscar ? "No hay movimientos que coincidan." : "No hay " + (act.tipo === "EXPENSE" ? "gastos" : "ingresos") + " en " + mesNombre(act.mes).toLowerCase() + ".") + "</div></div>";
    var h = "", dia = null, abierto = false;
    lista.slice(0, act.ver).forEach(function (t) {
      if (t.date !== dia) {
        if (abierto) h += "</div>";
        dia = t.date;
        h += '<div class="dia">' + diaTitulo(t.date) + '</div><div class="lista">';
        abierto = true;
      }
      h += filaMov(t, false);
    });
    if (abierto) h += "</div>";
    if (lista.length > act.ver) h += '<button class="mas" data-acc="verMas">Ver más (' + (lista.length - act.ver) + ")</button>";
    return h;
  }
  function vistaActividad() {
    var gasto = act.tipo === "EXPENSE";
    var cats = porCategoria(act.tipo, act.mes);
    var total = 0; cats.forEach(function (c) { total += c[1]; });
    var dias = act.mes === mesActual() ? new Date().getDate() : diasDelMes(act.mes);
    var h = '<h1>Actividad</h1><div class="segmento"><button data-acc="actTipo" data-tipo="EXPENSE" class="' + (gasto ? "sel" : "") + '">Gastos</button><button data-acc="actTipo" data-tipo="INCOME" class="' + (gasto ? "" : "sel") + '">Ingresos</button></div>';
    h += '<div class="mes" style="margin-top:12px"><button data-acc="actMes" data-n="-1">‹</button><span>' + mesNombre(act.mes) + '</span><button data-acc="actMes" data-n="1"' + (act.mes >= mesActual() ? " disabled" : "") + ">›</button></div>";
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

  function vistaInformes() {
    var mes = inf.mes, ant = mesMover(mes, -1);
    var ing = totalMes("INCOME", mes), gas = totalMes("EXPENSE", mes), gasAnt = totalMes("EXPENSE", ant);
    var nIng = data.transactions.filter(function (t) { return t.type === "INCOME" && mesDe(t.date) === mes; }).length;
    var cats = porCategoria("EXPENSE", mes);
    var ahorro = ing - gas;
    var h = '<h1>Informes</h1><div class="mes"><button data-acc="infMes" data-n="-1">‹</button><span>' + mesNombre(mes) + '</span><button data-acc="infMes" data-n="1"' + (mes >= mesActual() ? " disabled" : "") + ">›</button></div>";
    h += '<div class="dos" style="margin-top:12px">' +
      '<div class="tarjeta kpi"><div class="chico"><span class="punto" style="background:var(--info)"></span> Ingresos</div><div class="valor">' + plata(ing) + '</div><div class="muy-chico">' + nIng + " movimientos</div></div>" +
      '<div class="tarjeta kpi"><div class="chico"><span class="punto" style="background:var(--expense)"></span> Gastos</div><div class="valor">' + plata(gas) + '</div><div class="muy-chico">' +
      (gasAnt > 0 ? (gas >= gasAnt ? "+" : "") + numero((gas - gasAnt) / gasAnt * 100, 1, false) + "% vs mes anterior" : "sin mes anterior") + "</div></div>" +
      '<div class="tarjeta kpi"><div class="chico"><span class="punto" style="background:var(--income)"></span> Ahorro</div><div class="valor ' + (ahorro >= 0 ? "ingreso" : "gasto") + '">' + plata(ahorro, "ARS", true) + '</div><div class="muy-chico">' +
      (ing > 0 ? numero(ahorro / ing * 100, 1, false) + "% del ingreso" : "—") + "</div></div>" +
      '<div class="tarjeta kpi"><div class="chico"><span class="punto" style="background:var(--warning)"></span> Mayor rubro</div><div class="valor">' + (cats.length ? esc(cats[0][0]) : "—") + '</div><div class="muy-chico">' + (cats.length ? plata(cats[0][1]) : "") + "</div></div></div>";
    h += '<h2>Gastos por categoría</h2><div class="tarjeta">' + (cats.length ? cats.map(function (c) {
      return '<div class="cat"><div class="entre"><span class="fila" style="gap:8px"><span class="punto" style="background:' + colorCat(c[0]) + '"></span>' + esc(c[0]) + "</span><b>" + plata(c[1]) + '</b></div><div class="b"><div style="width:' + (c[1] / cats[0][1] * 100).toFixed(1) + "%;background:" + colorCat(c[0]) + '"></div></div></div>';
    }).join("") : '<div class="chico">Sin gastos en este mes.</div>') + "</div>";
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

  function vistaAjustes() {
    var h = "<h1>Ajustes</h1>";
    h += '<h2>Apariencia</h2><div class="segmento">' + [["SYSTEM", "Sistema"], ["LIGHT", "Claro"], ["DARK", "Oscuro"]].map(function (o) {
      return '<button data-acc="tema" data-modo="' + o[0] + '" class="' + (data.themeMode === o[0] ? "sel" : "") + '">' + o[1] + "</button>";
    }).join("") + "</div>";
    h += '<div class="tarjeta" style="margin-top:14px;padding:4px 18px"><label class="interruptor"><span>Ocultar montos</span><input type="checkbox" data-acc="privacidad"' + (data.privacy ? " checked" : "") + "></label></div>";
    h += '<h2>Dólar</h2><div class="tarjeta"><label class="campo" style="margin:0"><span>Cotización usada para convertir (pesos por dólar)</span><input id="usd" inputmode="decimal" value="' + esc(plano(data.usdRate)) + '"></label><button class="btn" data-acc="guardarUsd">Guardar cotización</button></div>';
    h += '<h2>Categorías propias</h2><div class="tarjeta"><div class="chico" style="margin-bottom:8px">Gastos</div><div class="chips">' +
      (data.customExpense.length ? data.customExpense.map(function (c) { return '<span class="chip"><span class="punto" style="background:' + colorCat(c) + '"></span>' + esc(c) + "</span>"; }).join("") : '<span class="chico">Ninguna</span>') +
      '</div><div class="chico" style="margin:14px 0 8px">Ingresos</div><div class="chips">' +
      (data.customIncome.length ? data.customIncome.map(function (c) { return '<span class="chip"><span class="punto" style="background:' + colorCat(c) + '"></span>' + esc(c) + "</span>"; }).join("") : '<span class="chico">Ninguna</span>') +
      '</div><div class="dos" style="margin-top:6px"><button class="btn suave" data-acc="nuevaCat" data-tipo="EXPENSE">+ De gasto</button><button class="btn suave" data-acc="nuevaCat" data-tipo="INCOME">+ De ingreso</button></div></div>';
    h += '<h2>Copia de seguridad</h2><div class="tarjeta"><div class="chico">Guardá un archivo con todos tus datos (para pasarlos a otro teléfono o por si se borra Safari).</div>' +
      '<button class="btn" data-acc="exportar">Guardar copia</button><button class="btn suave" data-acc="importar">Cargar una copia</button><input id="archivo" type="file" accept="application/json,.json" style="display:none"></div>';
    h += '<h2>Datos</h2><div class="tarjeta"><div class="clave"><span>Cuentas</span><span>' + data.accounts.length + '</span></div><div class="clave"><span>Movimientos</span><span>' + data.transactions.length + '</span></div><div class="clave"><span>Versión</span><span>web ' + esc(VERSION) + "</span></div>" +
      '<button class="btn peligro" data-acc="borrarTodo">Borrar todos los datos</button></div>';
    h += '<p class="muy-chico" style="text-align:center;margin-top:18px">Tus datos quedan solo en este iPhone (en Safari). No se suben a ningún lado.</p>';
    return h;
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
      items: ed && ed.items ? ed.items.map(function (i) { return { name: i.name, amount: i.amount, quantity: i.quantity == null ? 1 : i.quantity }; }) : []
    };
    if (!st.cat) st.cat = sugerir(st.nombre, st.tipo);

    function html() {
      var gasto = st.tipo === "EXPENSE";
      var acento = gasto ? "var(--expense)" : "var(--income)";
      var h = (ed ? "<h3>Editar " + (gasto ? "gasto" : "ingreso") + "</h3>" :
        '<div class="segmento" style="margin-bottom:6px"><button data-h="tipo" data-v="EXPENSE" class="' + (gasto ? "sel" : "") + '">Gasto</button><button data-h="tipo" data-v="INCOME" class="' + (gasto ? "" : "sel") + '">Ingreso</button></div>');
      h += '<div class="montoGrande"><div class="chico">Monto en ' + ((cuenta(st.cuenta) || {}).currency || "ARS") + '</div><input id="hMonto" inputmode="decimal" placeholder="$ 0" value="' + esc(st.monto) + '" autocomplete="off"><div class="chico" id="hCalc"></div></div>';
      h += '<label class="campo"><span>Comercio o concepto</span><input id="hNombre" value="' + esc(st.nombre) + '" autocomplete="off" autocapitalize="sentences" placeholder="Ej: Supermercado"></label>';
      h += '<div class="chico" style="margin:12px 0 8px;font-weight:600;color:var(--fg)">Categoría</div><div class="chips" style="--acento:' + acento + '">' +
        categorias(st.tipo).map(function (c) { return '<button class="chip' + (c === st.cat ? " sel" : "") + '" data-h="cat" data-v="' + esc(c) + '"><span class="punto" style="background:' + colorCat(c) + '"></span>' + esc(c) + "</button>"; }).join("") +
        '<button class="chip" data-h="nuevaCat">+ Crear</button></div>';
      h += '<label class="campo"><span>' + (gasto ? "Cuenta de débito" : "Cuenta de destino") + '</span><select id="hCuenta">' + data.accounts.map(function (a) {
        return '<option value="' + esc(a.id) + '"' + (a.id === st.cuenta ? " selected" : "") + ">" + esc(a.name) + " · " + plata(a.balance, a.currency) + "</option>";
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
      monto.oninput = function () { st.monto = monto.value; calc(); };
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
      hoja.querySelector("#hCuenta").onchange = function (e) { st.cuenta = e.target.value; };
      hoja.querySelector("#hComentario").oninput = function (e) { st.comentario = e.target.value; };
      hoja.querySelector("#hFecha").onchange = function (e) { if (e.target.value) { st.fecha = e.target.value; montar(hoja); } };
      hoja.onclick = function (e) {
        var b = e.target.closest ? e.target.closest("[data-h]") : null;
        if (!b) return;
        var h = b.getAttribute("data-h"), v = b.getAttribute("data-v");
        if (h === "tipo") { st.tipo = v; if (!st.catTocada) st.cat = sugerir(st.nombre, st.tipo); else if (categorias(v).indexOf(st.cat) < 0) { st.cat = sugerir(st.nombre, v); st.catTocada = false; } montar(hoja); }
        else if (h === "cat") { st.cat = v; st.catTocada = true; montar(hoja); }
        else if (h === "fecha") { st.fecha = v; montar(hoja); }
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
        var t = {
          id: ed ? ed.id : nuevoId("tx"), type: st.tipo, name: nombreFinal, amount: r2(v), category: st.cat,
          accountId: st.cuenta, date: st.fecha, comment: st.comentario.trim()
        };
        if (ed && ed.externalId) t.externalId = ed.externalId;
        if (st.items.length) t.items = st.items;
        if (ed) { editarMov(t); aviso("Cambios guardados."); }
        else { agregarMov(t); aviso((st.tipo === "EXPENSE" ? "Gasto" : "Ingreso") + " de " + plata(t.amount) + " guardado."); }
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
    var a = cuenta(t.accountId), gasto = t.type === "EXPENSE", mon = a ? a.currency : "ARS";
    var h = '<div style="text-align:center"><div style="display:flex;justify-content:center">' + iconoCat(t.category, 56) + "</div>" +
      '<div style="font-weight:600;margin-top:10px">' + esc(t.name) + '</div><div style="font-size:34px;font-weight:800;letter-spacing:-1px" class="' + (gasto ? "" : "ingreso") + '">' + plata(gasto ? -t.amount : t.amount, mon, !gasto) + "</div></div>";
    h += '<div style="margin-top:14px"><div class="clave"><span>Tipo</span><span>' + (gasto ? "Gasto" : "Ingreso") + '</span></div><div class="clave"><span>Categoría</span><span>' + esc(t.category) + "</span></div>" +
      '<div class="clave"><span>Cuenta</span><span>' + esc(a ? a.name : "—") + '</span></div><div class="clave"><span>Fecha</span><span>' + fechaLarga(t.date) + "</span></div>" +
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
        else if (d === "repetir") hojaMovimiento({ tipo: t.type, monto: plano(t.amount), nombre: t.name, cat: t.category, cuenta: t.accountId });
        else if (d === "borrar") {
          if (!confirm("¿Borrar " + (gasto ? "el gasto" : "el ingreso") + " \"" + t.name + "\" de " + plata(t.amount, mon) + "? El saldo de la cuenta se ajusta.")) return;
          borrarMov(t.id); cerrarHoja(); render(); aviso("Movimiento borrado.");
        }
      };
    });
  }

  // ---------- Hoja: transferir ----------

  function hojaTransferir() {
    if (data.accounts.length < 2) { aviso("Necesitás al menos dos cuentas para transferir."); return; }
    var opciones = function (sel) {
      return data.accounts.map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === sel ? " selected" : "") + ">" + esc(a.name) + " · " + plata(a.balance, a.currency) + "</option>"; }).join("");
    };
    var de = (cuentaPred() || data.accounts[0]).id;
    var a = data.accounts.filter(function (x) { return x.id !== de; })[0].id;
    var h = '<h3>Transferir entre cuentas</h3><label class="campo"><span>Desde</span><select id="tDe">' + opciones(de) + '</select></label><label class="campo"><span>Hacia</span><select id="tA">' + opciones(a) + "</select></label>" +
      '<label class="campo"><span>Monto</span><input id="tMonto" inputmode="decimal" placeholder="0" autocomplete="off"></label><div class="chico" id="tConv"></div><div class="error" id="tError"></div><button class="btn" id="tOk">Transferir</button>';
    abrirHoja(h, function (hoja) {
      var conv = function () {
        var v = leerMonto(hoja.querySelector("#tMonto").value), d1 = cuenta(hoja.querySelector("#tDe").value), d2 = cuenta(hoja.querySelector("#tA").value);
        hoja.querySelector("#tConv").textContent = v && d1 && d2 && d1.currency !== d2.currency ? "Llegan " + plata(convertir(v, d1.currency, d2.currency), d2.currency) + " (dólar $" + numero(data.usdRate, 2, true) + ")" : "";
      };
      hoja.querySelector("#tMonto").oninput = conv;
      hoja.querySelector("#tDe").onchange = conv;
      hoja.querySelector("#tA").onchange = conv;
      hoja.querySelector("#tOk").onclick = function () {
        var err = transferir(hoja.querySelector("#tDe").value, hoja.querySelector("#tA").value, leerMonto(hoja.querySelector("#tMonto").value));
        if (err) { hoja.querySelector("#tError").textContent = err; return; }
        cerrarHoja(); render(); aviso("Transferencia hecha.");
      };
    });
  }

  // ---------- Hoja: cuenta ----------

  function hojaCuenta(id) {
    var a = id ? cuenta(id) : null;
    if (!a) {
      var h = '<h3>Nueva cuenta</h3><label class="campo"><span>Nombre</span><input id="cNombre" placeholder="Ej: Banco, Mercado Pago" autocapitalize="words"></label>' +
        '<label class="campo"><span>Saldo actual</span><input id="cSaldo" inputmode="decimal" placeholder="0"></label>' +
        '<div class="segmento" style="margin-top:10px"><button data-c="ARS" class="sel">Pesos</button><button data-c="USD">Dólares</button></div>' +
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
        };
        hoja.querySelector("#cOk").onclick = function () {
          var nombre = hoja.querySelector("#cNombre").value.trim();
          if (!nombre) { hoja.querySelector("#cError").textContent = "Poné un nombre."; return; }
          var saldo = leerMonto(hoja.querySelector("#cSaldo").value) || 0;
          var pred = hoja.querySelector("#cPred").checked || !data.accounts.length;
          if (pred) data.accounts.forEach(function (x) { x["default"] = false; });
          data.accounts.push({ id: nuevoId("acc"), name: nombre, balance: r2(saldo), currency: moneda, exclude: hoja.querySelector("#cExcluir").checked, "default": pred });
          guardar(); cerrarHoja(); render(); aviso("Cuenta creada.");
        };
      });
      return;
    }
    var n = data.transactions.filter(function (t) { return t.accountId === a.id; }).length;
    var h2 = '<h3>' + esc(a.name) + '</h3><div style="font-size:30px;font-weight:800">' + plata(a.balance, a.currency) + '</div><div class="chico">' + n + " movimientos · " + (a.currency === "USD" ? "dólares" : "pesos") + "</div>" +
      '<label class="campo" style="margin-top:14px"><span>Nombre</span><input id="cNombre" value="' + esc(a.name) + '"></label>' +
      '<label class="campo"><span>Ajustar saldo (si no coincide con el real)</span><input id="cSaldo" inputmode="decimal" value="' + esc(plano(a.balance)) + '"></label>' +
      '<div style="padding:0 4px"><label class="interruptor"><span>Dejar fuera del patrimonio total</span><input type="checkbox" id="cExcluir"' + (a.exclude ? " checked" : "") + "></label>" +
      '<label class="interruptor"><span>Cuenta predeterminada</span><input type="checkbox" id="cPred"' + (a["default"] ? " checked disabled" : "") + "></label></div>" +
      '<button class="btn" id="cOk">Guardar</button><button class="btn peligro" id="cBorrar">Borrar cuenta</button>';
    abrirHoja(h2, function (hoja) {
      hoja.querySelector("#cOk").onclick = function () {
        var nombre = hoja.querySelector("#cNombre").value.trim();
        if (nombre) a.name = nombre;
        var s = leerMonto(hoja.querySelector("#cSaldo").value);
        if (s != null) a.balance = r2(s);
        a.exclude = hoja.querySelector("#cExcluir").checked;
        if (hoja.querySelector("#cPred").checked) data.accounts.forEach(function (x) { x["default"] = x.id === a.id; });
        guardar(); cerrarHoja(); render(); aviso("Cuenta guardada.");
      };
      hoja.querySelector("#cBorrar").onclick = function () {
        if (data.accounts.length <= 1) { aviso("Tiene que quedar al menos una cuenta."); return; }
        if (!confirm("¿Borrar la cuenta \"" + a.name + "\" y sus " + n + " movimientos? No se puede deshacer.")) return;
        data.accounts = data.accounts.filter(function (x) { return x.id !== a.id; });
        data.transactions = data.transactions.filter(function (t) { return t.accountId !== a.id; });
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
    d.customExpense = d.customExpense || []; d.customIncome = d.customIncome || []; d.categoryMemory = d.categoryMemory || {};
    if (typeof d.usdRate !== "number") d.usdRate = 1280;
    return d;
  }

  // ---------- Toques ----------

  document.body.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-acc], #nav button") : null;
    if (!b) return;
    if (b.parentNode && b.parentNode.id === "nav") { tab = b.getAttribute("data-tab"); window.scrollTo(0, 0); render(); return; }
    var acc = b.getAttribute("data-acc");
    if (acc === "nuevo") hojaMovimiento({ tipo: b.getAttribute("data-tipo") });
    else if (acc === "transferir") hojaTransferir();
    else if (acc === "detalle") hojaDetalle(b.getAttribute("data-id"));
    else if (acc === "cuenta") hojaCuenta(b.getAttribute("data-id"));
    else if (acc === "tab") { tab = b.getAttribute("data-tab"); window.scrollTo(0, 0); render(); }
    else if (acc === "privacidad") { if (b.tagName !== "INPUT") e.preventDefault(); data.privacy = !data.privacy; guardar(); render(); }
    else if (acc === "actTipo") { act.tipo = b.getAttribute("data-tipo"); act.ver = 10; render(); }
    else if (acc === "actMes") { act.mes = mesMover(act.mes, +b.getAttribute("data-n")); act.ver = 10; render(); }
    else if (acc === "infMes") { inf.mes = mesMover(inf.mes, +b.getAttribute("data-n")); render(); }
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
    else if (acc === "importar") {
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
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && !hojaAbierta) render(); });

  data = cargar();
  render();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (r) { r.update(); }).catch(function () {});
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
})();
