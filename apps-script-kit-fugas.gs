const ADMIN_EMAIL = "aquaelitecapacitaciones@gmail.com";
const MASTER_SPREADSHEET_NAME = "Aquaelite PRO - Accesos A130";
const SHEET_NAME = "Kit de Fugas y Pruebas";
const TOOL_NAME = "KIT-FUGAS-Y-PRUEBAS";

function doGet(e) {
  try {
    const data = (e && e.parameter) ? e.parameter : {};
    const action = data.action || "status";
    const callback = data.callback || "aquaeliteCallback";
    let result;

    if (action === "check_whatsapp") result = checkWhatsapp(data);
    else if (action === "bind_account") result = bindAccount(data);
    else if (action === "register_access") result = registerAccess(data);
    else if (action === "check_access") result = checkAccess(data);
    else result = { ok: true, system: "Aquaelite - Kit de Fugas y Pruebas", message: "Control de accesos activo" };

    return jsonp(result, callback);
  } catch (err) {
    return jsonp({ ok: false, message: "Error interno.", error: String(err) }, (e && e.parameter && e.parameter.callback) || "aquaeliteCallback");
  }
}

function checkWhatsapp(data) {
  const whatsapp = normalizePhone(data.whatsapp);
  if (whatsapp.length < 9) return { ok: false, authorized: false, message: "Ingresa un WhatsApp válido." };

  const sheet = getSheet();
  const row = findByWhatsapp(sheet, whatsapp);
  if (!row) return { ok: false, authorized: false, message: "Este WhatsApp no tiene una compra habilitada. Comunícate con Aquaelite." };

  const v = row.values;
  const estado = String(v[5] || "PENDIENTE").toUpperCase().trim();
  const correo = String(v[1] || "").trim().toLowerCase();

  if (estado === "REVOCADO") return { ok: false, authorized: false, revoked: true, message: "Este acceso fue revocado. Comunícate con Aquaelite." };
  if (correo) return { ok: false, authorized: false, alreadyActivated: true, message: "Este WhatsApp ya fue activado. Inicia sesión con el correo registrado o recupera tu contraseña." };

  return { ok: true, authorized: true, nombre: String(v[0] || "") };
}

function bindAccount(data) {
  const nombre = clean(data.nombre);
  const correo = clean(data.correo).toLowerCase();
  const whatsapp = normalizePhone(data.whatsapp);

  if (!nombre || !validEmail(correo) || whatsapp.length < 9) return { ok: false, message: "Datos de activación incompletos." };

  const sheet = getSheet();
  const row = findByWhatsapp(sheet, whatsapp);
  if (!row) return { ok: false, message: "Este WhatsApp no tiene una compra habilitada." };

  const v = row.values;
  const estado = String(v[5] || "PENDIENTE").toUpperCase().trim();
  const correoActual = String(v[1] || "").trim().toLowerCase();

  if (estado === "REVOCADO") return { ok: false, revoked: true, message: "Este acceso fue revocado." };
  if (correoActual && correoActual !== correo) return { ok: false, message: "Este WhatsApp ya está asociado a otra cuenta. Comunícate con Aquaelite." };

  const now = new Date();
  sheet.getRange(row.rowNumber, 1).setValue(nombre);
  sheet.getRange(row.rowNumber, 2).setValue(correo);
  sheet.getRange(row.rowNumber, 3).setValue(whatsapp);
  if (!v[3]) sheet.getRange(row.rowNumber, 4).setValue(now);
  sheet.getRange(row.rowNumber, 6).setValue("ACTIVO");
  if (!v[8]) sheet.getRange(row.rowNumber, 9).setValue(now);
  sheet.getRange(row.rowNumber, 10).setValue(now);
  sheet.getRange(row.rowNumber, 11).setValue(Math.max(1, Number(v[10] || 0)));
  sheet.getRange(row.rowNumber, 14).setValue(TOOL_NAME);

  try {
    MailApp.sendEmail(ADMIN_EMAIL, "Activación Kit de Fugas | " + nombre,
      "Nombre: " + nombre + "\nCorreo: " + correo + "\nWhatsApp: " + whatsapp + "\nFecha: " + formatDate(now));
  } catch (e) {}

  return { ok: true, estado: "ACTIVO", nombre, correo, whatsapp };
}

function registerAccess(data) {
  const correo = clean(data.correo).toLowerCase();
  if (!validEmail(correo)) return { ok: false, message: "Correo no válido." };

  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return { ok: false, notRegistered: true, message: "Esta cuenta no está vinculada a una compra habilitada." };

  const v = row.values;
  const estado = String(v[5] || "").toUpperCase().trim();
  if (estado === "REVOCADO") return { ok: false, revoked: true, message: "Este acceso fue revocado." };
  if (estado !== "ACTIVO") return { ok: false, message: "Este acceso todavía no está activo." };

  const now = new Date();
  if (!v[8]) sheet.getRange(row.rowNumber, 9).setValue(now);
  sheet.getRange(row.rowNumber, 10).setValue(now);
  const accesses = Number(v[10] || 0) + 1;
  sheet.getRange(row.rowNumber, 11).setValue(accesses);
  sheet.getRange(row.rowNumber, 14).setValue(TOOL_NAME);

  return { ok: true, estado: "ACTIVO", nombre: v[0], correo, accesos };
}

function checkAccess(data) {
  const correo = clean(data.correo).toLowerCase();
  if (!validEmail(correo)) return { ok: false, message: "Correo no válido." };

  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return { ok: false, notRegistered: true, message: "Usuario no registrado." };

  const v = row.values;
  const estado = String(v[5] || "").toUpperCase().trim();
  if (estado === "REVOCADO") return { ok: false, revoked: true, message: "Acceso revocado." };
  if (estado !== "ACTIVO") return { ok: false, message: "Acceso no habilitado." };

  sheet.getRange(row.rowNumber, 10).setValue(new Date());
  return { ok: true, estado: "ACTIVO", nombre: v[0], correo };
}

function getSheet() {
  const files = DriveApp.getFilesByName(MASTER_SPREADSHEET_NAME);
  let ss = null;
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      ss = SpreadsheetApp.openById(file.getId());
      break;
    }
  }
  if (!ss) throw new Error("No se encontró el Google Sheet maestro: " + MASTER_SPREADSHEET_NAME);

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Nombre","Correo","WhatsApp","Fecha registro","Código","Estado","Código enviado","Código vence","Primer acceso","Último acceso","N.º accesos","Token sesión","Sesión vence","Herramienta"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findByWhatsapp(sheet, phone) {
  if (sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
  for (let i = 0; i < values.length; i++) {
    if (normalizePhone(values[i][2]) === phone) return { rowNumber: i + 2, values: values[i] };
  }
  return null;
}

function findByEmail(sheet, email) {
  if (sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1] || "").toLowerCase().trim() === email) return { rowNumber: i + 2, values: values[i] };
  }
  return null;
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
}
function clean(value) { return String(value || "").trim(); }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function formatDate(date) { return Utilities.formatDate(new Date(date), "America/Lima", "dd/MM/yyyy HH:mm:ss"); }
function jsonp(obj, callback) {
  const safe = /^[a-zA-Z0-9_.$]+$/.test(callback) ? callback : "aquaeliteCallback";
  return ContentService.createTextOutput(safe + "(" + JSON.stringify(obj) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}
