const SPREADSHEET_ID = "1n-HDB2oNl9PU3vJYM_TSyCuyHLOERvC-hTqWirUXX_I";
const SHEET_NAME = "Kit de Fugas y Pruebas";
const TOOL_NAME = "KIT-FUGAS-Y-PRUEBAS";
const CODE_MINUTES = 15;
const SESSION_HOURS = 48;

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

  const v = row.values;
  const estado = String(v[5] || "").toUpperCase().trim();
  if (estado === "REVOCADO") return {ok:false, revoked:true, message:"Tu acceso fue revocado. Comunícate con Aquaelite."};
  if (estado !== "ACTIVO") return {ok:false, pending:true, message:"Tu acceso todavía no está habilitado. Comunícate con Aquaelite."};

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();
  const expires = new Date(now.getTime() + CODE_MINUTES * 60 * 1000);

  sheet.getRange(row.rowNumber, 5).setValue(code);              // E Código
  sheet.getRange(row.rowNumber, 7).setValue(now);               // G Código enviado
  sheet.getRange(row.rowNumber, 8).setValue(expires);           // H Código vence
  sheet.getRange(row.rowNumber, 14).setValue(TOOL_NAME);        // N Herramienta

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

  return {ok:true, maskedEmail:maskEmail(correo), expiresAt:expires.getTime(), message:"Código enviado."};
}

function verifyCode(data) {
  const correo = clean(data.correo).toLowerCase();
  const codigo = clean(data.codigo);
  if (!validEmail(correo) || !/^\d{6}$/.test(codigo)) return {ok:false, message:"Correo o código no válido."};

  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return {ok:false, notRegistered:true, message:"Usuario no registrado."};

  const v = row.values;
  const estado = String(v[5] || "").toUpperCase().trim();
  if (estado === "REVOCADO") return {ok:false, revoked:true, message:"Tu acceso fue revocado."};
  if (estado !== "ACTIVO") return {ok:false, pending:true, message:"Tu acceso no está habilitado."};

  const storedCode = String(v[4] || "").trim();
  const codeExpires = asDate(v[7]);
  const now = new Date();
  if (!storedCode || storedCode !== codigo) return {ok:false, message:"El código ingresado no es correcto."};
  if (!codeExpires || now.getTime() > codeExpires.getTime()) return {ok:false, expired:true, message:"El código venció. Solicita uno nuevo."};

  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  const sessionExpires = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  const accesses = Number(v[10] || 0) + 1;

  sheet.getRange(row.rowNumber, 5).clearContent();               // E limpiar código
  if (!v[8]) sheet.getRange(row.rowNumber, 9).setValue(now);     // I primer acceso
  sheet.getRange(row.rowNumber, 10).setValue(now);               // J último acceso
  sheet.getRange(row.rowNumber, 11).setValue(accesses);          // K accesos
  sheet.getRange(row.rowNumber, 12).setValue(token);             // L token
  sheet.getRange(row.rowNumber, 13).setValue(sessionExpires);    // M sesión vence
  sheet.getRange(row.rowNumber, 14).setValue(TOOL_NAME);         // N herramienta

  return {
    ok:true,
    estado:"ACTIVO",
    nombre:String(v[0] || "").trim(),
    correo:correo,
    token:token,
    expiresAt:sessionExpires.getTime(),
    accesos:accesses
  };
}

function checkSession(data) {
  const correo = clean(data.correo).toLowerCase();
  const token = clean(data.token);
  if (!validEmail(correo) || !token) return {ok:false, message:"Sesión no válida."};

  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return {ok:false, notRegistered:true, message:"Usuario no registrado."};

  const v = row.values;
  const estado = String(v[5] || "").toUpperCase().trim();
  if (estado === "REVOCADO") return {ok:false, revoked:true, message:"Tu acceso fue revocado."};
  if (estado !== "ACTIVO") return {ok:false, pending:true, message:"Tu acceso no está habilitado."};

  const storedToken = String(v[11] || "").trim();
  const sessionExpires = asDate(v[12]);
  const now = new Date();
  if (!storedToken || storedToken !== token) return {ok:false, message:"La sesión no es válida."};
  if (!sessionExpires || now.getTime() > sessionExpires.getTime()) return {ok:false, expired:true, message:"Tu sesión venció. Solicita un nuevo código."};

  sheet.getRange(row.rowNumber, 10).setValue(now);
  return {ok:true, estado:"ACTIVO", nombre:String(v[0] || "").trim(), correo:correo, expiresAt:sessionExpires.getTime()};
}

function checkAccess(data) {
  const correo = clean(data.correo).toLowerCase();
  if (!validEmail(correo)) return {ok:false, message:"Correo no válido."};
  const row = findByEmail(getSheet(), correo);
  if (!row) return {ok:false, notRegistered:true, message:"Usuario no registrado."};
  const estado = String(row.values[5] || "").toUpperCase().trim();
  if (estado === "REVOCADO") return {ok:false, revoked:true, estado:"REVOCADO", message:"Acceso revocado."};
  if (estado !== "ACTIVO") return {ok:false, pending:true, estado:estado || "PENDIENTE", message:"Acceso no habilitado."};
  return {ok:true, estado:"ACTIVO", nombre:String(row.values[0] || "").trim(), correo:correo};
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("No se encontró la pestaña: " + SHEET_NAME);
  return sheet;
}

function findByEmail(sheet, email) {
  if (sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1] || "").toLowerCase().trim() === email) return {rowNumber:i + 2, values:values[i]};
  }
  return null;
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
