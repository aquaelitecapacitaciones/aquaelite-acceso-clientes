const SPREADSHEET_ID = "1n-HDB2oNl9PU3vJYM_TSyCuyHLOERvC-hTqWirUXX_I";
const SHEET_NAME = "Kit de Fugas y Pruebas";
const TOOL_NAME = "KIT-FUGAS-Y-PRUEBAS";
const CODE_MINUTES = 15;
const SESSION_HOURS = 48;
const WHATSAPP_AQUAELITE = "970 683 322";

function doGet(e) {
  const data = (e && e.parameter) ? e.parameter : {};
  const action = String(data.action || "status").trim();
  const callback = data.callback || "aquaeliteCallback";
  let result;
  try {
    if (action === "request_code") result = requestCode(data);
    else if (action === "verify_code") result = verifyCode(data);
    else if (action === "check_session") result = checkSession(data);
    else if (action === "check_access") result = checkAccess(data);
    else if (action === "apply_plan") result = applyPlanByEmail(data);
    else result = {ok:true, system:"Aquaelite - Kit de Fugas y Pruebas", message:"Control de accesos activo"};
  } catch (err) {
    result = {ok:false, message:"Error interno.", error:String(err)};
  }
  return jsonp(result, callback);
}

function requestCode(data) {
  const correo = clean(data.correo).toLowerCase();
  if (!validEmail(correo)) return {ok:false, message:"Ingresa un correo válido."};

  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return {ok:false, notRegistered:true, message:"Este correo no está habilitado. Verifica que sea el mismo correo registrado con Aquaelite."};

  refreshRow(row, sheet);
  applyPendingPlan(sheet, row);
  refreshRow(row, sheet);
  ensureInitialCommercialDates(sheet, row);
  refreshRow(row, sheet);

  const access = validateCommercialAccess(sheet, row, true);
  if (!access.ok) return access;

  const v = row.values;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();
  const expires = new Date(now.getTime() + CODE_MINUTES * 60 * 1000);

  sheet.getRange(row.rowNumber, 5).setValue(code);
  sheet.getRange(row.rowNumber, 7).setValue(now);
  sheet.getRange(row.rowNumber, 8).setValue(expires);
  sheet.getRange(row.rowNumber, 14).setValue(TOOL_NAME);

  MailApp.sendEmail({
    to: correo,
    subject: "Código de acceso | Herramientas Aquaelite",
    htmlBody:
      '<div style="font-family:Arial,sans-serif;color:#102a43;max-width:560px;margin:auto">' +
      '<h2 style="color:#0b2748">AQUAELITE®</h2>' +
      '<p>Tu código personal para ingresar al <b>Kit de Fugas y Pruebas</b> es:</p>' +
      '<div style="font-size:34px;font-weight:800;letter-spacing:7px;color:#155a96;margin:22px 0">' + code + '</div>' +
      '<p>Este código vence en <b>' + CODE_MINUTES + ' minutos</b>.</p>' +
      '<p style="font-size:12px;color:#6b7c8f">Si no solicitaste este código, puedes ignorar este mensaje.</p>' +
      '</div>'
  });

  return {ok:true, maskedEmail:maskEmail(correo), expiresAt:expires.getTime(), commercialExpiresAt:access.expiresAt, message:"Código enviado."};
}

function verifyCode(data) {
  const correo = clean(data.correo).toLowerCase();
  const codigo = clean(data.codigo);
  if (!validEmail(correo) || !/^\d{6}$/.test(codigo)) return {ok:false, message:"Correo o código no válido."};

  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return {ok:false, notRegistered:true, message:"Usuario no registrado."};

  refreshRow(row, sheet);
  const access = validateCommercialAccess(sheet, row, true);
  if (!access.ok) return access;

  const v = row.values;
  const storedCode = String(v[4] || "").trim();
  const codeExpires = asDate(v[7]);
  const now = new Date();
  if (!storedCode || storedCode !== codigo) return {ok:false, message:"El código ingresado no es correcto."};
  if (!codeExpires || now.getTime() > codeExpires.getTime()) return {ok:false, expired:true, message:"El código venció. Solicita uno nuevo."};

  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  const sessionExpires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  const accesses = Number(v[10] || 0) + 1;

  sheet.getRange(row.rowNumber, 5).clearContent();
  if (!v[8]) sheet.getRange(row.rowNumber, 9).setValue(now);
  sheet.getRange(row.rowNumber, 10).setValue(now);
  sheet.getRange(row.rowNumber, 11).setValue(accesses);
  sheet.getRange(row.rowNumber, 12).setValue(token);
  sheet.getRange(row.rowNumber, 13).setValue(sessionExpires);
  sheet.getRange(row.rowNumber, 14).setValue(TOOL_NAME);

  return {ok:true, estado:"ACTIVO", nombre:String(v[0] || "").trim(), correo, token, expiresAt:sessionExpires.getTime(), commercialExpiresAt:access.expiresAt, accesos:accesses};
}

function checkSession(data) {
  const correo = clean(data.correo).toLowerCase();
  const token = clean(data.token);
  if (!validEmail(correo) || !token) return {ok:false, message:"Sesión no válida."};

  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return {ok:false, notRegistered:true, message:"Usuario no registrado."};

  refreshRow(row, sheet);
  const access = validateCommercialAccess(sheet, row, true);
  if (!access.ok) return access;

  const v = row.values;
  const storedToken = String(v[11] || "").trim();
  const sessionExpires = asDate(v[12]);
  const now = new Date();
  if (!storedToken || storedToken !== token) return {ok:false, message:"La sesión no es válida."};
  if (!sessionExpires || now.getTime() > sessionExpires.getTime()) return {ok:false, expired:true, message:"Tu sesión venció. Solicita un nuevo código."};

  sheet.getRange(row.rowNumber, 10).setValue(now);
  return {ok:true, estado:"ACTIVO", nombre:String(v[0] || "").trim(), correo, expiresAt:sessionExpires.getTime(), commercialExpiresAt:access.expiresAt};
}

function checkAccess(data) {
  const correo = clean(data.correo).toLowerCase();
  if (!validEmail(correo)) return {ok:false, message:"Correo no válido."};
  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return {ok:false, notRegistered:true, message:"Usuario no registrado."};
  refreshRow(row, sheet);
  return validateCommercialAccess(sheet, row, false);
}

function validateCommercialAccess(sheet, row, sendNotice) {
  const v = row.values;
  const estado = String(v[5] || "").toUpperCase().trim();
  if (estado === "REVOCADO") return {ok:false, revoked:true, estado:"REVOCADO", message:"Tu acceso fue revocado. Comunícate con Aquaelite."};
  if (estado !== "ACTIVO") return {ok:false, pending:true, estado:estado || "PENDIENTE", message:"Tu acceso todavía no está habilitado. Comunícate con Aquaelite."};

  const expiry = asDate(v[15]);
  if (!expiry) return {ok:false, commercialMissing:true, message:"Tu vigencia comercial aún no está configurada. Comunícate con Aquaelite."};

  const now = new Date();
  if (now.getTime() > expiry.getTime()) {
    sheet.getRange(row.rowNumber, 20).setValue("VENCIDO");
    if (sendNotice) sendExpiryNoticeOnce(sheet, row);
    return {ok:false, commercialExpired:true, expired:true, estado:"VENCIDO", expiresAt:expiry.getTime(), message:"Tu periodo de acceso ha finalizado. Comunícate con Aquaelite para renovar."};
  }

  sheet.getRange(row.rowNumber, 20).setValue("VIGENTE");
  return {ok:true, estado:"ACTIVO", nombre:String(v[0] || "").trim(), correo:String(v[1] || "").trim(), expiresAt:expiry.getTime()};
}

function ensureInitialCommercialDates(sheet, row) {
  const v = row.values;
  if (asDate(v[14]) && asDate(v[15])) return;
  const estado = String(v[5] || "").toUpperCase().trim();
  if (estado !== "ACTIVO") return;

  const base = asDate(v[3]) || new Date();
  const expiry = addMonths(base, 6);
  sheet.getRange(row.rowNumber, 15).setValue(base);
  sheet.getRange(row.rowNumber, 16).setValue(expiry);
  if (!String(v[16] || "").trim()) sheet.getRange(row.rowNumber, 17).setValue("ACCESO INICIAL · 6 MESES");
  sheet.getRange(row.rowNumber, 20).setValue(new Date() > expiry ? "VENCIDO" : "VIGENTE");
}

function applyPendingPlan(sheet, row) {
  refreshRow(row, sheet);
  const v = row.values;
  const plan = String(v[16] || "").trim().toUpperCase();
  if (!plan) return;

  const now = new Date();
  let start = asDate(v[14]);
  let expiry = asDate(v[15]);
  let applied = false;

  if (plan === "ACCESO INICIAL · 6 MESES") {
    if (!start || !expiry) {
      start = asDate(v[3]) || now;
      expiry = addMonths(start, 6);
      applied = true;
    }
  } else if (plan === "RENOVACIÓN · 6 MESES" || plan === "RENOVACION · 6 MESES") {
    const base = expiry && expiry.getTime() > now.getTime() ? expiry : now;
    if (!start) start = now;
    expiry = addMonths(base, 6);
    applied = true;
  } else if (plan === "RENOVACIÓN · 12 MESES" || plan === "RENOVACION · 12 MESES") {
    const base = expiry && expiry.getTime() > now.getTime() ? expiry : now;
    if (!start) start = now;
    expiry = addMonths(base, 12);
    applied = true;
  }

  if (applied) {
    sheet.getRange(row.rowNumber, 15).setValue(start);
    sheet.getRange(row.rowNumber, 16).setValue(expiry);
    sheet.getRange(row.rowNumber, 18).setValue(now);
    sheet.getRange(row.rowNumber, 19).clearContent();
    sheet.getRange(row.rowNumber, 20).setValue("VIGENTE");
    if (plan.indexOf("RENOV") === 0) sheet.getRange(row.rowNumber, 17).clearContent();
  }
}

function applyPlanByEmail(data) {
  const correo = clean(data.correo).toLowerCase();
  if (!validEmail(correo)) return {ok:false, message:"Correo no válido."};
  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return {ok:false, message:"Usuario no registrado."};
  applyPendingPlan(sheet, row);
  refreshRow(row, sheet);
  const expiry = asDate(row.values[15]);
  return {ok:!!expiry, expiresAt:expiry ? expiry.getTime() : null, message:expiry ? "Plan aplicado correctamente." : "No hay un plan pendiente por aplicar."};
}

function sendExpiryNoticeOnce(sheet, row) {
  refreshRow(row, sheet);
  const v = row.values;
  const correo = String(v[1] || "").trim();
  if (!validEmail(correo) || v[18]) return;

  MailApp.sendEmail({
    to: correo,
    subject: "Tu acceso Aquaelite ha finalizado",
    htmlBody:
      '<div style="font-family:Arial,sans-serif;color:#102a43;max-width:560px;margin:auto">' +
      '<h2 style="color:#0b2748">AQUAELITE®</h2>' +
      '<p><b>Tu periodo de acceso ha finalizado.</b></p>' +
      '<p>Comunícate con Aquaelite para renovar tu acceso por 6 o 12 meses.</p>' +
      '<p><b>WhatsApp: ' + WHATSAPP_AQUAELITE + '</b></p>' +
      '<p style="font-size:12px;color:#6b7c8f">AQUAELITE® · Soluciones en agua y seguridad para negocios</p>' +
      '</div>'
  });
  sheet.getRange(row.rowNumber, 19).setValue(new Date());
}

function dailyExpiryCheck() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) return;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 20).getValues();
  const now = new Date();
  for (let i = 0; i < values.length; i++) {
    const estado = String(values[i][5] || "").toUpperCase().trim();
    const expiry = asDate(values[i][15]);
    if (estado === "ACTIVO" && expiry && now.getTime() > expiry.getTime()) {
      const row = {rowNumber:i + 2, values:values[i]};
      sheet.getRange(i + 2, 20).setValue("VENCIDO");
      sendExpiryNoticeOnce(sheet, row);
    }
  }
}

function instalarControlVencimientos() {
  const handlers = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  if (handlers.indexOf("dailyExpiryCheck") === -1) {
    ScriptApp.newTrigger("dailyExpiryCheck").timeBased().everyDays(1).atHour(9).create();
  }
  return "Control diario de vencimientos instalado.";
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("No se encontró la pestaña: " + SHEET_NAME);
  return sheet;
}

function findByEmail(sheet, email) {
  if (sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 20).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1] || "").toLowerCase().trim() === email) return {rowNumber:i + 2, values:values[i]};
  }
  return null;
}

function refreshRow(row, sheet) {
  row.values = sheet.getRange(row.rowNumber, 1, 1, 20).getValues()[0];
  return row;
}

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

function asDate(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
function clean(value) { return String(value || "").trim(); }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function maskEmail(email) {
  const p = String(email).split("@");
  if (p.length !== 2) return email;
  const u = p[0];
  return (u.length <= 2 ? u[0] + "*" : u.slice(0,2) + "***" + u.slice(-1)) + "@" + p[1];
}
function jsonp(obj, callback) {
  const safe = /^[a-zA-Z0-9_.$]+$/.test(callback) ? callback : "aquaeliteCallback";
  return ContentService.createTextOutput(safe + "(" + JSON.stringify(obj) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
